/**
 * Adds Identity handling to the layer.Client.
 *
 * @class layer.mixins.ClientIdentities
 */

const Syncable = require('../models/syncable');
const Membership = require('../models/membership');
const ErrorDictionary = require('../layer-error').dictionary;

module.exports = {
  properties: {
    /**
     * Hash of layer.Membership objects for quick lookup by id
     *
     * @private
     * @property {Object}
     */
    _membersHash: null,
  },
  events: [
    /**
     * A call to layer.Membership.load has completed successfully
     *
     * @event
     * @param {layer.LayerEvent} evt
     * @param {layer.Membership} evt.target
     */
    'members:loaded',

    /**
     * An Identity has had a change in its properties.
     *
     * Changes occur when new data arrives from the server.
     *
     *      client.on('members:change', function(evt) {
     *          var displayNameChanges = evt.getChangesFor('displayName');
     *          if (displayNameChanges.length) {
     *              myView.renderStatus(evt.target);
     *          }
     *      });
     *
     * @event
     * @param {layer.LayerEvent} evt
     * @param {layer.Membership} evt.target
     * @param {Object[]} evt.changes
     * @param {Mixed} evt.changes.newValue
     * @param {Mixed} evt.changes.oldValue
     * @param {string} evt.changes.property - Name of the property that has changed
     */
    'members:change',

    /**
     * A new Member has been added to the Client.
     *
     * This event is triggered whenever a new layer.Membership (Full identity or not)
     * has been received by the Client.
     *
            client.on('members:add', function(evt) {
                evt.membership.forEach(function(identity) {
                    myView.addIdentity(identity);
                });
            });
    *
    * @event
    * @param {layer.LayerEvent} evt
    * @param {layer.Membership[]} evt.membership
    */
    'members:add',

    /**
     * A Member has been removed from the Client.
     *
     * This does not typically occur.
     *
            client.on('members:remove', function(evt) {
                evt.membership.forEach(function(identity) {
                    myView.addIdentity(identity);
                });
            });
    *
    * @event
    * @param {layer.LayerEvent} evt
    * @param {layer.Membership[]} evt.membership
    */
    'members:remove',
  ],
  lifecycle: {
    constructor(options) {
      this._membersHash = {};
    },
    cleanup() {
      Object.keys(this._membersHash).forEach((id) => {
        const member = this._membersHash[id];
        if (member && !member.isDestroyed) {
          member.destroy();
        }
      });
      this._membersHash = null;
    },
    reset() {
      this._membersHash = {};
    },
  },
  methods: {
    /**
     * Retrieve the membership info by ID.
     *
     * Not for use in typical apps.
     *
     * @method getMember
     * @param  {string} id               - layer:///channels/uuid/members/user_id
     * @param  {boolean} [canLoad=false] - Pass true to allow loading a member from the server if not found
     * @return {layer.Membership}
     */
    getMember(id, canLoad) {
      if (typeof id !== 'string') throw new Error(ErrorDictionary.idParamRequired);

      if (this._membersHash[id]) {
        return this._membersHash[id];
      } else if (canLoad) {
        return Syncable.load(id, this);
      }
      return null;
    },

    /**
     * Report that a new Membership has been added.
     *
     * @method _addMembership
     * @protected
     * @param  {layer.Membership} member
     *
     */
    _addMembership(member) {
      if (!this._membersHash[member.id]) {
        this._membersHash[member.id] = member;
        this._triggerAsync('members:add', { members: [member] });
        this._scheduleCheckAndPurgeCache(member);
      }
    },

    /**
     * Report that a member has been removed from the client.
     *
     * @method _removeMembership
     * @protected
     * @param  {layer.Membership} member
     */
    _removeMembership(member) {
      const id = (typeof member === 'string') ? member : member.id;
      member = this._membersHash[id];
      if (member) {
        delete this._membersHash[id];
        if (!this._inCleanup) {
          member.off(null, null, this);
          this._triggerAsync('members:remove', { members: [member] });
        }
      }
    },
  },
};
