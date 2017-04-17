/**
 * Query class for running a Query on Channel Members
 *
 *      var membersQuery = client.createQuery({
 *        client: client,
 *        model: layer.Query.Membership,
 *        predicate: 'channel.id = "layer:///channels/UUID"'
 *      });
 *
 * You can change the data selected by your query any time you want using:
 *
 *      query.update({
 *        predicate: 'channel.id = "layer:///channels/UUID2"'
 *      });
 *
 * You can release data held in memory by your queries when done with them:
 *
 *      query.destroy();
 *
 * #### predicate
 *
 * Note that the `predicate` property is only supported for Messages and Membership, and only supports
 * querying by Channel.
 *
 * @class  layer.MembersQuery
 * @extends layer.Query
 */
const Root = require('../root');
const LayerError = require('../layer-error');
const Logger = require('../logger');
const Query = require('./query');

const findChannelIdRegex = new RegExp(
  /^channel.id\s*=\s*['"]((layer:\/\/\/channels\/)?.{8}-.{4}-.{4}-.{4}-.{12})['"]$/);


class MembersQuery extends Query {
  _fixPredicate(inValue) {
    if (inValue === '') return '';
    if (inValue.indexOf('channel.id') !== -1) {
      let channelId = inValue.match(findChannelIdRegex) ? inValue.replace(findChannelIdRegex, '$1') : null;
      if (!channelId) throw new Error(LayerError.dictionary.invalidPredicate);
      if (channelId.indexOf('layer:///channels/') !== 0) channelId = 'layer:///channels/' + channelId;
      return `channel.id = '${channelId}'`;
    } else {
      throw new Error(LayerError.dictionary.invalidPredicate);
    }
  }

  /**
   * Get the Channel UUID from the predicate property.
   *
   * Extract the Channel's UUID from the predicate... or returned the cached value.
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
    const predicateIds = this._getChannelPredicateIds();

    // Do nothing if we don't have a conversation to query on
    if (!predicateIds) {
      if (this.predicate && !this.predicate.match(/['"]/)) {
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

      // If a member has changed and its in our result set, replace
      // it with a new immutable object
      case 'members:change':
        this._handleChangeEvent('members', evt);
        break;

      // If members are added, and they aren't already in our result set
      // add them.
      case 'members:add':
        this._handleAddEvent('members', evt);
        break;

      // If a Identity is deleted and its in our result set, remove it
      // and trigger an event
      case 'members:remove':
        this._handleRemoveEvent('members', evt);
        break;
    }
  }
}

MembersQuery._supportedEvents = [

].concat(Query._supportedEvents);


MembersQuery.MaxPageSize = 500;

MembersQuery.prototype.model = Query.Membership;

Root.initClass.apply(MembersQuery, [MembersQuery, 'MembersQuery']);

module.exports = MembersQuery;
