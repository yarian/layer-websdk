/**
 * For purposes of API consistency across SDKs, this class is not exposed.
 * Instead, customers will see only the layer.Message class.
 *
 * @class layer.Message.ChannelMessage
 * @extends layer.Message
 */
const Root = require('../root');
const Message = require('./message');
const ClientRegistry = require('../client-registry');
const LayerError = require('../layer-error');
const Constants = require('../const');
const logger = require('../logger');

class ChannelMessage extends Message {
  constructor(options) {
    if (options.channel) options.conversationId = options.channel.id;
    super(options);

    const client = this.getClient();
    this.isInitializing = false;
    if (options && options.fromServer) {
      client._addMessage(this);
    }
  }

  /**
   * Get the layer.Channel associated with this layer.Message.ChannelMessage.
   *
   * @method getConversation
   * @param {Boolean} load       Pass in true if the layer.Channel should be loaded if not found locally
   * @return {layer.Channel}
   */
  getConversation(load) {
    if (this.conversationId) {
      return ClientRegistry.get(this.clientId).getChannel(this.conversationId, load);
    }
    return null;
  }

  /**
   * Send a Read or Delivery Receipt to the server; not supported yet.
   *
   * @method sendReceipt
   * @param {string} [type=layer.Constants.RECEIPT_STATE.READ] - One of layer.Constants.RECEIPT_STATE.READ or layer.Constants.RECEIPT_STATE.DELIVERY
   * @return {layer.Message.ChannelMessage} this
   */
  sendReceipt(type = Constants.RECEIPT_STATE.READ) {
    logger.warn('Channel: Receipts not supported for Channel Messages yet');
    return this;
  }

  /**
   * Delete the Message from the server.
   *
   * ```
   * message.delete();
   * ```
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
    }, (result) => {
      if (!result.success && (!result.data || (result.data.id !== 'not_found' && result.data.id !== 'authentication_required'))) {
        Message.load(id, client);
      }
    });

    this._deleted();
    this.destroy();
  }

  /**
   * On loading this one item from the server, after _populateFromServer has been called, due final setup.
   *
   * @method _loaded
   * @private
   * @param {Object} data  Data from server
   */
  _loaded(data) {
    this.conversationId = data.channel.id;
    this.getClient()._addMessage(this);
  }


  /**
   * Creates a message from the server's representation of a message.
   *
   * Similar to _populateFromServer, however, this method takes a
   * message description and returns a new message instance using _populateFromServer
   * to setup the values.
   *
   * @method _createFromServer
   * @protected
   * @static
   * @param  {Object} message - Server's representation of the message
   * @param  {layer.Client} client
   * @return {layer.Message.ChannelMessage}
   */
  static _createFromServer(message, client) {
    const fromWebsocket = message.fromWebsocket;
    let conversationId;
    if (message.channel) {
      conversationId = message.channel.id;
    } else {
      conversationId = message.conversationId;
    }

    return new ChannelMessage({
      conversationId,
      fromServer: message,
      clientId: client.appId,
      _fromDB: message._fromDB,
      _notify: fromWebsocket && message.is_unread && message.sender.user_id !== client.user.userId,
    });
  }
}

/*
 * True if this Message has been read by this user.
 *
 * You can change isRead programatically
 *
 *      m.isRead = true;
 *
 * This will automatically notify the server that the message was read by your user.
 * @type {Boolean}
 */
ChannelMessage.prototype.isRead = false;

ChannelMessage.inObjectIgnore = Message.inObjectIgnore;
ChannelMessage._supportedEvents = [].concat(Message._supportedEvents);
Root.initClass.apply(ChannelMessage, [ChannelMessage, 'ChannelMessage']);
module.exports = ChannelMessage;
