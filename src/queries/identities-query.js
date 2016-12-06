
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
        this._handleChangeEvent('identities', evt);
        break;

      // If Identities are added, and they aren't already in our result set
      // add them.
      case 'identities:add':
        this._handleAddEvent('identities', evt);
        break;

      // If a Identity is deleted and its in our result set, remove it
      // and trigger an event
      case 'identities:remove':
        this._handleRemoveEvent('identities', evt);
        break;
    }
  }
}

IdentitiesQuery._supportedEvents = [

].concat(Query._supportedEvents);


IdentitiesQuery.MaxPageSize = 500;

IdentitiesQuery.prototype.model = Query.Identity;

Root.initClass.apply(IdentitiesQuery, [IdentitiesQuery, 'IdentitiesQuery']);

module.exports = IdentitiesQuery;
