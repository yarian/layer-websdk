# Web SDK Change Log

## 3.0.0 Beta 1

* Identities
  * Layer now supports an Identity object, represented here as a `layer.Identity` class containing a User ID, Identity ID, Display Name and an Avatar URL.
  * Message sender is now represented using an Identity Object
  * Conversation participants is now an array of Identity Objects
  * Identities can be queried to find all of the users that the authenticated user is following.
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

