/**
 * Adds Query handling to the layer.Client.
 *
 * @class layer.mixins.ClientQueries
 */

const Query = require('../query');
const ErrorDictionary = require('../layer-error').dictionary;

module.exports = {
  properties: {
    /**
     * Hash of layer.Query objects for quick lookup by id
     *
     * @private
     * @property {Object}
     */
    _queriesHash: null,
  },
  events: [


  ],
  lifecycle: {
    constructor(options) {
      this._queriesHash = {};
    },
    cleanup() {
      Object.keys(this._queriesHash).forEach((id) => {
        const query = this._queriesHash[id];
        if (query && !query.isDestroyed) {
          query.destroy();
        }
      });
      this._queriesHash = null;
    },
    reset() {
      this._queriesHash = {};
    },

  },
  methods: {
    /**
     * Retrieve the query by query id.
     *
     * Useful for finding a Query when you only have the ID
     *
     * @method getQuery
     * @param  {string} id              - layer:///queries/uuid
     * @return {layer.Query}
     */
    getQuery(id) {
      if (typeof id !== 'string') throw new Error(ErrorDictionary.idParamRequired);
      return this._queriesHash[id] || null;
    },

    /**
     * There are two options to create a new layer.Query instance.
     *
     * The direct way:
     *
     *     var query = client.createQuery({
     *         model: layer.Query.Message,
     *         predicate: 'conversation.id = '' + conv.id + ''',
     *         paginationWindow: 50
     *     });
     *
     * A Builder approach that allows for a simpler syntax:
     *
     *     var qBuilder = QueryBuilder
     *      .messages()
     *      .forConversation('layer:///conversations/ffffffff-ffff-ffff-ffff-ffffffffffff')
     *      .paginationWindow(100);
     *     var query = client.createQuery(qBuilder);
     *
     * @method createQuery
     * @param  {layer.QueryBuilder|Object} options - Either a layer.QueryBuilder instance, or parameters for the layer.Query constructor
     * @return {layer.Query}
     */
    createQuery(options) {
      let query;
      if (typeof options.build === 'function') {
        query = new Query(this, options);
      } else {
        options.client = this;
        query = new Query(options);
      }
      this._addQuery(query);
      return query;
    },

    /**
     * Register the layer.Query.
     *
     * @method _addQuery
     * @private
     * @param  {layer.Query} query
     */
    _addQuery(query) {
      this._queriesHash[query.id] = query;
    },

    /**
     * Deregister the layer.Query.
     *
     * @method _removeQuery
     * @private
     * @param  {layer.Query} query [description]
     */
    _removeQuery(query) {
      if (query) {
        delete this._queriesHash[query.id];
        if (!this._inCleanup) {
          const data = query.data
            .map(obj => this._getObject(obj.id))
            .filter(obj => obj);
          this._checkAndPurgeCache(data);
        }
        this.off(null, null, query);
      }
    },
  },
};
