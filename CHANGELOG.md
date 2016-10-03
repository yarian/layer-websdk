# Web SDK Change Log

## 3.0.0 Beta 2

* Queries on Messages where the server reports that the server is still syncing no longer fires `server-syncing-state` events, and no longer
  changes `isFiring` to `false` between polling the server to see if its done.  Instead it keeps `isFiring` as `true` and fire no events and
  provides no results _until_ the server has completed and provided some data.
* Fixes to persisting the Session Token if `isTrustedDevice` is `true`

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