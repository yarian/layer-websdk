
const Root = require('../root');
const LayerError = require('../layer-error');
const Util = require('../client-utils');
const Logger = require('../logger');
const { SYNC_STATE } = require('../const');
const Query = require('./query');
const MessagesQuery = require('./messages-query');

class AnnouncementsQuery extends MessagesQuery {
  _fixPredicate(inValue) {
    return Query.prototype._fixPredicate.apply(this, [inValue]);
  }

  _fetchData(pageSize) {
    // Retrieve data from db cache in parallel with loading data from server
    this.client.dbManager.loadAnnouncements(this._nextDBFromId, pageSize, (messages) => {
      if (messages.length) this._appendResults({ data: messages }, true);
    });

    const newRequest = `announcements?page_size=${pageSize}` +
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
}

AnnouncementsQuery._supportedEvents = [
].concat(MessagesQuery._supportedEvents);


AnnouncementsQuery.MaxPageSize = 100;

AnnouncementsQuery.prototype.model = Query.Announcement;

Root.initClass.apply(AnnouncementsQuery, [AnnouncementsQuery, 'AnnouncementsQuery']);

module.exports = AnnouncementsQuery;
