/**
 * @class layer.Logger
 * @private
 *
 */
const { DEBUG, INFO, WARN, ERROR, NONE } = require('./const').LOG;
const { isEmpty } = require('./client-utils');

// Pretty arbitrary test that IE/edge fails and others don't.  Yes I could do a more direct
// test for IE/edge but its hoped that MS will fix this around the time they cleanup their internal console object.
const supportsConsoleFormatting = Boolean(console.assert && console.assert.toString().match(/assert/));
const LayerCss = 'color: #888; font-weight: bold;';
const Black = 'color: black';
/* istanbulify ignore next */
class Logger {
  log(msg, obj, type, color) {
    /* istanbul ignore else */
    if (typeof msg === 'string') {
      const timestamp = new Date().toLocaleTimeString();
      if (supportsConsoleFormatting) {
        console.log(`%cLayer%c ${type}%c [${timestamp}]: ${msg}`, LayerCss, `color: ${color}`, Black);
      } else {
        console.log(`Layer ${type} [${timestamp}]: ${msg}`);
      }
    } else {
      this._logObj(msg, type, color);
    }
    if (obj) this._logObj(obj, type, color);
  }
  _logObj(obj, type, color) {
    /* istanbul ignore next */
    if (!obj || isEmpty(obj)) return;
    /* istanbul ignore next */
    if (obj.constructor.name === 'Object') {
      if (supportsConsoleFormatting) {
        console.log(`%cLayer%c ${type}%c: ${JSON.stringify(obj, null, 4)}`, LayerCss, `color: ${color}`, Black);
      } else {
        console.log(`Layer ${type}: ${JSON.stringify(obj, null, 4)}`);
      }
    } else {
      if (supportsConsoleFormatting) {
        console.log(`%cLayer%c ${type}%c: %O`, LayerCss, `color: ${color}`, Black, obj);
      } else {
        console.log(`Layer ${type}:`, obj);
      }
    }
  }

  debug(msg, obj) {
    /* istanbul ignore next */
    if (this.level >= DEBUG) this.log(msg, obj, 'DEBUG', '#888');
  }

  info(msg, obj) {
    /* istanbul ignore next */
    if (this.level >= INFO) this.log(msg, obj, 'INFO', 'black');
  }

  warn(msg, obj) {
    /* istanbul ignore next */
    if (this.level >= WARN) this.log(msg, obj, 'WARN', 'orange');
  }

  error(msg, obj) {
    /* istanbul ignore next */
    if (this.level >= ERROR) this.log(msg, obj, 'ERROR', 'red');
  }
}

/* istanbul ignore next */
Logger.prototype.level = typeof jasmine === 'undefined' ? ERROR : NONE;

const logger = new Logger();

module.exports = logger;
