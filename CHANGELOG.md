# Web SDK Change Log

## 3.0.0

* Queries on Messages where the server reports that the server is still syncing no longer fires `server-syncing-state` events, and no longer
  changes `isFiring` to `false` between polling the server to see if its done.  Instead it keeps `isFiring` as `true` and fire no events and
  provides no results _until_ the server has completed and provided some data.
* Fixes to persisting the Session Token if `isTrustedDevice` is `true`
* Fixes for React Native community around `window.postMessage()` usage.
* Apps using `Component.on(a, b, obj)` can have `obj._layerEventSubscriptions` so that `obj` can find all of the components it needs to unsubscribe from to be garbage collected.
* FileReader access now prefixed by `window` to support oddly configured server based tests
* Fixes issue where data persisted after it was rejected by the server
* No longer writes data to separate databases for each user; now uses a single database and wipes all data from prior user on logging in as new user.

## 3.0.0 Beta 1

* Identities
  * Layer now supports an Identity object, represented here as a `layer.Identity` class containing a User ID, Identity ID, Display Name and an Avatar URL.
  * Message sender is now represented using an Identity Object
  * Conversation participants is now an array of Identity Objects
  * Identities can be queried to find all of the users that the authenticated user is following.
  * layer.Client.user is now an Identity representing the authenticated user
  * Queries and Persistence now support Identities
* Persistence
  * Optimizations and fewer errors logged for IndexedDB write operations
  * Fixes handling of Private windows for Safari and Firefox
  * Fixes handling of downgrading to older WebSDK version
* Logging: Now uses correct console operation
* layer.Conversation
  * Now throws errors when trying to create a Conversation while not authenticated
