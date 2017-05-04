/**
 * Execute this function immediately after current processing is complete (setImmediate replacement).
 *
 * A depth of up to 10 is allowed.  That means that functions you schedule using defer
 * can in turn schedule further actions.  The original actions are depth = 0; the actions scheduled
 * by your actions are depth = 1.  These new actions may in turn schedule further actions, which happen at depth = 3.
 * But to avoid infinite loops, if depth reaches 10, it clears the queue and ignores them.
 *
 * @method defer
 * @param {Function} f
 */
const setImmediate = global.getNativeSupport && global.getNativeSupport('setImmediate');
if (setImmediate) {
  module.exports = setImmediate;
} else {
  let setImmediateId = 0,
    setImmediateDepth = 0,

    // Have we scheduled the queue to be processed? If not, this is false
    setImmediateIsPending = false,

    // Queue of functions to call and depth integers
    setImmediateQueue = [];

  // If a setImmediate callback itself calls setImmediate which in turn calls setImmediate, at what point do we suspect we have an infinite loop?
  // A depth of 10 is currently considered OK, but this may need to be increased.
  const setImmediateMaxDepth = 10;

  // Process all callbacks in the setImmediateQueue
  function setImmediateProcessor() {
    // Processing the queue is no longer scheduled; clear any scheduling info.
    setImmediateIsPending = false;
    clearTimeout(setImmediateId);
    setImmediateId = 0;

    // Our initial depth is depth 0
    setImmediateDepth = 0;
    setImmediateQueue.push(setImmediateDepth);

    // Process all functions and depths in the queue starting always with the item at index 0,
    // and removing them from the queue before processing them.
    while (setImmediateQueue.length) {
      const item = setImmediateQueue.shift();
      if (typeof item === 'function') {
        try {
          item();
        } catch (err) {
          console.error(err);
        }
      } else if (item >= setImmediateMaxDepth) {
        setImmediateQueue = [];
        console.error('Layer Error: setImmediate Max Queue Depth Exceded');
      }
    }
  }
  // Schedule the function to be called by adding it to the queue, and setting up scheduling if its needed.
  module.exports = function defer(func) {
    if (typeof func !== 'function') throw new Error('Function expected in defer');

    setImmediateQueue.push(func);

    // If postMessage has not already been called, call it
    if (!setImmediateIsPending) {
      setImmediateIsPending = true;
      if (typeof document !== 'undefined') {
        window.postMessage({ type: 'layer-set-immediate' }, '*');
      } else {
        // React Native reportedly lacks a document, and throws errors on the second parameter
        window.postMessage({ type: 'layer-set-immediate' });
      }

      // Having seen scenarios where postMessage failed to trigger, set a backup using setTimeout that will be canceled
      // if postMessage is succesfully called.
      setImmediateId = setTimeout(setImmediateProcessor, 0);
    }
  };

  // For Unit Testing
  module.exports.flush = () => setImmediateProcessor();
  module.exports.reset = () => { setImmediateQueue = []; };

  addEventListener('message', (event) => {
    if (event.data.type !== 'layer-set-immediate') return;
    setImmediateProcessor();
  });
}
