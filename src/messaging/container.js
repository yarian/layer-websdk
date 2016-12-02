/**
 * A Container is a parent class representing a container that manages a set of Messages.
 *
 * @class  layer.Container
 * @abstract
 * @extends layer.Syncable
 * @author  Michael Kantor
 */

const Syncable = require('../syncable');
const Message = require('./message');
const LayerError = require('../layer-error');
const Util = require('../client-utils');
const Constants = require('../const');
const Root = require('../root');
const LayerEvent = require('../layer-event');

class Container extends Syncable {

  /**
   * Create a new conversation.
   *
   * The static `layer.Conversation.create()` method
   * will correctly lookup distinct Conversations and
   * return them; `new layer.Conversation()` will not.
   *
   * Developers should use `layer.Conversation.create()`.
   *
   * @method constructor
   * @protected
   * @param  {Object} options
   * @param {string[]/layer.Identity[]} options.participants - Array of Participant IDs or layer.Identity instances
   * @param {boolean} [options.distinct=true] - Is the conversation distinct
   * @param {Object} [options.metadata] - An object containing Conversation Metadata.
   * @return {layer.Conversation}
   */
  constructor(options = {}) {
    // Make sure the ID from handle fromServer parameter is used by the Root.constructor
    if (options.fromServer) options.id = options.fromServer.id;

    // Make sure we have an clientId property
    if (options.client) options.clientId = options.client.appId;

    super(options);
    this.isInitializing = true;

    // If the options contains a full server definition of the object,
    // copy it in with _populateFromServer; this will add the Conversation
    // to the Client as well.
    if (options && options.fromServer) {
      this._populateFromServer(options.fromServer);
    }

    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    this.isInitializing = false;
  }





  /**
   * Populates this instance using server-data.
   *
   * Side effects add this to the Client.
   *
   * @method _populateFromServer
   * @private
   * @param  {Object} container - Server representation of the container
   */
  _populateFromServer(container) {
    const client = this.getClient();


    this._setSynced();

    const id = this.id;
    this.id = container.id;

    // IDs change if the server returns a matching Container
    if (id !== this.id) {
      client._updateContainerId(this, id);
      this._triggerAsync(`${this.constructor.eventPrefix}:change`, {
        oldValue: id,
        newValue: this.id,
        property: 'id',
      });
    }

    this.url = container.url;
    this.createdAt = new Date(container.created_at);
  }


  /**
   * Delete the Conversation from the server (internal version).
   *
   * This version of Delete takes a Query String that is packaged up by
   * layer.Conversation.delete and layer.Conversation.leave.
   *
   * @method _delete
   * @private
   * @param {string} queryStr - Query string for the DELETE request
   */
  _delete(queryStr) {
    const id = this.id;
    const client = this.getClient();
    this._xhr({
      method: 'DELETE',
      url: '?' + queryStr,
    }, result => this._deleteResult(result, id));

    this._deleted();
    this.destroy();
  }

  _handleWebsocketDelete(data) {
    if (data.mode === Constants.DELETION_MODE.MY_DEVICES && data.from_position) {
      this.getClient()._purgeMessagesByPosition(this.id, data.from_position);
    } else {
      super._handleWebsocketDelete();
    }
  }

  /**
   * Create a new layer.Message instance within this conversation
   *
   *      var message = conversation.createMessage('hello');
   *
   *      var message = conversation.createMessage({
   *          parts: [new layer.MessagePart({
   *                      body: 'hello',
   *                      mimeType: 'text/plain'
   *                  })]
   *      });
   *
   * See layer.Message for more options for creating the message.
   *
   * @method createMessage
   * @param  {String|Object} options - If its a string, a MessagePart is created around that string.
   * @param {layer.MessagePart[]} options.parts - An array of MessageParts.  There is some tolerance for
   *                                               it not being an array, or for it being a string to be turned
   *                                               into a MessagePart.
   * @return {layer.Message}
   */
  createMessage(options = {}) {
    const messageConfig = (typeof options === 'string') ? {
      parts: [{ body: options, mimeType: 'text/plain' }],
    } : options;
    messageConfig.clientId = this.clientId;
    messageConfig.parentId = this.id;

    return new Message(messageConfig);
  }


  _getUrl(url) {
    return this.url + (url || '');
  }

