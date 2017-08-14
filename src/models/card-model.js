/**
 * Root class for all Card Models
 */
const Root = require('../root');
const Util = require('../client-utils');
const Message = require('../models/message');
const MessagePart = require('../models/message-part');


// FIXME: this doesn't really need to extend root probably
class CardModel extends Root {
  /**
   * Create a layer.Card.
   *
   * @method  constructor
   * @private
   * @return {layer.Card}
   */
  constructor(options = {}) {
    if (!options.action) options.action = {};

    // Card model UUID should always match the Message ID; there should never be more than one CardModel for a given Message
    super(options);
    //if (!this.constructor.isSupportedMessage(this.message)) throw new Error(LayerError.dictionary.unsupportedMessage);


    this.currentCardRenderer = this.constructor.cardRenderer;

    if (this.message) {
      this._setupMessage();
    } else {

    }
  }

  generateMessage(conversation, callback) {
    this._generateParts((parts) => {
      this.childParts = parts;
      this.part.mimeAttributes.role = 'root';
      this.message = conversation.createMessage({
        id: Message.prefixUUID + this.id.replace(/^.*cardmodels\//, ''),
        parts: this.childParts,
      });
      this._setupMessage(true);
      callback(this.message);
    });
  }

  _addModel(model, role, callback) {
    model._generateParts((moreParts) => {
      moreParts[0].mimeAttributes.role = role;
      moreParts[0].mimeAttributes['parent-node-id'] = this.nodeId;
      callback(moreParts);
    });
  }

  _setupMessage(doNotParse) {
    this.id = CardModel.prefixUUID + this.part.id.replace(/^.*messages\//, '');
    this.role = this.part.mimeAttributes.role;
    this.childParts = this.message.getPartsMatchingAttribute({
      'parent-node-id': this.nodeId,
    });

    // Call handlePartChanges any message edits that update a part.
    this.part.on('messageparts:change', this._handlePartChanges, this);
    this.childParts.forEach(part => part.on('messageparts:change', this._handlePartChanges, this));
    this.message.on('messages:part-added', this._handlePartAdded, this);

    this.message.on('destroy', this.destroy, this);
    this.message.getClient()._addCardModel(this);
    if (!doNotParse) this._parseMessage();
  }

  _initBodyWithMetadata(fields) {
    const body = { };
    fields.forEach((fieldName) => {
      body[Util.hyphenate(fieldName, '_')] = this[fieldName];
    });
    return body;
  }

  /**
   * This method parses the message property to extract the information managed by the model.
   *
   * @method
   */
  _parseMessage() {
    const responses = this.childParts.filter(part => part.mimeAttributes.role === 'response_summary')[0];
    if (responses) this.responses = responses;
  }

  _handlePartChanges(evt) {
    this._parseMessage();
    this._triggerAsync('change');
  }

  _handlePartAdded(evt) {
    const part = evt.part;
    if (part.mimeAttributes['parent-node-id'] === this.nodeId) {
      this.childParts.push(part);
      part.on('messageparts:change', this._handlePartChanges, this);
      this._parseMessage();
      this._triggerAsync('change');
    }
  }

  getChildPartById(id) {
    return this.childParts.filter(part => part.mimeAttributes['node-id'] === id)[0];
  }

  getChildModelById(id) {
    const childPart = this.getChildPartById(id);
    if (childPart) {
      return this.getClient().getCardModel(childPart.id);
    }
  }

  generateResponseMessageText() {
    return this.getClient().user.displayName + ' has responded' + (this.title ? ' to ' + this.title : '');
  }

  getModelFromPart(role) {
    const part = this.childParts.filter(part => part.mimeAttributes.role === role)[0];
    if (part) {
      return this.getClient().createCardModel(this.message, part);
    } else {
      return null;
    }
  }

  getModelsFromPart(role) {
    const parts = this.childParts.filter(part => part.mimeAttributes.role === role);
    return parts.map(part => this.getClient().createCardModel(this.message, part));
  }

  hasNoContainerData() {
    const title = this.getTitle && this.getTitle();
    const description = this.getDescription && this.getDescription();
    const footer = this.getFooter && this.getFooter();
    return !title && !description && !footer;
  }

  send(conversation, notification) {
    if (!this.message) {
      const parts = [this.part].concat(this.childParts);
      this.message = conversation.createMessage({ parts });
    }
    this.message.send(notification);
    return this;
  }

  getClient() {
    return this.message.getClient();
  }

  destroy() {
    const client = this.getClient();
    this.getClient()._removeCardModel(this);
    delete this.message;
    super.destroy();
  }

  getTitle() {
    return this.title || ''
  };
  getDescription() {
    return '';
  }
  getFooter() {
    return '';
  }

  mergeAction(newValue) {
    if (!this.action.event) this.action.event = newValue.event;
    const newData = newValue.data || {};
    let currentData;
    if (this.action.data) {
      currentData = this.action.data;
    } else {
      this.action.data = currentData = {};
    }

    Object.keys(newData).forEach((propertyName) => {
      if (!(propertyName in currentData)) currentData[propertyName] = newData[propertyName];
    });
  }

  // If triggered by a message change, trigger('change') is called above
  __updateResponses() {
    if (!this.responses) this.__responses = {};
    this._processNewResponses();
  }

  _processNewResponses() { }

  __getActionEvent() {
    return this.action.event || this.constructor.defaultAction;
  }

  __getActionData() {
    return this.action.data || {};
  }

  __updatePart(newPart) {
    if (!newPart.mimeAttributes['node-id']) {
      newPart.mimeAttributes['node-id'] = Util.generateUUID();
    }
  }

  get nodeId() {
    return this.part.mimeAttributes['node-id'];
  }

  _processDelayedTriggers() {
    if (this.isDestroyed) return;
    const changes = this._delayedTriggers.filter(evt => evt[0] === 'change');
    if (changes.length > 1) {
      let hasOne = false;
      this._delayedTriggers = this._delayedTriggers.filter(evt => {
        if (evt[0] === 'change' && !hasOne) {
          hasOne = true;
          return true;
        } else if (evt[0] === 'change') {
          return false;
        } else {
          return true;
        }
      });
    }
    super._processDelayedTriggers();
  }

  /**
   * Determine if the given Message is valid for this Card type.
   *
   *
   * @method isSupportedMessage
   * @static
   * @protected
   * @param  {layer.MessagePart} messagePart
   * @return {boolean}
   */
  static isSupportedMessage(message, cardRenderer) {
    if (cardRenderer || this.cardRenderer) return cardRenderer === this.cardRenderer;
    const pollPart = message.getPartWithMimeType(this.MIMEType);
    return Boolean(pollPart);
  }
}

/**
 * Message for this Card Model
 *
 * @type {layer.Message}
 */
CardModel.prototype.message = null;

/**
 * Message Parts that are directly used by this model.
 *
 * @type {layer.MessagePart[]}
 */
CardModel.prototype.childParts = null;

/**
 * Action object contains actionEvent and actionData
 *
 * @private
 * @type {Object}
 */
CardModel.prototype.action = null;

/**
 * Action to trigger when user selects this Card/Primitive
 *
 * Actions are strings that are put into events and which are intercepted and
 * interpreted either by parent cards or by the app.
 *
 * @type {String}
 */
CardModel.prototype.actionEvent = '';

/**
 * Data to share when triggering an Action.
 *
 * Action Data is an arbitrary hash, and typically would be null.
 * Most actions can directly work with the properties of the model
 * being operated upon (open-url uses the url property).
 * A Buy button however may get stuck on something that lacks
 * a price or product number (an Image Card).
 *
 * @type {Object}
 */
CardModel.prototype.actionData = null;

/**
 * Root Part defining this Model
 *
 * @type {layer.MessagePart}
 */
CardModel.prototype.part = null;

/**
 * The role value for the MessagePart.
 * @type {String}
 */
CardModel.prototype.role = null;

/**
 * Are responses enabled for this Card?
 *
 * @type {Boolean}
 */
CardModel.prototype.locked = false;

/**
 * Stores all user responses indexed by Identity ID
 *
 * @type {Object}
 */
CardModel.prototype.responses = null;

CardModel.prototype.currentCardRenderer = '';

CardModel.prefixUUID = 'layer:///cardmodels/';
CardModel._supportedEvents = ['change'].concat(Root._supportedEvents);
Root.initClass.apply(CardModel, [CardModel, 'CardModel']);
module.exports = CardModel;

