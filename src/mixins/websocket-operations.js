/**
 * Adds handling of custom websocket operations.
 *
 * This is handled by a Client mixin rather than:
 *
 * * The Client itself so we can keep the client simple and clean
 * * The Websocket Change Manager so that the change manager does not need to know
 *   how to handle any operation on any data.  Its primarily aimed at insuring websocket
 *   events get processed, not knowing minute details of the objects.
 *
 * @class layer.mixins.WebsocketOperations
 */

const Identity = require('../models/identity');
const ErrorDictionary = require('../layer-error').dictionary;
const Util = require('../client-utils');
const { RECEIPT_STATE } = require('../const');
const { WebsocketSyncEvent } = require('../sync-event');

module.exports = {
  lifecycle: {

    // Listen for any websocket operations and call our handler
    constructor(options) {
      this.on('websocket:operation', this._handleWebsocketOperation, this);
    },
  },
  methods: {

    /**
     * Enourmous switch statement for handling our immense library of operations.
     *
     * Any time we have a Websocket Operation, this switch statement routes the event to the
     * appropriate handler.
     *
     * @param {Object} evt
     */
    _handleWebsocketOperation(evt) {
      switch (evt.data.method) {
        case 'Conversation.mark_all_read':
          return this._handleMarkAllReadOperation(evt.data);
      }
    },

    /**
     * Process a mark_all_read websocket operation.
     *
     * This will update recipientStatus and isRead for all impacted messages.
     * Note that we don't have a good mechanism of organizing all messages and simply
     * iterate over all messages in the message cache checking if they are affected by the request.
     *
     * Future optimizations could:
     *
     * 1. Get the conversation if its cached, and update its lastMessage
     * 2. Iterate over all queries to see if a query is for messages in this conversation
     *
     * That would still miss messages created via websocket `create` events but not referenced
     * by any query or last message.
     *
     * @param {Object} body
     */
    _handleMarkAllReadOperation(body) {
      const position = body.data.position;
      const conversation = this.getObject(body.object.id);
      if (!conversation) return;
      const identityId = body.data.identity.id;
      const isOwner = this.user.id === identityId;

      // Prevent read receipts from being sent when we set isRead=true
      conversation._inMarkAllAsRead = true;

      // Iterate over all messages, and operate on any message with the proper converation ID and position
      this.forEachMessage((m) => {
        if (m.conversationId === conversation.id && m.position <= position) {

          // NOTE: We may want to trigger "messages:change" on recipientStatus if isOwner, but
          // don't have a strong use case for that event.
          if (isOwner) {
            m.recipientStatus[identityId] = RECEIPT_STATE.READ;
            m.isRead = true;
          } else if (m.recipientStatus[identityId] !== RECEIPT_STATE.READ) {
            const newRecipientStatus = Util.clone(m.recipientStatus);

            newRecipientStatus[identityId] = RECEIPT_STATE.READ;
            m.recipientStatus = newRecipientStatus;
          }
        }
      });
      conversation._inMarkAllAsRead = false;
    },
  },
};
