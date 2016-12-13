
/**
 * The Announcement class represents a type of Message sent by a server.
 *
 * Announcements can not be sent using the WebSDK, only received.
 *
 * You should never need to instantiate an Announcement; they should only be
 * delivered via `messages:add` events when an Announcement is provided via
 * websocket to the client, and `change` events on an Announcements Query.
 *
 * @class  layer.Announcement
 * @extends layer.Message
 */

const Message = require('./message');
const Syncable = require('./syncable');
const Root = require('../root');
const LayerError = require('../layer-error');


class Announcement extends Message {

  /**
   * @method send
   * @ignore
   */
  send() {}

  /**
   * @method getConversation
   * @ignore
   */
  getConversation() {}

  /**
   * @method getChannel
   * @ignore
   */
  getChannel() {}

  _loaded(data) {
    this.getClient()._addMessage(this);
  }

  /**
   * Delete the Announcement from the server.
   *
   * @method delete
   */
  delete() {
    if (this.isDestroyed) throw new Error(LayerError.dictionary.isDestroyed);

    const id = this.id;
    const client = this.getClient();
    this._xhr({
      url: '',
      method: 'DELETE',
    }, result => {
      if (!result.success && (!result.data || result.data.id !== 'not_found')) Syncable.load(id, client);
    });

    this._deleted();
    this.destroy();
  }

  /**
   * Creates an Announcement from the server's representation of an Announcement.
   *
   * Similar to _populateFromServer, however, this method takes a
   * message description and returns a new message instance using _populateFromServer
   * to setup the values.
   *
   * @method _createFromServer
   * @protected
   * @static
   * @param  {Object} message - Server's representation of the announcement
   * @return {layer.Announcement}
   */
  static _createFromServer(message, client) {
    const fromWebsocket = message.fromWebsocket;
    return new Announcement({
      fromServer: message,
      clientId: client.appId,
      _notify: fromWebsocket && message.is_unread,
    });
  }
}

/**
 * @property {String} conversationId
 * @hide
 */

/**
 * @property {String} channelId
 * @hide
 */

/**
 * @property {Object} deliveryStatus
 * @hide
 */

/**
 * @property {Object} readStatus
 * @hide
 */

/**
 * @property {Object} recipientStatus
 * @hide
 */

/**
 * @method getConversation
 * @hide
 */

/**
 * @method getChannel
 * @hide
 */

/**
 * @method getParent
 * @hide
 */

/**
 * @method addPart
 * @hide
 */

/**
 * @method send
 * @hide
 */

/**
 * @method isSaved
 * @hide
 */

/**
 * @method isSaving
 * @hide
 */

/**
 * Announcement parentId is hardcoded to `announcement`.
 *
 * @property {String} [parentId='announcement']
 * @readonly
 */
Announcement.prototype.parentId = 'announcement';

Announcement.prefixUUID = 'layer:///announcements/';

Announcement.inObjectIgnore = Message.inObjectIgnore;

Announcement.bubbleEventParent = 'getClient';

Announcement._supportedEvents = [].concat(Message._supportedEvents);

Root.initClass.apply(Announcement, [Announcement, 'Announcement']);
Syncable.subclasses.push(Announcement);
module.exports = Announcement;
