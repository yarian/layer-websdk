const TypingPublisher = require('./typing-publisher');
const {STARTED, PAUSED, FINISHED} = require('./typing-indicators');

/**
 * The Typing Listener Class listens to keyboard events on
 * your text field, and uses the layer.TypingPublisher to
 * send state based on keyboard behavior.
 *
 *      var typingListener = client.createTypingListener(document.getElementById('mytextarea'));
 *
 *  You change what Conversation
 *  the typing indicator reports your user to be typing
 *  in by calling:
 *
 *      typingListener.setConversation(mySelectedConversation);
 *
 * There are two ways of cleaning up all pointers to your input so it can be garbage collected:
 *
 * 1. Destroy the listener:
 *
 *        typingListener.destroy();
 *
 * 2. Remove or replace the input:
 *
 *        typingListener.setInput(null);
 *        typingListener.setInput(newInput);
 *
 * @class  layer.TypingIndicators.TypingListener
 */
class TypingListener {

  /**
   * Create a TypingListener that listens for the user's typing.
   *
   * The TypingListener needs
   * to know what Conversation the user is typing into... but it does not require that parameter during initialization.
   *
   * @method constructor
   * @param  {Object} args
   * @param {string} args.clientId - The ID of the client; used so that the TypingPublisher can access its websocket manager*
   * @param {HTMLElement} [args.input=null] - A Text editor dom node that will have typing indicators
   * @param {Object} [args.conversation=null] - The Conversation Object or Instance that the input will send messages to
   */
  constructor(args) {
    this.clientId = args.clientId;
    this.conversation = args.conversation;
    this.publisher = new TypingPublisher({
      clientId: this.clientId,
      conversation: this.conversation,
    });

    this.intervalId = 0;
    this.lastKeyId = 0;

    this._handleKeyPress = this._handleKeyPress.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
    this.setInput(args.input);
  }

  destroy() {
    this._removeInput(this.input);
    this.publisher.destroy();
  }

  /**
   * Change the input being tracked by your TypingListener.
   *
   * If you are removing your input from the DOM, you can simply call
   *
   *     typingListener.setInput(null);
   *
   * And all event handlers will be removed, allowing for garbage collection
   * to cleanup your input.
   *
   * You can also call setInput with a newly created input:
   *
   *     var input = document.createElement('input');
   *     typingListener.setInput(input);
   *
   * @method setInput
   * @param {HTMLElement} input - Textarea or text input
   */
  setInput(input) {
    if (input !== this.input) {
      this._removeInput(this.input);
      this.input = input;

      // Use keypress rather than keydown because the user hitting alt-tab to change
      // windows, and other meta keys should not result in typing indicators
      this.input.addEventListener('keypress', this._handleKeyPress);
      this.input.addEventListener('keydown', this._handleKeyDown);
    }
  }

  /**
   * Cleanup and remove all links and callbacks keeping input from being garbage collected.
   *
   * @method _removeInput
   * @private
   * @param {HTMLElement} input - Textarea or text input
   */
  _removeInput(input) {
    if (input) {
      input.removeEventListener('keypress', this._handleKeyPress);
      input.removeEventListener('keydown', this._handleKeyDown);
      this.input = null;
    }
  }

  /**
   * Change the Conversation; this should set the state of the old Conversation to "finished".
   *
   * Use this when the user has changed Conversations and you want to report on typing to a new
   * Conversation.
   *
   * @method setConversation
   * @param  {Object} conv - The new Conversation Object or Instance
   */
  setConversation(conv) {
    if (conv !== this.conversation) {
      this.conversation = conv;
      this.publisher.setConversation(conv);
    }
  }


  /**
   * Whenever the key is pressed, send a "started" or "finished" event.
   *
   * If its a "start" event, schedule a pause-test that will send
   * a "pause" event if typing stops.
   *
   * @method _handleKeyPress
   * @private
   * @param  {KeyboardEvent} evt
   */
  _handleKeyPress(evt) {
    if (this.lastKeyId) window.clearTimeout(this.lastKeyId);
    this.lastKeyId = window.setTimeout(() => {
      this.lastKeyId = 0;
      const isEmpty = !Boolean(this.input.value);
      this.send(isEmpty ? FINISHED : STARTED);
    }, 50);
  }

  /**
   * Handles keyboard keys not reported by on by keypress events.
   *
   * These keys can be detected with keyDown event handlers. The ones
   * currently handled here are backspace, delete and enter.
   * We may add more later.
   *
   * @method _handleKeyDown
   * @private
   * @param  {KeyboardEvent} evt
   */
  _handleKeyDown(evt) {
    if ([8, 46, 13].indexOf(evt.keyCode) !== -1) this._handleKeyPress();
  }

  /**
   * Send the state to the publisher.
   *
   * If your application requires
   * you to directly control the state, you can call this method;
   * however, as long as you use this TypingListener, keyboard
   * events will overwrite any state changes you send.
   *
   * Common use case for this: After a message is sent, you want to clear any typing indicators:
   *
   *      function send() {
   *        message.send();
   *        typingIndicators.send(layer.TypingIndicators.FINISHED);
   *      }
   *
   * @method send
   * @param  {string} state - One of "started", "paused", "finished"
   */
  send(state) {
    this.publisher.setState(state);
  }
}

module.exports = TypingListener;
