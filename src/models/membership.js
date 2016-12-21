/**
 * The Membership class represents an Membership of a user within a channel.
 *
 * Identities are created by the System, never directly by apps.
 *
 * @class layer.Membership
 * @extends layer.Syncable
 */

/*
 * How Identities fit into the system:
 *
 * 1. As part of initialization, load the authenticated user's full Membership record so that the Client knows more than just the `userId` of its user.
 *    client.user = <Membership>
 * 2. Any time we get a Basic Membership via `message.sender` or Conversations, see if we have an Membership for that sender,
 *    and if not create one using the Basic Membership.  There should never be a duplicate Membership.
 * 3. Websocket CHANGE events will update Membership objects, as well as add new Full Identities, and downgrade Full Identities to Basic Identities.
 * 4. The Query API supports querying and paging through Identities
 * 5. The Query API loads Full Identities; these results will update the client._identitiesHash;
 *    upgrading Basic Identities if they match, and adding new Identities if they don't.
 * 6. DbManager will persist only UserIdentities, and only those that are Full Identities.  Basic Identities will be written
 *    to the Messages and Conversations tables anyways as part of those larger objects.
 * 7. API For explicit follows/unfollows
 */

const Syncable = require('./syncable');
const Root = require('../root');
const Constants = require('../const');
const LayerError = require('../layer-error');

class Membership extends Syncable {
  constructor(options = {}) {
    // Make sure the ID from handle fromServer parameter is used by the Root.constructor
    if (options.fromServer) {
      options.id = options.fromServer.id;
    } else if (options.id && !options.userId) {
      options.userId = options.id.replace(/^.*\//, '');
    }

    // Make sure we have an clientId property
    if (options.client) options.clientId = options.client.appId;
    if (!options.clientId) throw new Error(LayerError.dictionary.clientMissing);

    super(options);

    this.isInitializing = true;

    // If the options contains a full server definition of the object,
    // copy it in with _populateFromServer; this will add the Membership
    // to the Client as well.
    if (options && options.fromServer) {
      this._populateFromServer(options.fromServer);
    }

    if (!this.url && this.id) {
      this.url = `${this.getClient().url}/${this.id.substring(9)}`;
    } else if (!this.url) {
      this.url = '';
    }
    this.getClient()._addMembership(this);

    this.isInitializing = false;
  }

  destroy() {
    const client = this.getClient();
    if (client) client._removeMembership(this);
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
   * @param  {Object} membership - Server representation of the membership
   */
  _populateFromServer(membership) {
    const client = this.getClient();

    // Disable events if creating a new Membership
    // We still want property change events for anything that DOES change
    this._disableEvents = (this.syncState === Constants.SYNC_STATE.NEW);

    this._setSynced();

    this.userId = membership.identity ? membership.identity.user_id || '' : client.user.userId;
    this.channelId = membership.channel.id;

    // this.role = client._createObject(membership.role);

    this.identity = membership.identity ? client._createObject(membership.identity) : client.user;

    if (!this.url && this.id) {
      this.url = this.getClient().url + this.id.substring(8);
    }

    this._disableEvents = false;
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
        this._triggerAsync('members:change', {
          property: key,
          oldValue: this[key],
          newValue: value,
        });
      }
      this[key] = value;
    }
  }

  __getUserId() {
    return this.identity ? this.identity.userId : '';
  }

  /**
   * Create a new Membership based on a Server description of the user.
   *
   * @method _createFromServer
   * @static
   * @param {Object} membership - Server Membership Object
   * @param {layer.Client} client
   * @returns {layer.Membership}
   */
  static _createFromServer(membership, client) {
    return new Membership({
      client,
      fromServer: membership,
      _fromDB: membership._fromDB,
    });
  }
}

/**
 * User ID that the Membership describes.
 *
 * @type {string}
 */
Membership.prototype.userId = '';

/**
 * Channel ID that the membership describes.
 *
 * @type {string}
 */
Membership.prototype.channelId = '';

/**
 * The user's role within the channel
 *
 * @ignore
 * @type {layer.Role}
 */
Membership.prototype.role = null;

/**
 * Identity associated with the membership
 *
 * @type {layer.Identity}
 */
Membership.prototype.identity = '';

Membership.inObjectIgnore = Root.inObjectIgnore;

Membership.bubbleEventParent = 'getClient';

Membership._supportedEvents = [
  'members:change',
  'members:loaded',
  'members:loaded-error',
].concat(Syncable._supportedEvents);

Membership.eventPrefix = 'members';
Membership.prefixUUID = '/members/';

Root.initClass.apply(Membership, [Membership, 'Membership']);
Syncable.subclasses.push(Membership);

module.exports = Membership;
