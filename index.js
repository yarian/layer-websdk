/* istanbul ignore next */
if (!global.layer) global.layer = {};

/* istanbul ignore next */
if (!global.layer.plugins) global.layer.plugins = {};

var layer = global.layer;
layer.Root = require('./lib/root');
layer.Client = require('./lib/client');
layer.ClientAuthenticator = require('./lib/client-authenticator');
layer.Syncable = require('./lib/syncable');
layer.Conversation = require('./lib/messaging/conversation');
layer.Message = require('./lib/messaging/message');
layer.Announcement = require('./lib/messaging/announcement');
layer.MessagePart = require('./lib/messaging/message-part');
layer.Content = require('./lib/messaging/content');
layer.Query = require('./lib/query');
layer.QueryBuilder = require('./lib/query-builder');
layer.xhr = require('./lib/xhr');
layer.Identity = require('./lib/identity');
layer.LayerError = require('./lib/layer-error');
layer.LayerEvent = require('./lib/layer-event');
layer.SyncManager = require('./lib/sync-manager');
layer.SyncEvent = require('./lib/sync-event').SyncEvent;
layer.XHRSyncEvent = require('./lib/sync-event').XHRSyncEvent;
layer.WebsocketSyncEvent = require('./lib/sync-event').WebsocketSyncEvent;
layer.Websockets = {
  SocketManager: require('./lib/websockets/socket-manager'),
  RequestManager: require('./lib/websockets/request-manager'),
  ChangeManager: require('./lib/websockets/change-manager'),
};
layer.OnlineStateManager = require('./lib/online-state-manager');
layer.DbManager = require('./lib/db-manager');
layer.Constants = require('./lib/const');
layer.Util = require('./lib/client-utils');
layer.TypingIndicators = require('./lib/typing-indicators/typing-indicators');
layer.TypingIndicators.TypingListener = require('./lib/typing-indicators/typing-listener');
layer.TypingIndicators.TypingPublisher = require('./lib/typing-indicators/typing-publisher');
module.exports = layer;
