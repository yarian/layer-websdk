/**
 * Run the Layer Parser on the request.
 *
 * Parameters here
 * are the parameters specied in [Layer-Patch](https://github.com/layerhq/node-layer-patch), plus
 * a client object.
 *
 *      layerParse({
 *          object: conversation,
 *          type: 'Conversation',
 *          operations: layerPatchOperations,
 *          client: client
 *      });
 *
 * @method
 * @param {Object} request - layer-patch parameters
 * @param {Object} request.object - Object being updated  by the operations
 * @param {string} request.type - Type of object being updated
 * @param {Object[]} request.operations - Array of change operations to perform upon the object
 * @param {layer.Client} request.client
 */
const LayerParser = require('layer-patch');

let parser;

/**
 * Creates a LayerParser
 *
 * @method
 * @private
 * @param {Object} request - see layer.ClientUtils.layerParse
 */
function createParser(request) {
  request.client.once('destroy', () => (parser = null));

  parser = new LayerParser({
    camelCase: true,
    getObjectCallback: id => request.client.getObject(id),
    createObjectCallback: (id, obj) => request.client._createObject(obj),
    propertyNameMap: {
      Conversation: {
        unreadMessageCount: 'unreadCount',
      },
      Identity: {
        presence: '_presence',
      },
    },
    changeCallbacks: {
      MessagePart: {
        all: (updateObject, newValue, oldValue, paths) => {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        },
      },
      Message: {
        all: (updateObject, newValue, oldValue, paths) => {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        },
      },
      Conversation: {
        all: (updateObject, newValue, oldValue, paths) => {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        },
      },
      Channel: {
        all: (updateObject, newValue, oldValue, paths) => {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        },
      },
      Identity: {
        all: (updateObject, newValue, oldValue, paths) => {
          updateObject._handlePatchEvent(newValue, oldValue, paths);
        },
      },
    },
  });
}

// Docs in client-utils.js
module.exports = (request) => {
  if (!parser) createParser(request);
  parser.parse(request);
};
