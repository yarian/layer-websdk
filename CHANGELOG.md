# Web SDK Change Log

## 2.0.0 Beta 3

* layer.Client.websocketUrl is now a public property
* No longer writes Blobs to indexedDB as the Evil Safari Smurfs (v9.1.2) have decided not to support that.  Now writes base64.
* Client.logout() now provides a callback notifying you when its safe to navigate away from the page.  Failure to use this may cause
  data to not be deleted on logging out.  Especially problematic in Safari.
* Simplified access to MessagePart data; `MessagePart.body` will be either a string or Blob, never a base64 string
  * Adds static property `layer.MessagePart.TextualMimeTypes` which stores an array of strings and regular expressions used to test if a MIME Type represents textual data.
  * Any textual MessagePart will have a `body` that is `null` (Rich Content which hasn't been fetched via `part.fetchContent()`) or a String.
  * Any non-textual MessagePart will have a `body` that is `null` (Rich Content which hasn't been fetched via `part.fetchContent()`) or a Blob)
  * Note that these rules apply regardless of whether the MessagePart size is less than or greater than 2KB, and regardless of whether its transmitted
    as base64 data.  This means any renderer has only to test for `null` or a value to handle its content.

## 2.0.0 Beta 1

#### Major new Features

* Identities
  * Layer now supports an Identity object, represented here as a `layer.Identity` class containing a User ID, Identity ID, Display Name and an Avatar URL.
  * Message sender is now represented using an Identity Object
  * Conversation participants is now an array of Identity Objects
  * Identities can be queried to find all of the users that the authenticated user is following.
* Announcements
  * Introduces the `layer.Announcement` class
  * You can now Query for Announcements sent to your users
* Persistence
  * IndexedDB can store all Conversations, Messages, Announcements and Identities if the `layer.Client.isTrustedDevice` property is set to `true`
  * Applications can now run entirely offline, populating `layer.Query` data using IndexedDB databases.
  * `layer.Client.persistenceFeatures` gives more precise control over what is persisted

#### Minor new Features

* Deleting with `MY_DEVICES`
  * In addition to calling `conversation.delete(layer.Constants.DELETION_MODE.ALL)` and `message.delete(layer.Constants.DELETION_MODE.ALL)`, you can now delete Messages and Conversation from your user's devices Only using `layer.Constants.DELETION_MODE.MY_DEVICES`.
  * `layer.Conversation.leave()` can be called to remove yourself as a participant and remove the Conversation from your devices.
* No more `temp_layer:///` IDs, no more ID change events
  * Sending a Message will no longer result in a `messages:change` event that contains a change to the Message ID; the Message ID that is assigned when creating the Message will be accepted by the server.
  * Conversations may still get an ID change event in the case where a Distinct Conversation is created, and a matching Distinct Conversation is found on the server.
* Querys on Messages in a Conversation still syncing its data will retry until syncing is done or a full page of data is loaded.  (WEB-1053)

#### Breaking Changes

* Authentication
  * Initializing the `layer.Client` does *NOT* start Authentication any more!
  * Client initialization no longer takes a `userId` parameter, and no longer immediately begins the authentication process
  * Client initialization no longer takes a `sessionToken` parameter
  * layer.Client.connect is now called to start authentication
  * layer.Client.connectWithSession can also be used to startup the client, if you already have a Session Token.
  * layer.Client.login has been removed; see layer.Client.connect instead
* layer.Conversation
  * `participants` property is now an array of `layer.Identity` objects rather than User IDs
  * Removes support for `client.createConversation(participantArray)` shorthand; now requires `client.createConversation({participants:
   participantArray})`.
  * Creating a Conversation, adding, removing and setting participants of an existing Conversation all accept Identity IDs or Identity Objects rather than User IDs.
    * For backwards compatibility, we are continuing to accept User IDs (`UserA`).  For now.
* layer.Message
  * The `recipient_status` property is now a hash of Identity IDs, not User IDs
* layer.TypingIndicators.TypingIndicatorListener
  * The `typing-indicator-change` event now delivers arrays of Identities instead of User IDs
* layer.User has been removed.
* layer.Query no longer defaults to a Conversation model; this must be specificied explicitly.

#### Miscellaneous Changes

* Deduplication
  * If a response is not received to a request to create a Conversation or Message, it will be retried with deduplication support to insure that if it was created before, a duplicate is not created on retry.
* layer.Message
  * `layer.Message.getConversation()` now supports a boolean parameter to load from server if Conversation is not cached.
* layer.Client
  * Adds a `user` property containing a `layer.Identity` instance representing the authenticated user of this session.
* layer.OnlineStateManager: Now starts managing isOnline state as soon as `client.connect()` or `client.connectWithSession()` are called.
* layer.MessagePart
  * Where once you would have received a Blob representing text that was greater than 2K and had to be sent as Rich Content, now that blob is converted to a string before delivering it to your application
  * You can customize which Mime Types are treated as text with `layer.MessagePart.TextualMimeTypes`

#### Bug Fixes

* Caching Fixes
  * Updates Caching to uncache any Messages and Conversations that aren't part of any Query's results 10 minutes (configurable) after websocket event announces their arrival.
  * Removes Conversation.lastMessage from cache once its no longer a query result.
  * Fixes cache cleanup on deleting a Query.

## 1.0.7

* Improves logic around reconnecting websockets to validate that the session is still valid.
* Removes tests for Message `ffffffff....` which were used to validate the session is still valid.

## 1.0.6

* Query will retry when no data is detected in case the server has not yet received data for this user.

## 1.0.5

* Fixes bug in layer.Content.refreshContent where expiration is improperly set
* Fixes bug in layer.Query when `dataType` is layer.Query.ObjectDataType which fails to update data for a `messages:read` event

## 1.0.4

* Fixes parsing of Identity Token to handle URL Encoded strings

## 1.0.3

* Fixes support for Query.dataType == layer.Query.InstanceDataType in handling Message ID change events.

## 1.0.2

* Fixes support for the `sessionToken` in the constructor; broken with the introduction of the `isTrustedDevice` property. This is used as part of the [Alternate Authentication Process](https://developer.layer.com/docs/websdk#the-alternate-authentication-process).


## 1.0.1

* Adds isTrustedDevice property to layer.Client which defaults to false. If this is false, session tokens will NOT be written to localStorage, and will not be restored next time the page reloads.
  * Support for Deletion with either layer.Constants.DELETION_MODE.MY_DEVICES or .Constants.DELETION_MODE.ALL (delete for all users or just for me).  Note that deleting for just me doesn't remove me as a participant, which means that new Messages will cause the Conversation to reappear.
  * The `messages:read` event has been removed. Please use the `messages:change` event instead.

## 1.0.0

* Updated version number and language from beta to GA

## 0.9.3

* Minor bug fix to layer.Query

## 0.9.2

#### Public API Changes

* layer.Conversation
  * The `delete` method now requires a layer.Constant.DELETION_MODE argument and no longer supports Boolean arguments.
* Adds `isNew` `isSaving`, `isSynced` and `isSaved` methods; these will show up as properties when calling toObject().
* layer.Message
  * The `recipientStatus` property now returns layer.RECEIPT_STATE.PENDING for any recipient to whom the Message has not yet been sent
  * The `getImageURLs` method has been removed.
  * The `delete` method now requires a layer.Constant.DELETION_MODE argument and no longer supports Boolean arguments.
  * Adds `isNew` `isSaving`, `isSynced` and `isSaved` methods; these will show up as properties when calling toObject().
  * Removes the `isSending` property; use `isSaving` instead; `isSaving` will show up as a property for immutable objects.
* layer.MessagePart
  * The `fetchContent` method now triggers an `content-loaded-error` event if it fails to load the Content (content has expired for example, and must be refreshed)
* layer.Query
  * Now runs query as soon as client is ready (for queries created prior to Ready).
* layer.TypingIndicators.TypingListener
  * Now has a setInput method that can be used to change what input the Listener is monitoring when sending
    typing indicators to other users.
* layer.Client
  * Adds registerIOSPushToken() method for push notification support in hybrid apps
  * Adds registerAndroidPushToken() method for push notification support in hybrid apps
  * Adds unregisterPushToken() method
* layer.User
  * Flagged as a private class; it is recommended that you not use this until `v1.1` which will have Identity Management.

#### Bug Fixes

* A round of memory leak fixes

## 0.9.1

#### Bug Fixes

* layer.MessagePart now loads new Rich Content downloadUrl and expiration dates whenever Query reloads the Message.

#### Public API Changes

* layer.Query
  * The `dataType` property is now set with static properties, either layer.Query.InstanceDataType or layer.Query.ObjectDataType
  * A `paginationWindow` property larger than the maximum page size that then automatically loads multiple pages is no longer supported.  A paginationWindow larger than the maximum page size will be automatically adjusted to the maximum page size (a value of 500 will be changed to `query.data.length + 100` if its too large)
  * There is now a `totalSize` property reporting on the total number of results of the query there are on the server.
  * There is now a `size` property reporting on the total number of results of the query have been loaded from the server.
  * Previously you subscribe to `change` event and check the `evt.type` for values of `data`, `insert`, `remove`, `reset` and `property`.
    This still works, but now you can *also* choose to subscribe to `change:data`, `change:insert`, `change:remove`, `change:reset` and `change:property`.
* layer.TypingIndicators.TypingListener
  * Change to constructor parameters.  If using `client.createTypingListener` then it does not affect you
* layer.TypingIndicators.TypingPublisher
  * Change to constructor parameters.  If using `client.createTypingPublisher` then it does not affect you

#### Fixes

* Fixes issues with websocket reconnect logic

## 0.9.0 Public Beta Launch

#### Public API Changes

* layer.Client.createConversation now defaults to creating Distinct Conversations.


## 0.1.4

#### Public API Changes

* layer.Client
  * Now has an `online` event for reporting on whether it is or is not connected to the server.
  * Now clears all queries and reloads their data from the server if disconnected more than 30 hours

## 0.1.3

#### Public API Changes

* layer.Message
  * Now has an `isSending` property
  * Removes the `isLoaded` method
  * Adds the `isLoading` property
* layer.Conversation
  * Removes the `isLoaded` method
  * Adds the `isLoading` property
* layer.Client
  * Now supports a logLevel property with enhanced logging support
  * Adds `messages:notify` event which can be used to help drive desktop notifications more reliably than the `messages:add` event.

#### Fixes

* Fixes to error handling in websocket requests that timeout

## 0.1.2

#### Public API Changes

* layer.MessagePart
   * Now has a `hasContent` property
   * `loadContent()` method has been renamed to fetchContent
   * `fetchContent` now triggers a messages:change event on completion.
   * `content` property has been removed; this is now a private property
   * layer.MessagePart now has a `url` property; returns "" if url has expired.
   * `url` will be set asynchronously by calling `fetchContent()`
     This url will be to a resource cached in the browser.
   * `url` will be set asynchronously by calling `layer.MessagePart.fetchStream()`.
      This url will point to a remote resource, but this is an expiring URL.
   * The expiring url will be cleared when it has expired, requiring another
   call to fetchStream():
```
   function render(part) {}
    if (part.url) {
      return "<img src='{part.url}' />";
    } else {
      part.fetchStream(() => this.rerender());
      return "<img src='' />";
    }
  }
```
* layer.Client now provides a layer.Client.getMessagePart(id) method

#### Fixes

* Fixes to read receipts; no longer sends read receipt if already marked as read
* Fixes to Websocket reconnect logic insures that missed events are requested

## 0.1.1

#### Public API Changes

* `authenticated-expired` event has been replaced with `deauthenticated` event.
* layer.Query and layer.QueryBuilder now support a `sortBy` property which allows for sorting by `lastMessage.sentAt` or `createdAt`.
* Removes option to use XHR instead of websocket for sending messages and conversations
* `message.sendReceipt('read')` now sets the `isRead` property.
* Websocket PATCH events will load the object from the server if it isn't already cached; patch events are not emitted locally but the conversations:add/messages:add event will trigger showing the current state of the newly loaded object.
* Message.sentBy will now always have a value, even if the message is not yet sent.
* Message.isSending property has been added
* Fixes to layer.Query enable Message Queries to populate with the Conversation's lastMessage while waiting for the rest of the messages to load.
* Fixes to layer.Query now ignore any response but the most recent response (occurs when quickly changing between query predicates)


## 0.1.0

#### Public API Changes

* `client.getObject()` is now a protected method; use `client.getConversation()` or `client.getMessage()` instead
* `client.getConversation(id)` no longer loads the Conversation from the server if its not cached; `client.getConversation(id, true)` WILL load the Conversation from the server if its not cached.
* `client.getMessage(id)` no longer loads the Message from the server if its not cached; `client.getMessage(id, true)` WILL load the Message from the server if its not cached.
