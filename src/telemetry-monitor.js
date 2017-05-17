/**
 * Metrics gathering component.
 *
 * 1. Should never broadcast any personally identifiable information
 * 2. Should never broadcast any values actually sent/received by users
 * 3. It can send how long any type of operation took to perform
 * 4. It can send how many times an operation was performed
 *
 * This is currently setup to run once per hour, sending hourly updates to the server.
 *
 * @class layer.TelemetryMonitor
 * @extends layer.Root
 * @private
 */

const Root = require('./root');
const Xhr = require('./xhr');
const Util = require('./client-utils');

class TelemetryMonitor extends Root {
  /**
   * Creates a new Monitor.
   *
   * An Application is expected to only have one Monitor.
   *
   * @method constructor
   * @param {Object} options
   * @param {layer.Client} options.client
   * @param {Boolean} [options.enabled=true]   Set to false to disable telemetry reporting
   * @param {Number} [options.reportingInterval=1000 * 3600]   Defaults to 1 hour, but can be set to other intervals
   */
  constructor(options) {
    super(options);
    this.client = options.client;
    this.state = {
      id: this.id,
      records: [],
    };
    this.tempState = {};
    this.storageKey = 'layer-telemetry-' + this.client.appId;

    if (!global.localStorage) {
      this.enabled = false;
    } else {
      try {
        const oldState = localStorage[this.storageKey];
        if (!oldState) {
          localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } else {
          this.state = JSON.parse(oldState);
        }
      } catch (e) {
        this.enabled = false;
      }
    }

    this.client.on('state-change', this.trackEvent, this);
    Xhr.addConnectionListener(this.trackRestPerformance.bind(this));
    this.setupReportingInterval();
  }

  /**
   * Given a `telemetryId` and an optional `id`, and a `started` or `ended` key,
   * track performance of the given telemetry statistic.
   *
   * @method
   */
  trackEvent(evt) {
    if (!this.enabled) return;
    const eventId = `${evt.telemetryId}-${evt.id || 'noid'}`;

    if (evt.started) {
      this.tempState[eventId] = Date.now();
    } else if (evt.ended) {
      const started = this.tempState[eventId];
      if (started) {
        delete this.tempState[eventId];
        const duration = Date.now() - started;
        this.writePerformance(evt.telemetryId, duration);
      }
    }
  }

  /**
   * Clear out any requests that were never completed.
   *
   * Currently we only track an id and a start time, so we don't know much about these events.
   *
   * @method clearEvents
   */
  clearEvents() {
    const now = Date.now();
    Object.keys(this.tempState).forEach((key) => {
      if (this.tempState[key] + this.reportingInterval < now) delete this.tempState[key];
    });
  }

  /**
   * Any xhr request that was called with a `telemetry` key contains metrics to be logged.
   *
   * The `telemetry` object should contain `name` and `duration` keys
   *
   * @method
   */
  trackRestPerformance(evt) {
    if (this.enabled && evt.request.telemetry) {
      this.writePerformance(evt.request.telemetry.name, evt.duration);
    }
  }

  /**
   * When writing performance, there are three inputs used:
   *
   * 1. The name of the metric being tracked
   * 2. The duration it took for the operation
   * 3. The current time (this is not a function input, but is still a dependency)
   *
   * Results of writing performance are to increment count, and total time for the operation.
   *
   * @method
   */
  writePerformance(name, timing) {
    const performance = this.getCurrentStateObject().performance;
    if (!performance[name]) {
      performance[name] = {
        count: 0,
        time: 0,
        max: 0,
      };
    }
    performance[name].count++;
    performance[name].time += timing;
    if (timing > performance[name].max) performance[name].max = timing;
    this.writeState();
  }

  /**
   * When writing usage, we are simply incrementing the usage counter for the metric.
   *
   * @method
   */
  writeUsage(name) {
    const usage = this.getCurrentStateObject().usage;
    if (!usage[name]) usage[name] = 0;
    usage[name]++;
    this.writeState();
  }

  /**
   * Grab some environmental data to attach to the report.
   *
   * note that environmental data may change from hour to hour,
   * so we regather this information for each record we send to the server.
   *
   * @method
   */
  getEnvironment() {
    const environment = {
      platform: 'web',
      locale: (navigator.language || '').replace(/-/g, '_'), // should match the en_us format that mobile devices are using rather than the much nicer en-us
      layer_sdk_version: this.client.constructor.version,
      domain: location.hostname,
    };

    // This event allows other libraries to add information to the environment object; specifically: Layer UI
    this.trigger('telemetry-environment', {
      environment
    });
    return environment;
  }

  /**
   * Grab some device data to attach to the report.
   *
   * note that device data may change from hour to hour,
   * so we regather this information for each record we send to the server.
   *
   * @method
   */
  getDevice() {
    return {
      user_agent: navigator.userAgent,
      screen: {
        width: typeof screen === undefined ? 0 : screen.width,
        height: typeof screen === undefined ? 0 : screen.height,
      },
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };
  }

  /**
   * Return the state object used to track performance for the current time slot
   *
   * @method
   */
  getCurrentStateObject(doNotCreate) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const currentDate = new Date(today);

    const now = Date.now();

    // If the reporting interval is less than 24 hours, iterate until we find the current time slice within our day
    if (this.reportingInterval < 60 * 60 * 1000 * 24) {
      while (currentDate.getTime() < now) {
        currentDate.setMilliseconds(currentDate.getMilliseconds() + this.reportingInterval);
      }
    }

