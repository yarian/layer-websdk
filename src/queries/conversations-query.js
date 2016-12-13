
const Root = require('../root');
const LayerError = require('../layer-error');
const Util = require('../client-utils');
const Logger = require('../logger');
const { SYNC_STATE } = require('../const');
const Query = require('./query');

class ConversationsQuery extends Query {

  _fetchData(pageSize) {
    const sortBy = this._getSortField();

    this.client.dbManager.loadConversations(sortBy, this._nextDBFromId, pageSize, (conversations) => {
      if (conversations.length) this._appendResults({ data: conversations }, true);
    });

    const newRequest = `conversations?sort_by=${sortBy}&page_size=${pageSize}` +
      (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

    if (newRequest !== this._firingRequest) {
      this.isFiring = true;
      this._firingRequest = newRequest;
      this.client.xhr({
        url: this._firingRequest,
        method: 'GET',
        sync: false,
      }, results => this._processRunResults(results, this._firingRequest, pageSize));
    }
  }

  _getSortField() {
    if (this.sortBy && this.sortBy[0] && this.sortBy[0]['lastMessage.sentAt']) {
      return 'last_message';
    } else {
      return 'created_at';
    }
  }

  _getItem(id) {
    switch (Util.typeFromID(id)) {
      case 'messages':
        for (let index = 0; index < this.data.length; index++) {
          const conversation = this.data[index];
          if (conversation.lastMessage && conversation.lastMessage.id === id) return conversation.lastMessage;
        }
        return null;
      case 'conversations':
        return super._getItem(id);
    }
  }

  _appendResultsSplice(item) {
    const data = this.data;
    const index = this._getInsertIndex(item, data);
    data.splice(index, 0, this._getData(item));
  }

  _handleEvents(eventName, evt) {
    switch (eventName) {

      // If a Conversation's property has changed, and the Conversation is in this
      // Query's data, then update it.
      case 'conversations:change':
        this._handleChangeEvent(evt);
        break;

      // If a Conversation is added, and it isn't already in the Query,
      // add it and trigger an event
      case 'conversations:add':
        this._handleAddEvent(evt);
        break;

      // If a Conversation is deleted, and its still in our data,
      // remove it and trigger an event.
      case 'conversations:remove':
        this._handleRemoveEvent(evt);
        break;
    }
  }

  // TODO WEB-968: Refactor this into functions for instance, object, sortBy createdAt, sortBy lastMessage
  _handleChangeEvent(evt) {
    let index = this._getIndex(evt.target.id);

    // If its an ID change (matching Distinct Conversation returned by server) make sure to update our data.
    // If dataType is an instance, its been updated for us.
    if (this.dataType === Query.ObjectDataType) {
      const idChanges = evt.getChangesFor('id');
      if (idChanges.length) {
        index = this._getIndex(idChanges[0].oldValue);
      }
    }

    // If dataType is "object" then update the object and our array;
    // else the object is already updated.
    // Ignore results that aren't already in our data; Results are added via
    // conversations:add events.  Websocket Manager automatically loads anything that receives an event
    // for which we have no object, so we'll get the add event at that time.
    if (index !== -1) {
      const sortField = this._getSortField();
      const reorder = evt.hasProperty('lastMessage') && sortField === 'last_message';
      let newIndex;

      if (this.dataType === Query.ObjectDataType) {
        if (!reorder) {
          // Replace the changed Conversation with a new immutable object
          this.data = [
            ...this.data.slice(0, index),
            evt.target.toObject(),
            ...this.data.slice(index + 1),
          ];
        } else {
          newIndex = this._getInsertIndex(evt.target, this.data);
          this.data.splice(index, 1);
          this.data.splice(newIndex, 0, this._getData(evt.target));
          this.data = this.data.concat([]);
        }
      }

      // Else dataType is instance not object
      else if (reorder) {
        newIndex = this._getInsertIndex(evt.target, this.data);
        if (newIndex !== index) {
          this.data.splice(index, 1);
          this.data.splice(newIndex, 0, evt.target);
        }
      }

      // Trigger a 'property' event
      this._triggerChange({
        type: 'property',
        target: this._getData(evt.target),
        query: this,
        isChange: true,
        changes: evt.changes,
      });

      if (reorder && newIndex !== index) {
        this._triggerChange({
          type: 'move',
          target: this._getData(evt.target),
          query: this,
          isChange: false,
          fromIndex: index,
          toIndex: newIndex,
        });
      }
    }
  }

  _getInsertIndex(conversation, data) {
    if (!conversation.isSaved()) return 0;
    const sortField = this._getSortField();
    let index;
    if (sortField === 'created_at') {
      for (index = 0; index < data.length; index++) {
        const item = data[index];
        if (item.syncState === SYNC_STATE.NEW || item.syncState === SYNC_STATE.SAVING) continue;
        if (conversation.createdAt >= item.createdAt) break;
      }
      return index;
    } else {
      let oldIndex = -1;
      const d1 = conversation.lastMessage ? conversation.lastMessage.sentAt : conversation.createdAt;
      for (index = 0; index < data.length; index++) {
        const item = data[index];
        if (item.id === conversation.id) {
          oldIndex = index;
          continue;
        }
        if (item.syncState === SYNC_STATE.NEW || item.syncState === SYNC_STATE.SAVING) continue;
        const d2 = item.lastMessage ? item.lastMessage.sentAt : item.createdAt;
        if (d1 >= d2) break;
      }
      return oldIndex === -1 || oldIndex > index ? index : index - 1;
    }
  }

  _handleAddEvent(evt) {
    // Filter out any Conversations already in our data
    const list = evt.conversations
                  .filter(conversation => this._getIndex(conversation.id) === -1);

    if (list.length) {
      const data = this.data;
      list.forEach((conversation) => {
        const newIndex = this._getInsertIndex(conversation, data);
        data.splice(newIndex, 0, this._getData(conversation));
      });

      // Whether sorting by last_message or created_at, new results go at the top of the list
      if (this.dataType === Query.ObjectDataType) {
        this.data = [].concat(data);
      }
      this.totalSize += list.length;

      // Trigger an 'insert' event for each item added;
      // typically bulk inserts happen via _appendResults().
      list.forEach((conversation) => {
        const item = this._getData(conversation);
        this._triggerChange({
          type: 'insert',
          index: this.data.indexOf(item),
          target: item,
          query: this,
        });
      });
    }
  }


  _handleRemoveEvent(evt) {
    const removed = [];
    evt.conversations.forEach((conversation) => {
      const index = this._getIndex(conversation.id);
      if (index !== -1) {
        if (conversation.id === this._nextDBFromId) this._nextDBFromId = this._updateNextFromId(index);
        if (conversation.id === this._nextServerFromId) this._nextServerFromId = this._updateNextFromId(index);
        removed.push({
          data: conversation,
          index,
        });
        if (this.dataType === Query.ObjectDataType) {
          this.data = [...this.data.slice(0, index), ...this.data.slice(index + 1)];
        } else {
          this.data.splice(index, 1);
        }
      }
    });

    this.totalSize -= removed.length;
    removed.forEach((removedObj) => {
      this._triggerChange({
        type: 'remove',
        index: removedObj.index,
        target: this._getData(removedObj.data),
        query: this,
      });
    });
  }
}

ConversationsQuery._supportedEvents = [

].concat(Query._supportedEvents);


ConversationsQuery.MaxPageSize = 100;

ConversationsQuery.prototype.model = Query.Conversation;

Root.initClass.apply(ConversationsQuery, [ConversationsQuery, 'ConversationsQuery']);

module.exports = ConversationsQuery;
