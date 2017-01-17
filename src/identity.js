/**
 * The Identity class represents an Identity of a user of your application.
 *
 * Identities are created by the System, never directly by apps.
 *
 * @class layer.Identity
 * @extends layer.Syncable
 */

/*
 * How Identities fit into the system:
 *
 * 1. As part of initialization, load the authenticated user's full Identity record so that the Client knows more than just the `userId` of its user.
 *    client.user = <Identity>
 * 2. Any time we get a Basic Identity via `message.sender` or Conversations, see if we have an Identity for that sender,
 *    and if not create one using the Basic Identity.  There should never be a duplicate Identity.
 * 3. Websocket CHANGE events will update Identity objects, as well as add new Full Identities, and downgrade Full Identities to Basic Identities.
 * 4. The Query API supports querying and paging through Identities
 * 5. The Query API loads Full Identities; these results will update the client._identitiesHash;
 *    upgrading Basic Identities if they match, and adding new Identities if they don't.
 * 6. DbManager will persist only UserIdentities, and only those that are Full Identities.  Basic Identities will be written
 *    to the Messages and Conversations tables anyways as part of those larger objects.
 * 7. API For explicit follows/unfollows
 */

const Syncable = require('./syncable');
const Root = require('./root');
const Constants = require('./const');
const LayerError = require('./layer-error');

class Identity extends Syncable {
  constructor(options = {}) {
    // Make sure the ID from handle fromServer parameter is used by the Root.constructor
    if (options.fromServer) {
      options.id = options.fromServer.id || '-';
    } else if (!options.id && options.userId) {
      options.id = Identity.prefixUUID + encodeURIComponent(options.userId);
    } else if (options.id && !options.userId) {
      options.userId = options.id.substring(Identity.prefixUUID.length);
    }

    // Make sure we have an clientId property
    if (options.client) options.clientId = options.client.appId;
    if (!options.clientId) throw new Error(LayerError.dictionary.clientMissing);

    super(options);

    // The - is here to prevent Root from generating a UUID for an ID.  ID must map to UserID
    // and can't be randomly generated.  This only occurs from Platform API sending with `sender.name` and no identity.
    if (this.id === '-') this.id = '';

    this.isInitializing = true;

    // If the options contains a full server definition of the object,
    // copy it in with _populateFromServer; this will add the Identity
    // to the Client as well.
    if (options && options.fromServer) {
      this._populateFromServer(options.fromServer);
    }

    if (!this.url && this.id) {
      this.url = `${this.getClient().url}/${this.id.substring(9)}`;
    } else if (!this.url) {
      this.url = '';
    }
    this.getClient()._addIdentity(this);

    this.isInitializing = false;
  }

  destroy() {
    const client = this.getClient();
    if (client) client._removeIdentity(this);
    super.destroy();
  }

  _triggerAsync(evtName, args) {
    this._clearObject();
    super._triggerAsync(evtName, args);
  }

  trigger(evtName, args) {
    this._clearObject();
    super.trigger(evtName, args);
  }

  /**
   * Populates this instance using server-data.
   *
   * Side effects add this to the Client.
   *
   * @method _populateFromServer
   * @private
   * @param  {Object} identity - Server representation of the identity
   */
  _populateFromServer(identity) {
    const client = this.getClient();

    // Disable events if creating a new Identity
    // We still want property change events for anything that DOES change
    this._disableEvents = (this.syncState === Constants.SYNC_STATE.NEW);

    this._setSynced();

    this.userId = identity.user_id || '';

    this._updateValue('avatarUrl', identity.avatar_url);
    this._updateValue('displayName', identity.display_name);

    const isFullIdentity = 'metadata' in identity;

    // Handle Full Identity vs Basic Identity
    if (isFullIdentity) {
      this.url = identity.url;
      this.type = identity.type;

      this._updateValue('emailAddress', identity.email_address);
      this._updateValue('lastName', identity.last_name);
      this._updateValue('firstName', identity.first_name);
      this._updateValue('metadata', identity.metadata);
      this._updateValue('publicKey', identity.public_key);
      this._updateValue('phoneNumber', identity.phone_number);
      this.isFullIdentity = true;
    }

    if (!this.url && this.id) {
      this.url = this.getClient().url + this.id.substring(8);
    }

    this._disableEvents = false;

    // See if we have the Full Identity Object in database
    if (!this.isFullIdentity && client.isAuthenticated) {
      client.dbManager.getObjects('identities', [this.id], (result) => {
        if (result.length) this._populateFromServer(result[0]);
      });
    }
  }

  /**
   * Update the property; trigger a change event, IF the value has changed.
   *
   * @method _updateValue
   * @private
   * @param {string} key - Property name
   * @param {Mixed} value - Property value
   */
  _updateValue(key, value) {
    if (value === null || value === undefined) value = '';
    if (this[key] !== value) {
      if (!this.isInitializing) {
        this._triggerAsync('identities:change', {
          property: key,
          oldValue: this[key],
          newValue: value,
        });
      }
      this[key] = value;
    }
  }

  /**
   * Follow this User.
   *
   * Following a user grants access to their Full Identity,
   * as well as websocket events that update the Identity.
   * @method follow
   */
  follow() {
    if (this.isFullIdentity) return;
    this._xhr({
      method: 'PUT',
      url: this.url.replace(/identities/, 'following/users'),
      syncable: {},
    }, (result) => {
      if (result.success) this._load();
    });
  }

