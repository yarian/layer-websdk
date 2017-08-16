/**
 * Adds CardModel handling to the layer.Client.
 *
 * TODO:
 * 1. If the Message is destroyed, find and destroy any linked Models
 * 2. If the Card is in use, insure that the Message isn't garbage collected.
 *    Potential definition of in-use: its in the DOM
 *
 * @class layer.mixins.ClientCardModels
 */
const ErrorDictionary = require('../layer-error').dictionary;
const uuid = require('../client-utils').uuid;
const CardModel = require('../models/card-model');

const CardModelClasses = [];
const CardModelHash = {};
const CardModelNameHash = {};

module.exports = {
  events: [

  ],
  lifecycle: {
    constructor(options) {
      this._models.cards = {};
    },
    cleanup() {
      Object.keys(this._models.cards).forEach((id) => {
        const query = this._models.cards[id];
        if (query && !query.isDestroyed) {
          query.destroy();
        }
      });
      this._models.cards = null;
    },
    reset() {
      this._models.cards = {};
    },

  },
  methods: {
    /**
     * Retrieve the card by card id.
     *
     * Useful for finding a card when you only have the ID
     *
     * @method getCard
     * @param  {string} id              - layer:///queries/uuid
     * @return {layer.CardModel}
     */
    getCardModel(id) {
      if (typeof id !== 'string') throw new Error(ErrorDictionary.idParamRequired);
      id = id.replace(/layer:\/\/\/messages\//, CardModel.prefixUUID);

      return this._models.cards[id] || null;
    },

    /**
     * Register the layer.CardModel.
     *
     * @method _addCardModel
     * @private
     * @param  {layer.CardModel} cardmodel
     */
    _addCardModel(cardmodel) {
      this._models.cards[cardmodel.id] = cardmodel;
    },

    /**
     * Deregister the layer.CardModel.
     *
     * @method _removeCardModel
     * @private
     * @param  {layer.CardModel} cardmodel
     */
    _removeCardModel(cardmodel) {
      if (cardmodel) {
        delete this._models.cards[cardmodel.id];
        this.off(null, null, cardmodel);
      }
    },

    /**
     * Get the CardModel Class that supports this mimeType.
     *
     * Technically this could be a static method, but its simplest to use when invoked on the Client itself.
     *
     * @param {String} mimeType
     */
    getCardModelClassForMimeType(mimeType) {
      return CardModelHash[mimeType];
    },

    /**
     * Create a Card Model for this Message
     *
     * @param {layer.Message} message
     * @param {layer.MessagePart} part
     */
    createCardModel(message, part) {
      const cardId = part.id.replace(/layer:\/\/\/messages\//, CardModel.prefixUUID);
      const cardModel = this.getCardModel(cardId);
      if (cardModel) {
        cardModel._parseMessage(part.body ? JSON.parse(part.body) : {});
        return cardModel;
      } else {
        const CardModelClass = this.getCardModelClassForMimeType(part.mimeType);
        if (CardModelClass) return new CardModelClass({ message, part });
      }
      return null;
    },
  },

  staticMethods: {
    /**
     * Call this static method to register a CardModelClass.
     *
     * @param {Function} registerCardModelClass
     */
    registerCardModelClass(cardModelClass, name) {
      CardModelClasses.push(cardModelClass);
      CardModelHash[cardModelClass.MIMEType] = cardModelClass;
      if (name) CardModelNameHash[name] = cardModelClass;
    },
    getCardModelClass(name) {
      return CardModelNameHash[name];
    },
  },
};

