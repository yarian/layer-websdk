/**
 * Allows all components to have a clientId instead of a client pointer.
 * Allows an app to have multiple Clients, each with its own appId.
 * Provides a global utility that can be required by all modules for accessing
 * the client.
 *
 * @class  layer.ClientRegistry
 * @private
 */

const registry = {};

/**
 * Register a new Client; will destroy any previous client with the same appId.
 *
 * @method register
 * @param  {layer.Client} client
 */
function register(client) {
  const appId = client.appId;
  if (registry[appId] && !registry[appId].isDestroyed) {
    registry[appId].destroy();
  }
  registry[appId] = client;
}

/**
 * Removes a Client.
 *
 * @method unregister
 * @param  {layer.Client} client
 */
function unregister(client) {
  if (registry[client.appId]) delete registry[client.appId];
}

/**
 * Get a Client by appId
 *
 * @method get
 * @param  {string} appId
 * @return {layer.Client}
 */
function get(appId) {
  return registry[appId];
}

function getAll() {
  return Object.keys(registry).map(key => registry[key]);
}

module.exports = {
  get,
  getAll,
  register,
  unregister,
};