  _loaded(data) {
    this._register(this);
  }

  /**
   * Standard `on()` provided by layer.Root.
   *
   * Adds some special handling of 'conversations:loaded' so that calls such as
   *
   *      var c = client.getConversation('layer:///conversations/123', true)
   *      .on('conversations:loaded', function() {
   *          myrerender(c);
   *      });
   *      myrender(c); // render a placeholder for c until the details of c have loaded
   *
   * can fire their callback regardless of whether the client loads or has
   * already loaded the Conversation.
   *
   * @method on
   * @param  {string} eventName
   * @param  {Function} callback
   * @param  {Object} context
   * @return {layer.Conversation} this
   */
  on(name, callback, context) {
    const evtName = `${this.constructor.eventPrefix}:loaded`;
    const hasLoadedEvt = name ===  evtName ||
      name && typeof name === 'object' && name[evtName];

    if (hasLoadedEvt && !this.isLoading) {
      const callNow = name === evtName ? callback : name[evtName];
      Util.defer(() => callNow.apply(context));
    }
    super.on(name, callback, context);

    return this;
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
   * __ Methods are automatically called by property setters.
   *
   * Any change in the metadata property will call this method and fire a
   * change event.  Changes to the metadata object that don't replace the object
   * with a new object will require directly calling this method.
   *
   * @method __updateMetadata
   * @private
   * @param  {Object} newValue
   * @param  {Object} oldValue
   */
  __updateMetadata(newValue, oldValue, paths) {
    if (this._inLayerParser) return;
    if (JSON.stringify(newValue) !== JSON.stringify(oldValue)) {
      this._triggerAsync('conversations:change', {
        property: 'metadata',
        newValue,
        oldValue,
        paths,
      });
    }
  }

  /**
   * Identifies whether a Conversation receiving the specified patch data should be loaded from the server.
   *
   * Any change to a Conversation indicates that the Conversation is active and of potential interest; go ahead and load that
   * Conversation in case the app has need of it.  In the future we may ignore changes to unread count.  Only relevant
   * when we get Websocket events for a Conversation that has not been loaded/cached on Client.
   *
   * @method _loadResourceForPatch
   * @static
   * @private
   */
  static _loadResourceForPatch(patchData) {
    return true;
  }
}

/**
 * Time that the conversation was created on the server.
 *
 * @type {Date}
 */
Container.prototype.createdAt = null;

/**
 * Metadata for the conversation.
 *
 * Metadata values can be plain objects and strings, but
 * no arrays, numbers, booleans or dates.
 * @type {Object}
 */
Container.prototype.metadata = null;


/**
 * The authenticated user is a current participant in this Conversation.
 *
 * Set to false if the authenticated user has been removed from this conversation.
 *
 * A removed user can see messages up to the time they were removed,
 * but can no longer interact with the conversation.
 *
 * A removed user can no longer see the participant list.
 *
 * Read and Delivery receipts will fail on any Message in such a Conversation.
 *
 * @type {Boolean}
 */
Container.prototype.isCurrentParticipant = true;


/**
 * Caches last result of toObject()
 * @type {Object}
 * @private
 */
Container.prototype._toObject = null;



/**
 * Property to look for when bubbling up events.
 * @type {String}
 * @static
 * @private
 */
Container.bubbleEventParent = 'getClient';

/**
 * The Conversation that was requested has been created.
 *
 * Used in `conversations:sent` events.
 * @type {String}
 * @static
 */
Container.CREATED = 'Created';

/**
 * The Conversation that was requested has been found.
 *
 * This means that it did not need to be created.
 *
 * Used in `conversations:sent` events.
 * @type {String}
 * @static
 */
Container.FOUND = 'Found';

/**
 * The Conversation that was requested has been found, but there was a mismatch in metadata.
 *
 * If the createConversation request contained metadata and it did not match the Distinct Conversation
 * that matched the requested participants, then this value is passed to notify your app that the Conversation
 * was returned but does not exactly match your request.
 *
 * Used in `conversations:sent` events.
 * @type {String}
 * @static
 */
Container.FOUND_WITHOUT_REQUESTED_METADATA = 'FoundMismatch';

Root.initClass.apply(Container, [Container, 'Container']);
Syncable.subclasses.push(Container);
module.exports = Container;
