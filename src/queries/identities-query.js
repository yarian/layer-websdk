
const Root = require('../root');
const LayerError = require('../layer-error');
const Util = require('../client-utils');
const Logger = require('../logger');
const { SYNC_STATE } = require('../const');
const Query = require('./query');

class IdentitiesQuery extends Query {
  _fetchData(pageSize) {
    // There is not yet support for paging Identities;  as all identities are loaded,
    // if there is a _nextDBFromId, we no longer need to get any more from the database
    if (!this._nextDBFromId) {
      this.client.dbManager.loadIdentities((identities) => {
        if (identities.length) this._appendResults({ data: identities }, true);
      });
    }

    const newRequest = `identities?page_size=${pageSize}` +
      (this._nextServerFromId ? '&from_id=' + this._nextServerFromId : '');

    // Don't repeat still firing queries
    if (newRequest !== this._firingRequest) {
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

IdentitiesQuery._supportedEvents = [

].concat(Query._supportedEvents);


IdentitiesQuery.MaxPageSize = 500;

IdentitiesQuery.prototype.model = Query.Identity;

Root.initClass.apply(IdentitiesQuery, [IdentitiesQuery, 'IdentitiesQuery']);

module.exports = IdentitiesQuery;
