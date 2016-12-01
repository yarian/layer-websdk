/*
 * TODO:
 * 1. Websocket events need to create/modify the proper object (channel vs conversation)
 * 6. Tests on MessageQuery that handle channel and conversations
 * 7. DbManager and Channels
 */

/**
 * A Channel object represents a dialog amongst a large set
 * of participants.
 *
 * Currently Channels must be created via Layer's Server API.
 *
 * Key methods, events and properties for getting started:
 *
 * Properties:
 *
 * * layer.Channel.id: this property is worth being familiar with; it identifies the
 *   Channel and can be used in `client.getChannel(id)` to retrieve it.
 * * layer.Channel.name: this property names the channel; this may be human readable, though for localization purposes,
 *   you may instead want to use a common name that is distinct from your displayed name.  There can only be a single
 *   channel with a given name per app.
 * * layer.Channel.membership: Contains status information about your user's role in this Channel.
 * * layer.Channel.isCurrentParticipant: Shorthand for determining if your user is a member of the Channel.
 *
 * Methods:
 *
 * * layer.Channel.join() to join the Channel
 * * layer.Channel.leave() to leave the Channel
 * * layer.Channel.on() and layer.Channel.off(): event listeners built on top of the `backbone-events-standalone` npm project
 * * layer.Channel.createMessage() to send a message on the Channel.
 *
 * Events:
 *
 * * `channels:change`: Useful for observing changes to Channel name
 *   and updating rendering of your Channel
 *
 * Finally, to access a list of Messages in a Channel, see layer.Query.
 *
 * @class  layer.Channel
 * @extends layer.Container
 * @author  Michael Kantor
 */

const Root = require('../root');
const Syncable = require('../syncable');
const Container = require('./container');
const LayerError = require('../layer-error');
const LayerEvent = require('../layer-event');
const Util = require('../client-utils');
const Constants = require('../const');

class Channel extends Container {
  constructor(options = {}) {
    // Setup default values
    if (!options.membership) options.membership = {};
    super(options);
    this._register();
  }

  /**
   * Destroy the local copy of this Channel, cleaning up all resources
   * it consumes.
   *
   * @method destroy
   */
  destroy() {
    this.lastMessage = null;
    if (this.clientId) this.getClient()._removeChannel(this);
    super.destroy();
    this.membership = null;
  }


  /**
   * Create this Conversation on the server.
   *
   * Called my layer.Message.send to insure its Conversation exists
   * on the server.  Return `this` until we support client side creation.
   *
   * @method send
   * @param {layer.Message} [message] Tells the Conversation what its last_message will be
   * @return {layer.Conversation} this
   */
  send(message) {
    return this;
  }

  _populateFromServer(channel) {
    // Disable events if creating a new Conversation
    // We still want property change events for anything that DOES change
    this._disableEvents = (this.syncState === Constants.SYNC_STATE.NEW);

    this.isCurrentParticipant = channel.membership.is_member;
    this.membership = {
      isMember: channel.is_member,
      role: channel.role,
    };
    super._populateFromServer(channel);
    this._register();

    this._disableEvents = false;
  }

  /**
   * Add the following members to the Channel.
   *
   * Not yet supported.
   *
   * @method addMembers
   * @param {String[]} members   Identity IDs of users to add to this Channel
   */
  addMembers(members) {

  }

  /**
   * Remove the following members from the Channel.
   *
   * Not yet supported.
   *
   * @method removeMembers
   * @param {String[]} members   Identity IDs of users to remove from this Channel
   */
  removeMembers(members) {

  }

  /**
   * Add the current user to this channel.
   *
   * @method join
   */
  join() {
    this.addMembers([this.getClient().user.id]);
  }

  /**
   * remove the current user from this channel.
   *
   * @method leave
   */
  leave() {
    this.removeMembers([this.getClient().user.id]);
  }

  /**
   * Delete the channel; not currently supported.
   *
   * @method delete
   */
  delete() {
    throw new Error('Deletion is not yet supported');
  }

  /**
   * Register this Channel with the Client
   *
   * @method _register
   * @private
   */
  _register() {
    const client = this.getClient();
    if (client) client._addChannel(this);
  }

  /**
   * Returns a plain object.
   *
   * Object will have all the same public properties as this
   * Conversation instance.  New object is returned any time
   * any of this object's properties change.
   *
   * @method toObject
   * @return {Object} POJO version of this.
   */
  toObject() {
    if (!this._toObject) {
      this._toObject = super.toObject();
      this._toObject.membership = Util.clone(this.membership);
    }
    return this._toObject;
  }

