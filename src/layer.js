const layer = {};
module.exports = layer;

layer.Root = require('./root');
layer.Client = require('./client');
layer.ClientAuthenticator = require('./client-authenticator');
layer.Syncable = require('./models/syncable');
layer.Conversation = require('./models/conversation');
layer.Channel = require('./models/channel');
layer.Container = require('./models/container');
layer.Message = require('./models/message');
layer.Message.ConversationMessage = require('./models/conversation-message');
layer.Message.ChannelMessage = require('./models/channel-message');
layer.Announcement = require('./models/announcement');
layer.MessagePart = require('./models/message-part');
layer.Content = require('./models/content');
layer.CardModel = require('./models/card-model');
layer.Query = require('./queries/query');
layer.QueryBuilder = require('./queries/query-builder');
layer.xhr = require('./xhr');
layer.Identity = require('./models/identity');
layer.Membership = require('./models/membership');
layer.LayerError = require('./layer-error');
layer.LayerEvent = require('./layer-event');
layer.SyncManager = require('./sync-manager');
layer.SyncEvent = require('./sync-event').SyncEvent;
layer.XHRSyncEvent = require('./sync-event').XHRSyncEvent;
layer.WebsocketSyncEvent = require('./sync-event').WebsocketSyncEvent;
layer.Websockets = {
  SocketManager: require('./websockets/socket-manager'),
  RequestManager: require('./websockets/request-manager'),
  ChangeManager: require('./websockets/change-manager'),
};
layer.OnlineStateManager = require('./online-state-manager');
layer.DbManager = require('./db-manager');
layer.Constants = require('./const');
layer.Util = require('./client-utils');
layer.TypingIndicators = require('./typing-indicators/typing-indicators');
layer.TypingIndicators.TypingListener = require('./typing-indicators/typing-listener');
layer.TypingIndicators.TypingPublisher = require('./typing-indicators/typing-publisher');
