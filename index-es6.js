/* istanbul ignore next */
if (global.layer && global.layer.Client) {
  console.error('ERROR: It appears that you have multiple copies of the Layer WebSDK in your build!');
  module.exports = global.layer;
} else {
  /* istanbul ignore next */
  if (!global.layer) global.layer = {};

  /* istanbul ignore next */
  if (!global.layer.plugins) global.layer.plugins = {};

  const layer = global.layer;
  layer.Root = require('./src/root');
  layer.Client = require('./src/client');
  layer.ClientAuthenticator = require('./src/client-authenticator');
  layer.Syncable = require('./src/models/syncable');
  layer.Conversation = require('./src/models/conversation');
  layer.Channel = require('./src/models/channel');
  layer.Container = require('./src/models/container');
  layer.Message = require('./src/models/message');
  layer.Message.ConversationMessage = require('./src/models/conversation-message');
  layer.Message.ChannelMessage = require('./src/models/channel-message');
  layer.Announcement = require('./src/models/announcement');
  layer.MessagePart = require('./src/models/message-part');
  layer.Content = require('./src/models/content');
  layer.Query = require('./src/queries/query');
  layer.QueryBuilder = require('./src/queries/query-builder');
  layer.xhr = require('./src/xhr');
  layer.Identity = require('./src/models/identity');
  layer.Membership = require('./src/models/membership');
  layer.LayerError = require('./src/layer-error');
  layer.LayerEvent = require('./src/layer-event');
  layer.SyncManager = require('./src/sync-manager');
  layer.SyncEvent = require('./src/sync-event').SyncEvent;
  layer.XHRSyncEvent = require('./src/sync-event').XHRSyncEvent;
  layer.WebsocketSyncEvent = require('./src/sync-event').WebsocketSyncEvent;
  layer.Websockets = {
    SocketManager: require('./src/websockets/socket-manager'),
    RequestManager: require('./src/websockets/request-manager'),
    ChangeManager: require('./src/websockets/change-manager'),
  };
  layer.OnlineStateManager = require('./src/online-state-manager');
  layer.DbManager = require('./src/db-manager');
  layer.Constants = require('./src/const');
  layer.Util = require('./src/client-utils');
  layer.TypingIndicators = require('./src/typing-indicators/typing-indicators');
  layer.TypingIndicators.TypingListener = require('./src/typing-indicators/typing-listener');
  layer.TypingIndicators.TypingPublisher = require('./src/typing-indicators/typing-publisher');

  module.exports = layer;
}