  /**
   * Unfollow this User.
   *
   * Unfollowing the user will reduce your access to only having their Basic Identity,
   * and this Basic Identity will only show up when a relevant Message or Conversation has been loaded.
   *
   * Websocket change notifications for this user will not arrive.
   *
   * @method unfollow
   */
  unfollow() {
    this._xhr({
      url: this.url.replace(/identities/, 'following/users'),
      method: 'DELETE',
      syncable: {},
    });
  }

 /**
 * Update the UserID.
 *
 * This will not only update the User ID, but also the ID,
 * URL, and reregister it with the Client.
 *
 * @method _setUserId
 * @private
 * @param {string} userId
 */
  _setUserId(userId) {
    const client = this.getClient();
    client._removeIdentity(this);
    this.__userId = userId;
    const encoded = encodeURIComponent(userId);
    this.id = Identity.prefixUUID + encoded;
    this.url = `${this.getClient().url}/identities/${encoded}`;
    client._addIdentity(this);
  }

  /**
  * __ Methods are automatically called by property setters.
  *
  * Any attempt to execute `this.userId = 'xxx'` will cause an error to be thrown.
  * These are not intended to be writable properties
  *
  * @private
  * @method __adjustUserId
  * @param {string} value - New appId value
  */
  __adjustUserId(userId) {
    if (this.__userId) {
      throw new Error(LayerError.dictionary.cantChangeUserId);
    }
  }

  /**
   * Handle a Websocket DELETE event received from the server.
   *
   * A DELETE event means we have unfollowed this user; and should downgrade to a Basic Identity.
   *
   * @method _handleWebsocketDelete
   * @protected
   * @param {Object} data - Deletion parameters; typically null in this case.
  */
  // Turn a Full Identity into a Basic Identity and delete the Full Identity from the database
  _handleWebsocketDelete(data) {
    this.getClient().dbManager.deleteObjects('identities', [this]);
    ['firstName', 'lastName', 'emailAddress', 'phoneNumber', 'metadata', 'publicKey', 'isFullIdentity', 'type']
      .forEach(key => delete this[key]);
    this._triggerAsync('identities:unfollow');
  }

  /**
   * Create a new Identity based on a Server description of the user.
   *
   * @method _createFromServer
   * @static
   * @param {Object} identity - Server Identity Object
   * @param {layer.Client} client
   * @returns {layer.Identity}
   */
  static _createFromServer(identity, client) {
    return new Identity({
      client,
      fromServer: identity,
      _fromDB: identity._fromDB,
    });
  }
}

/**
 * Display name for the User or System Identity.
 * @type {string}
 */
Identity.prototype.displayName = '';

/**
 * The Identity matching `layer.Client.user` will have this be true.
 *
 * All other Identities will have this as false.
 * @type {boolean}
 */
Identity.prototype.sessionOwner = false;

/**
 * ID of the Client this Identity is associated with.
 * @type {string}
 */
Identity.prototype.clientId = '';

/**
 * Is this a Full Identity or Basic Identity?
 *
 * Note that Service Identities are always considered to be Basic.
 * @type {boolean}
 */
Identity.prototype.isFullIdentity = false;



/**
 * Unique ID for this User.
 * @type {string}
 */
Identity.prototype.userId = '';

/**
 * Optional URL for the user's icon.
 * @type {string}
 */
Identity.prototype.avatarUrl = '';

/**
 * Optional first name for this user.
 *
 * Full Identities Only.
 *
 * @type {string}
 */
Identity.prototype.firstName = '';

/**
 * Optional last name for this user.
 *
 * Full Identities Only.
 *
 * @type {string}
 */
Identity.prototype.lastName = '';

/**
 * Optional email address for this user.
 *
 * Full Identities Only.
 *
 * @type {string}
 */
Identity.prototype.emailAddress = '';

/**
 * Optional phone number for this user.
 *
 * Full Identities Only.
 *
 * @type {string}
 */
Identity.prototype.phoneNumber = '';

/**
 * Optional metadata for this user.
 *
 * Full Identities Only.
 *
 * @type {Object}
 */
Identity.prototype.metadata = null;

/**
 * Optional public key for encrypting message text for this user.
 *
 * Full Identities Only.
 *
 * @type {string}
 */
Identity.prototype.publicKey = '';

/**
 * @static
 * @type {string} The Identity represents a user.  Value used in the layer.Identity.type field.
 */
Identity.UserType = 'user';

/**
 * @static
 * @type {string} The Identity represents a bot.  Value used in the layer.Identity.type field.
 */
Identity.BotType = 'bot';

/**
 * What type of Identity does this represent?
 *
 * * A bot? Use layer.Identity.BotType
 * * A User? Use layer.Identity.UserType
 * @type {string}
 */
Identity.prototype.type = Identity.UserType;

/**
 * Is this Identity a bot?
 *
 * If the layer.Identity.type field is equal to layer.Identity.BotType then this will return true.
 * @type {boolean}
 */
Object.defineProperty(Identity.prototype, 'isBot', {
  enumerable: true,
  get: function get() {
    return this.type === Identity.BotType;
  },
});

Identity.inObjectIgnore = Root.inObjectIgnore;

Identity.bubbleEventParent = 'getClient';

Identity._supportedEvents = [
  'identities:change',
  'identities:loaded',
  'identities:loaded-error',
  'identities:unfollow',
].concat(Syncable._supportedEvents);

Identity.eventPrefix = 'identities';
Identity.prefixUUID = 'layer:///identities/';
Identity.enableOpsIfNew = true;

Root.initClass.apply(Identity, [Identity, 'Identity']);
Syncable.subclasses.push(Identity);

module.exports = Identity;