    const currentStart = currentDate.toISOString();
    const currentEndDate = new Date(currentDate);
    currentEndDate.setMilliseconds(currentEndDate.getMilliseconds() + this.reportingInterval);
    let todayObj = this.state.records.filter(set => set.period.start === currentStart)[0];

    if (!todayObj && !doNotCreate) {
      todayObj = {
        period: {
          start: currentStart,
          end: currentEndDate.toISOString(),
        },
        environment: this.getEnvironment(),
        device: this.getDevice(),
        usage: {},
        performance: {},
        errors: {},
      };
      this.state.records.push(todayObj);
    }

    return todayObj;
  }

  /**
   * Write state to localStorage.
   *
   * Writing the state is an expensive operation that should be done less often,
   * and containing more changes rather than done immediatley and repeated with each change.
   *
   * @method
   */
  writeState() {
    if (this.enabled && !this._writeTimeoutId) {
      this._writeTimeoutId = setTimeout(() => {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        this._writeTimeoutId = 0;
      }, 1000);
    }
  }

  /**
   * Given a time slot's data, convert its data to what the server expects.
   *
   * @method
   */
  convertRecord(record) {
    const result = {
      period: record.period,
      device: record.device,
      environment: record.environment,
      usage: record.usage,
      performance: {},
    };

    Object.keys(record.performance).forEach((performanceKey) => {
      const item = record.performance[performanceKey];
      result.performance[performanceKey] = {
        max: Math.round(item.max),
        count: item.count,
        mean: Math.round(item.time / item.count), // convert to mean in miliseconds from total time in nanoseconds
      };
    });
    return result;
  }

  /**
   * Send data to the server; do not send any data from the current hour.
   *
   * Remove any data successfully sent from our records.
   *
   * @method
   */
  sendData() {
    const doNotSendCurrentRecord = this.getCurrentStateObject(true);
    const records = this.state.records
      .filter(record => record !== doNotSendCurrentRecord);
    if (records.length) {
      Xhr({
        sync: false,
        method: 'POST',
        url: this.telemetryUrl,
        headers: {
          'content-type': 'application/json'
        },
        data: {
          id: Util.uuid(this.state.id),
          layer_app_id: this.client.appId,
          records: records.map(record => this.convertRecord(record)),
        },
      }, (result) => {
        if (result.success) {
          // Remove any records that were sent from our state
          this.state.records = this.state.records.filter((record) => {
            return records.indexOf(record) === -1;
          });
          this.writeState();
        }
      });
    }
    this.clearEvents();
  }

  /**
   * Periodicalily call sendData to send updates to the server.
   *
   * @method
   */
  setupReportingInterval() {
    if (this.enabled) {
      // Send any stale data
      this.sendData();
      this._intervalId = setInterval(this.sendData.bind(this), this.reportingInterval);
    }
  }

  /**
   * If the enabled property is set, automatically clear or start the interval.
   *
   * ```
   * telemetryMonitor.enabled = false;
   * ```
   *
   * The above code will stop the telemetryMonitor from sending data.
   *
   * @method
   */
  __updateEnabled() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = 0;
    }
    if (this.enabled) this.setupReportingInterval();
  }
}

/**
 * The URL to `POST` telemetry data to.
 *
 * @property {String}
 */
TelemetryMonitor.prototype.telemetryUrl = 'https://telemetry.layer.com';

/**
 * ID for the `window.setInterval` operation
 *
 * @property {Number}
 */
TelemetryMonitor.prototype._intervalId = 0;

/**
 * The reporting interval controls how frequently the module tries to report on usage data.
 *
 * It also is used to determine how to segment data into time slices.
 *
 * Value should not excede 1 day.
 *
 * @property {Number} [reportingInterval=3,600,000]  Number of miliseconds between submitting usage reports; defaults to once per hour
 */
TelemetryMonitor.prototype.reportingInterval = 1000 * 60 * 60;

/**
 * To avoid performance issues, we only write changes asynchronously; this timeoutId tracks that this has been scheduled.
 *
 * @property {Number}
 */
TelemetryMonitor.prototype._writeTimeoutId = 0;

/**
 * Constructor sets this to be the key within localStorage for accessing the cached telemetry data.
 *
 * @property {String}
 */
TelemetryMonitor.prototype.storageKey = '';

/**
 * Current state object.
 *
 * Initialized with data from localStorage, and any changes to it are written
 * back to localStorage.
 *
 * Sending records causes them to be removed from the state.
 *
 * @property {Object}
 */
TelemetryMonitor.prototype.state = null;

/**
 * Cache of in-progress performance events.
 *
 * Each key has a value representing a timestamp.  Events are removed once they are completed.
 *
 * @property {Object}
 */
TelemetryMonitor.prototype.tempState = null;

/**
 * Telemetry defaults to enabled, but can be disabled by setting this to `false`
 *
 * @property {Boolean}
 */
TelemetryMonitor.prototype.enabled = true;

/**
 * Pointer to the layer.Client
 *
 * @property {layer.Client}
 */
TelemetryMonitor.prototype.client = null;

/**
 * The presence of this causes layer.Root to automatically generate an id if one isn't present.
 *
 * This id is written to localStorage so that it can persist across sessions.
 *
 * @static
 * @property {String}
 */
TelemetryMonitor.prefixUUID = 'layer:///telemetry/';

TelemetryMonitor._supportedEvents = Root._supportedEvents.concat([
  'telemetry-environment'
]);

Root.initClass.apply(TelemetryMonitor, [TelemetryMonitor, 'TelemetryMonitor']);
module.exports = TelemetryMonitor;