  /**
   * Create a channel instance from a server representation of the channel.
   *
   * If the Channel already exists, will update the existing copy with
   * presumably newer values.
   *
   * @method _createFromServer
   * @protected
   * @static
   * @param  {Object} channel - Server representation of a Channel
   * @param  {layer.Client} client
   * @return {layer.Channel}
   */
  static _createFromServer(channel, client) {
    return new Channel({
      client,
      fromServer: channel,
      _fromDB: channel._fromDB,
    });
  }

  /**
   * Find or create a new Channel.
   *
   *      var channel = layer.Channel.create({
   *          members: ['a', 'b'],
   *          private: true,
   *          metadata: {
   *              titleDetails: 'I am not a detail!'
   *          },
   *          client: client,
   *          'channels:loaded': function(evt) {
   *
   *          }
   *      });
   *
   * Recommend using `client.createChannel({...})`
   * instead of `Channel.create({...})`.
   *
   * @method create
   * @static
   * @protected
   * @param  {Object} options
   * @param  {layer.Client} options.client
   * @param  {string[]/layer.Identity[]} options.members - Array of Participant IDs or layer.Identity objects to create a channel with.
   * @param {boolean} [options.private=false] - Create a private channel
   * @param {Object} [options.metadata={}] - Initial metadata for Channel
   * @return {layer.Channel}
   */
  static create(options) {
    if (!options.client) throw new Error(LayerError.dictionary.clientMissing);
    if (!options.name) options.name = 'channel-' + String(Math.random()).replace(/\./, '');
    const newOptions = {
      name: options.name,
      private: options.private,
      members: options.client._fixIdentities(options.members),
      metadata: options.metadata,
      client: options.client,
    };

    const channel = options.client.findCachedChannel(aChannel => aChannel.name === newOptions.name);

    if (channel) {
      channel._sendDistinctEvent = new LayerEvent({
        target: channel,
        result: !options.metadata || Util.doesObjectMatch(options.metadata, channel.metadata) ?
          Channel.FOUND : Channel.FOUND_WITHOUT_REQUESTED_METADATA,
      }, 'channels:sent');
    }

    return channel || new Channel(newOptions);
  }
}

/**
 * The Channel's name; this must be unique.
 *
 * Note that while you can use a displayable human readable name, you may also choose to use this
 * as an ID that you can easily localize to different languages.
 *
 * Must not be a UUID.
 *
 * @property {String} name
 */
Channel.prototype.name = '';

/**
 * The `membership` object contains details of this user's membership within this channel.
 *
 * NOTE: Initially, only `isMember` will be available.
 *
 * ```
 * {
 *     "isMember": true,
 *     "role": "user",
 *     "lastUnreadMessageId: "layer:///messages/UUID"
 * }
 * ```
 * @property {Object}
 */
Channel.prototype.membership = null;

Channel.eventPrefix = 'channels';

/**
 * Prefix to use when generating an ID for instances of this class
 * @type {String}
 * @static
 * @private
 */
Channel.prefixUUID = 'layer:///channels/';

Channel._supportedEvents = [

  /**
   * The conversation is now on the server.
   *
   * Called after successfully creating the conversation
   * on the server.  The Result property is one of:
   *
   * * Channel.CREATED: A new Channel has been created
   * * Channel.FOUND: A matching named Channel has been found
   *
   * @event
   * @param {layer.LayerEvent} event
   * @param {string} event.result
   */
  'channels:sent',

  /**
   * An attempt to send this channel to the server has failed.
   * @event
   * @param {layer.LayerEvent} event
   * @param {layer.LayerError} event.error
   */
  'channels:sent-error',

  /**
   * The conversation is now loaded from the server.
   *
   * Note that this is only used in response to the layer.Channel.load() method.
   * from the server.
   * @event
   * @param {layer.LayerEvent} event
   */
  'channels:loaded',

  /**
   * An attempt to load this conversation from the server has failed.
   *
   * Note that this is only used in response to the layer.Channel.load() method.
   * @event
   * @param {layer.LayerEvent} event
   * @param {layer.LayerError} event.error
   */
  'channels:loaded-error',

  /**
   * The conversation has been deleted from the server.
   *
   * Caused by either a successful call to delete() on this instance
   * or by a remote user.
   * @event
   * @param {layer.LayerEvent} event
   */
  'channels:delete',

  /**
   * This channel has changed.
   *
   * @event
   * @param {layer.LayerEvent} event
   * @param {Object[]} event.changes - Array of changes reported by this event
   * @param {Mixed} event.changes.newValue
   * @param {Mixed} event.changes.oldValue
   * @param {string} event.changes.property - Name of the property that changed
   * @param {layer.Conversation} event.target
   */
  'channels:change'].concat(Syncable._supportedEvents);


Root.initClass.apply(Channel, [Channel, 'Channel']);
Syncable.subclasses.push(Channel);
module.exports = Channel;
