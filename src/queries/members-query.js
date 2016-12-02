
const Root = require('../root');
const LayerError = require('../layer-error');
const Util = require('../client-utils');
const Logger = require('../logger');
const { SYNC_STATE } = require('../const');
const Query = require('./query');

const findChannelIdRegex = new RegExp(
  /^channel.id\s*=\s*['"]((layer:\/\/\/channels\/)?.{8}-.{4}-.{4}-.{4}-.{12})['"]$/);


class MembersQuery extends Query {
   /**
   * Get the Conversation UUID from the predicate property.
   *
   * Extract the Conversation's UUID from the predicate... or returned the cached value.
   *
   * @method _getChannelPredicateIds
   * @private
   */
  _getChannelPredicateIds() {
    if (this.predicate.match(findChannelIdRegex)) {
      const channelId = this.predicate.replace(findChannelIdRegex, '$1');

      // We will already have a this._predicate if we are paging; else we need to extract the UUID from
      // the channelId.
      const uuid = (this._predicate || channelId).replace(/^layer:\/\/\/channels\//, '');
      if (uuid) {
        return {
          uuid,
          id: channelId,
          type: Query.Channel,
        };
      }
    }
  }


  _fetchData(pageSize) {
    const predicateIds = this._getConversationPredicateIds();

    // Do nothing if we don't have a conversation to query on
    if (!predicateIds) {
      if (!this.predicate.match(/['"]/)) {
        Logger.error('This query may need to quote its value');
      }
      return;
    }

    const channelId = 'layer:///channels/' + predicateIds.uuid;
    if (!this._predicate) this._predicate = predicateIds.id;
    const channel = this.client.getChannel(channelId);

    const newRequest = `channels/${predicateIds.uuid}/members?page_size=${pageSize}` +
      (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

    // Don't query on unsaved channels, nor repeat still firing queries
    if ((!channel || channel.isSaved()) && newRequest !== this._firingRequest) {
      this.isFiring = true;
      this._firingRequest = newRequest;
      this.client.xhr({
        url: newRequest,
        method: 'GET',
        sync: false,
      }, results => this._processRunResults(results, newRequest, pageSize));
    }
  }

  _appendResultsSplice(item) {
    this.data.push(this._getData(item));
  }


  _handleEvents(eventName, evt) {
    switch (eventName) {

      // If a Identity has changed and its in our result set, replace
      // it with a new immutable object
      case 'identities:change':
        this._handleChangeEvent(evt);
        break;

      // If Identities are added, and they aren't already in our result set
      // add them.
      case 'identities:add':
        this._handleAddEvent(evt);
        break;

      // If a Identity is deleted and its in our result set, remove it
      // and trigger an event
      case 'identities:remove':
        this._handleRemoveEvent(evt);
        break;
    }
  }

  // Review to see if identical to parent
  _handleChangeEvent(evt) {
    const index = this._getIndex(evt.target.id);

    if (index !== -1) {
      if (this.dataType === Query.ObjectDataType) {
        this.data = [
          ...this.data.slice(0, index),
          evt.target.toObject(),
          ...this.data.slice(index + 1),
        ];
      }
      this._triggerChange({
        type: 'property',
        target: this._getData(evt.target),
        query: this,
        isChange: true,
        changes: evt.changes,
      });
    }
  }

  // Review to see if identical to parent
  _handleAddEvent(evt) {
    const list = evt.identities
      .filter(identity => this._getIndex(identity.id) === -1)
      .map(identity => this._getData(identity));

    // Add them to our result set and trigger an event for each one
    if (list.length) {
      const data = this.data = this.dataType === Query.ObjectDataType ? [].concat(this.data) : this.data;
      list.forEach(item => data.push(item));

      this.totalSize += list.length;

      // Index calculated above may shift after additional insertions.  This has
      // to be done after the above insertions have completed.
      list.forEach((item) => {
        this._triggerChange({
          type: 'insert',
          index: this.data.indexOf(item),
          target: item,
          query: this,
        });
      });
    }
  }

  // Review to see if identical to parent
  _handleRemoveEvent(evt) {
    const removed = [];
    evt.identities.forEach((identity) => {
      const index = this._getIndex(identity.id);

      if (index !== -1) {
        if (identity.id === this._nextDBFromId) this._nextDBFromId = this._updateNextFromId(index);
        if (identity.id === this._nextServerFromId) this._nextServerFromId = this._updateNextFromId(index);
        removed.push({
          data: identity,
          index,
        });
        if (this.dataType === Query.ObjectDataType) {
          this.data = [
            ...this.data.slice(0, index),
            ...this.data.slice(index + 1),
          ];
        } else {
          this.data.splice(index, 1);
        }
      }
    });

    this.totalSize -= removed.length;
    removed.forEach((removedObj) => {
      this._triggerChange({
        type: 'remove',
          // Review to see if identical to parent
        target: this._getData(removedObj.data),
        index: removedObj.index,
        query: this,
      });
    });
  }
}

MembersQuery._supportedEvents = [

].concat(Query._supportedEvents);


MembersQuery.MaxPageSize = 500;

MembersQuery.prototype.model = Query.Identity;

Root.initClass.apply(MembersQuery, [MembersQuery, 'MembersQuery']);

module.exports = MembersQuery;
