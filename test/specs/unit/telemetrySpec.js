/* eslint-disable */
describe("The TelemetryMonitor class", function() {
    var appId = "Fred's App";

    var client, monitor;
    var today;
    beforeEach(function() {
        jasmine.clock().install();
        jasmine.Ajax.install();
        today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        jasmine.clock().mockDate(today);

        requests = jasmine.Ajax.requests;
        client = new layer.Client({
            appId: appId,
            reset: true,
            url: "https://doh.com"
        });
        client.userId = "999";

        client.user = new layer.Identity({
          clientId: client.appId,
          userId: client.userId,
          id: "layer:///identities/" + client.userId,
          firstName: "first",
          lastName: "last",
          phoneNumber: "phone",
          emailAddress: "email",
          metadata: {},
          publicKey: "public",
          avatarUrl: "avatar",
          displayName: "display",
          syncState: layer.Constants.SYNC_STATE.SYNCED,
          isFullIdentity: true,
          sessionOwner: true
        });


        client._clientAuthenticated();
        client._clientReady();
        client.onlineManager.isOnline = true;
        monitor = client.telemetryMonitor;

        requests.reset();
        jasmine.clock().tick(1);
        client._clientReady();
    });
    afterEach(function() {
        if (client.telemetryMonitor._writeTimeoutId) clearTimeout(client.telemetryMonitor._writeTimeoutId);
        localStorage.removeItem(client.telemetryMonitor.storageKey);
        if (client && !client.isDestroyed) client.destroy();
        jasmine.Ajax.uninstall();
        jasmine.clock().uninstall();
    });

    describe("The constructor() method", function() {
      it("Should initialize state, tempState and storageKey", function() {
        expect(client.telemetryMonitor.state.id).toMatch(/^layer:\/\/\/telemetry\/.+$/);
        expect(client.telemetryMonitor.state.records).toEqual([]);
        expect(client.telemetryMonitor.tempState).toEqual({});
      });

      it("Should received enabled true/false", function() {
        var c = new layer.Client({
          appId: appId,
          telemetryEnabled: false
        });
        expect(c.telemetryMonitor.enabled).toBe(false);

        var c = new layer.Client({
          appId: appId,
          telemetryEnabled: true
        });
        expect(c.telemetryMonitor.enabled).toBe(true);
      });

      it("Should listen for state-change events", function() {
        expect(client._events['state-change'][0].context).toBe(monitor);
        expect(client._events['state-change'][0].callback).toBe(monitor.trackEvent);
      });

      it("Should listen for xhr events", function() {
        spyOn(monitor, "writePerformance");
        client.xhr({
          method: "POST",
          url: "/",
          telemetry: {
            name: 'test_time'
          }
        });

        today.setUTCMilliseconds(2000);
        jasmine.clock().mockDate(today);
        requests.mostRecent().response({
          status: 200
        });

        expect(monitor.writePerformance.calls.argsFor(0)[0]).toEqual('test_time');
        expect([1999, 2000].indexOf(monitor.writePerformance.calls.argsFor(0)[1])).not.toEqual(-1);
      });

      it("Should setup a setInterval poll", function() {
        expect(monitor._intervalId).not.toEqual(0);
      });
    });

    describe("The trackEvent() method", function() {
      it("Should call writePerformance only once after a started and then ended event", function() {
        // Setup
        spyOn(monitor, "writePerformance");

        // Run 1
        monitor.trackEvent({
          telemetryId: "fred",
          started: true
        });
        expect(monitor.writePerformance).not.toHaveBeenCalled();

        // Run 2
        today.setUTCMilliseconds(today.getUTCMilliseconds() + 251);
        jasmine.clock().mockDate(today);
        monitor.trackEvent({
          telemetryId: "fred",
          ended: true
        });
        expect(monitor.writePerformance.calls.argsFor(0)[0]).toEqual("fred");
        expect([250,251].indexOf(monitor.writePerformance.calls.argsFor(0)[1])).not.toEqual(-1);
        monitor.writePerformance.calls.reset();

        // Run 3
        monitor.trackEvent({
          telemetryId: "fred",
          ended: true
        });
        today.setUTCMilliseconds(today.getUTCMilliseconds() + 251);
        jasmine.clock().mockDate(today);
        monitor.trackEvent({
          telemetryId: "fred",
          ended: true
        });
        expect(monitor.writePerformance).not.toHaveBeenCalled();
      });

      it("Should not call writePerformance if not enabled", function() {
        // Setup
        spyOn(monitor, "writePerformance");
        monitor.enabled = false;

        // Run 1
        monitor.trackEvent({
          telemetryId: "fred",
          started: true
        });
        today.setUTCMilliseconds(today.getUTCMilliseconds() + 251);
        jasmine.clock().mockDate(today);
        monitor.trackEvent({
          telemetryId: "fred",
          ended: true
        });
        expect(monitor.writePerformance).not.toHaveBeenCalled();
      });

      it("Should only match up like telemetry ids and like ids", function() {
        // Setup
        spyOn(monitor, "writePerformance");

        // Run 1
        monitor.trackEvent({
          telemetryId: "fred",
          id: "a",
          started: true
        });
        expect(monitor.writePerformance).not.toHaveBeenCalled();

        // Run 2
        today.setUTCMilliseconds(today.getUTCMilliseconds() + 251);
        jasmine.clock().mockDate(today);
        monitor.trackEvent({
          telemetryId: "freddy",
          id: "a",
          ended: true
        });
        expect(monitor.writePerformance).not.toHaveBeenCalled();

        monitor.trackEvent({
          telemetryId: "fred",
          id: "a",
          ended: true
        });
        expect(monitor.writePerformance).toHaveBeenCalled();
      });
    });

    describe("The clearEvents() method", function() {
      it("Should reset any older pending events", function() {
        // Setup
        spyOn(monitor, "writePerformance");

        // Run 1
        monitor.trackEvent({
          telemetryId: "fred",
          started: true
        });
        monitor.clearEvents();

        today.setUTCMilliseconds(today.getUTCMilliseconds() + 251);
        jasmine.clock().mockDate(today);
        monitor.trackEvent({
          telemetryId: "fred",
          ended: true
        });
        expect([250,251].indexOf(monitor.writePerformance.calls.argsFor(0)[1])).not.toEqual(-1);
        monitor.writePerformance.calls.reset();

        // Run 2
        monitor.trackEvent({
          telemetryId: "fred",
          started: true
        });
        today.setUTCMilliseconds(today.getUTCMilliseconds() + 251 + monitor.reportingInterval);
        jasmine.clock().mockDate(today);

        monitor.clearEvents();

        jasmine.clock().mockDate(today);
        monitor.trackEvent({
          telemetryId: "fred",
          ended: true
        });
        expect(monitor.writePerformance).not.toHaveBeenCalled();
      });
    });

    describe("The trackRestPerformance() method", function() {
      it("Should call writePerformance on any xhr request that has a telemetry object", function() {

        spyOn(monitor, "writePerformance");
        client.xhr({
          method: "POST",
          url: "/",
          telemetry: {
            name: 'test_time'
          }
        });

        today.setUTCMilliseconds(today.getUTCMilliseconds() + 100);
        jasmine.clock().mockDate(today);
        requests.mostRecent().response({
          status: 200
        });

        expect(monitor.writePerformance.calls.argsFor(0)[0]).toEqual('test_time');
        expect([99, 100].indexOf(monitor.writePerformance.calls.argsFor(0)[1])).not.toEqual(-1);
      });

      it("Should ignore xhr requests that lack a telemetry object", function() {
        spyOn(monitor, "writePerformance");
        client.xhr({
          method: "POST",
          url: "/",
        });

        today.setUTCMilliseconds(today.getUTCMilliseconds() + 100);
        jasmine.clock().mockDate(today);
        requests.mostRecent().response({
          status: 200
        });

        expect(monitor.writePerformance).not.toHaveBeenCalled();
      });

      it("Should ignore xhr requests if not enabled", function() {
        monitor.enabled = false;
        spyOn(monitor, "writePerformance");
        client.xhr({
          method: "POST",
          url: "/",
          telemetry: {
            name: 'test_time'
          }
        });

        today.setUTCMilliseconds(today.getUTCMilliseconds() + 100);
        jasmine.clock().mockDate(today);
        requests.mostRecent().response({
          status: 200
        });

        expect(monitor.writePerformance).not.toHaveBeenCalled();
      });
    });

    describe("The writePerformance() method", function() {
      it("Should create a new subhash with suitable values", function() {
        expect(monitor.getCurrentStateObject().performance["hey"]).toBe(undefined);
        monitor.writePerformance("hey", 55);
        expect(monitor.getCurrentStateObject().performance["hey"]).toEqual({
          count: 1,
          time: 55,
          max: 55
        });
      });

      it("Should update a subhash with suitable values", function() {
        monitor.writePerformance("hey", 55);
        monitor.writePerformance("hey", 55);
        expect(monitor.getCurrentStateObject().performance["hey"]).toEqual({
          count: 2,
          time: 110,
          max: 55
        });
      });

      it("Should update max at the appropriate time", function() {
        monitor.writePerformance("hey", 55);

        // Test 1
        monitor.writePerformance("hey", 20);
        expect(monitor.getCurrentStateObject().performance["hey"]).toEqual({
          count: 2,
          time: 75,
          max: 55
        });

        // Test 2
        monitor.writePerformance("hey", 200);
        expect(monitor.getCurrentStateObject().performance["hey"]).toEqual({
          count: 3,
          time: 275,
          max: 200
        });
      });

      it("Should call writeState on any changes", function() {
        spyOn(monitor, "writeState");
        monitor.writePerformance("hey", 55);
        expect(monitor.writeState).toHaveBeenCalledWith();
      });
    });

    describe("The writeUsage() method", function() {
      it("Should insert a usage property if its new", function(){
        expect(monitor.getCurrentStateObject().usage["howdy"]).toBe(undefined);
        monitor.writeUsage("howdy");
        expect(monitor.getCurrentStateObject().usage["howdy"]).toEqual(1);
      });

      it("Should increment a usage property if it exists", function() {
        monitor.writeUsage("howdy");
        monitor.writeUsage("howdy");
        monitor.writeUsage("howdy");
        expect(monitor.getCurrentStateObject().usage["howdy"]).toEqual(3);
      });

      it("Should call writeState for any changes", function() {
        spyOn(monitor, "writeState");

        // Test 1: set a usage
        monitor.writeUsage("howdy");
        expect(monitor.writeState).toHaveBeenCalled();
        monitor.writeState.calls.reset();

        // Test 2: increment a usage
        monitor.writeUsage("howdy");
        expect(monitor.writeState).toHaveBeenCalled();
      });
    });

    describe("The getEnvironment() method", function() {
      it("Should have some values", function() {
        expect(monitor.getEnvironment().platform).toEqual(jasmine.any(String));
        expect(monitor.getEnvironment().platform).toEqual(jasmine.any(String));
        expect(monitor.getEnvironment().layer_sdk_version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(monitor.getEnvironment().platform).toEqual(jasmine.any(String));
      });

      it("Should allow values to be modified", function() {
        monitor.on('telemetry-environment', function(evt) {
          evt.environment.frodo = "is a dodo";
        });
        expect(monitor.getEnvironment().frodo).toEqual("is a dodo");
      });
    });

    describe("The getDevice() method", function() {
      it("Should return a screen", function() {
        expect(monitor.getDevice().screen).toEqual({
          width: screen.width,
          height: screen.height
        });
      });

      it("Should return a window", function() {
        expect(monitor.getDevice().window).toEqual({
          width: window.innerWidth,
          height: window.innerHeight
        });
      });

      it("Should return a user-agent", function() {
        expect(monitor.getDevice().user_agent).toEqual(jasmine.any(String));
      });
    });

    describe("The getCurrentStateObject() method", function() {
      it("Should create new objects for each hour", function() {
        monitor.reportingInterval = 3600 * 1000; // 1 hour
        var today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        today.setUTCFullYear(2010, 10, 10);
        jasmine.clock().mockDate(today);
        monitor.writeUsage("hey");
        monitor.writeUsage("hey");
        var current = monitor.getCurrentStateObject();
        expect(current.usage).toEqual({hey: 2});
        expect(current.period).toEqual({start: "2010-11-10T00:00:00.000Z", end: "2010-11-10T01:00:00.000Z"});

        today.setUTCHours(2);
        jasmine.clock().mockDate(today);

        current = monitor.getCurrentStateObject();
        expect(current.usage).toEqual({});
        expect(current.period).toEqual({start: "2010-11-10T02:00:00.000Z", end: "2010-11-10T03:00:00.000Z"});

        monitor.writeUsage("hey");
        monitor.writeUsage("ho");
        current = monitor.getCurrentStateObject();
        expect(current.period).toEqual({start: "2010-11-10T02:00:00.000Z", end: "2010-11-10T03:00:00.000Z"});
        expect(current.usage).toEqual({hey: 1, ho: 1});

        var todayOffset = new Date(today);
        todayOffset.setUTCHours(2,10);
        jasmine.clock().mockDate(today);
        current = monitor.getCurrentStateObject();
        expect(current.usage).toEqual({hey: 1, ho: 1});
        expect(current.period).toEqual({start: "2010-11-10T02:00:00.000Z", end: "2010-11-10T03:00:00.000Z"});

        today.setUTCHours(3, 0);
        jasmine.clock().mockDate(today);
        current = monitor.getCurrentStateObject();
        expect(current.period).toEqual({start: "2010-11-10T03:00:00.000Z", end: "2010-11-10T04:00:00.000Z"});
        expect(current.usage).toEqual({});
      });

      it("Should create new objects for each day", function() {
        monitor.reportingInterval = 3600 * 1000 * 24; // 1 day
        var today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        today.setUTCFullYear(2010, 10, 10);

        jasmine.clock().mockDate(today);
        monitor.writeUsage("hey");
        monitor.writeUsage("hey");
        var current = monitor.getCurrentStateObject();
        expect(current.usage).toEqual({hey: 2});
        expect(current.period).toEqual({start: "2010-11-10T00:00:00.000Z", end: "2010-11-11T00:00:00.000Z"});

        today.setUTCHours(2);
        jasmine.clock().mockDate(today);
        current = monitor.getCurrentStateObject();
        expect(current.usage).toEqual({hey: 2});
        expect(current.period).toEqual({start: "2010-11-10T00:00:00.000Z", end: "2010-11-11T00:00:00.000Z"});

        today.setDate(today.getDate() + 1);
        jasmine.clock().mockDate(today);
        current = monitor.getCurrentStateObject();
        expect(current.usage).toEqual({});
        expect(current.period).toEqual({start: "2010-11-11T00:00:00.000Z", end: "2010-11-12T00:00:00.000Z"});

        monitor.writeUsage("hey");
        monitor.writeUsage("ho");
        expect(monitor.getCurrentStateObject().usage).toEqual({hey: 1, ho: 1});

        today.setUTCHours(5);
        jasmine.clock().mockDate(today);
        current = monitor.getCurrentStateObject();
        expect(current.usage).toEqual({hey: 1, ho: 1});
        expect(current.period).toEqual({start: "2010-11-11T00:00:00.000Z", end: "2010-11-12T00:00:00.000Z"});
      });
    });

    describe("The writeState() method", function() {
      beforeEach(function() {
        monitor.getCurrentStateObject().usage = {hey: 1, ho: 10};
        localStorage.removeItem(monitor.storageKey);
      });

      it("Should schedule writing", function() {
        expect(monitor._writeTimeoutId).toEqual(0);
        monitor.writeState();
        expect(monitor._writeTimeoutId).not.toEqual(0);
        today.setUTCMilliseconds(today.getUTCMilliseconds() + 10000);
        jasmine.clock().mockDate(today);
        jasmine.clock().tick(10000);
        expect(JSON.parse(localStorage[monitor.storageKey]).records[0].usage).toEqual({hey: 1, ho: 10});
      });

      // Dont have a test for do nothing but can test writing latest values
      it("Should do nothing if already scheduled and still write latest values", function() {
        monitor.writeState();
        monitor.getCurrentStateObject().usage = {hey: 1, ho: 100};
        today.setUTCMilliseconds(today.getUTCMilliseconds() + 10000);
        jasmine.clock().mockDate(today);
        jasmine.clock().tick(10000);
        expect(JSON.parse(localStorage[monitor.storageKey]).records[0].usage).toEqual({hey: 1, ho: 100});
      });

      it("Should perform the write and clear the schedule indicator", function() {
        monitor.writeState();
        today.setUTCMilliseconds(today.getUTCMilliseconds() + 10000);
        jasmine.clock().mockDate(today);
        jasmine.clock().tick(10000);
        expect(monitor._writeTimeoutId).toEqual(0);
      });
    });

    describe("The convertRecord() method", function() {
      var state;
      beforeEach(function() {
        state = monitor.getCurrentStateObject();
        state.performance.test1 = {max: 55, time: 100, count: 5};
      });

      it("Should return a new object rather than modify existing object", function() {
        expect(monitor.convertRecord(state)).not.toBe(state);
        expect(monitor.convertRecord(state).performance.test1).not.toBe(state.performance.test1);
      });

      it("Should send max mean and count", function() {
        expect(monitor.convertRecord(state).performance.test1).toEqual({max: 55, mean: 20, count: 5});
      });

      it("Should contain all other keys unchanged", function() {
        expect(monitor.convertRecord(state).device).toEqual(state.device);
        expect(monitor.convertRecord(state).environment).toEqual(state.environment);
        expect(monitor.convertRecord(state).period.start).toEqual(state.period.start);
      });
    });

    describe("The sendData() method", function() {
      beforeEach(function() {
        monitor.reportingInterval = 3600 * 1000; // 1 hour
        var today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        jasmine.clock().mockDate(today);
        monitor.writeUsage("hey");
        monitor.writeUsage("hey");
        expect(monitor.getCurrentStateObject().usage).toEqual({hey: 2});

        today.setUTCHours(2);
        jasmine.clock().mockDate(today);
        expect(monitor.getCurrentStateObject().usage).toEqual({});

        monitor.writeUsage("hey");
        monitor.writeUsage("ho");
        expect(monitor.getCurrentStateObject().usage).toEqual({hey: 1, ho: 1});

        today.setUTCHours(4);
        jasmine.clock().mockDate(today);
        monitor.writeUsage("ho");
        monitor.writeUsage("ho");
      });

      it("Should call convertRecord on all records except the current record", function() {
        expect(monitor.state.records.length).toEqual(3);
        spyOn(monitor, "convertRecord");
        monitor.sendData();

        expect(monitor.convertRecord).toHaveBeenCalledWith(monitor.state.records[0]);
        expect(monitor.convertRecord).toHaveBeenCalledWith(monitor.state.records[1]);
        expect(monitor.convertRecord).not.toHaveBeenCalledWith(monitor.state.records[2]);
      });

      it("Should send all records except for the current record", function() {
        monitor.sendData();
        expect(requests.mostRecent().url).toEqual(monitor.telemetryUrl);
        expect(monitor.telemetryUrl).toEqual(jasmine.any(String));
        expect(requests.mostRecent().method).toEqual("POST");
        expect(JSON.parse(requests.mostRecent().params)).toEqual({
          id: layer.Util.uuid(monitor.id),
          layer_app_id: client.appId,
          records: [
            monitor.convertRecord(monitor.state.records[0]),
            monitor.convertRecord(monitor.state.records[1])
          ]
        });
      });

      it("Should delete records that are sent if successful", function() {
        spyOn(monitor, "writeState");
        monitor.sendData();
        expect(monitor.writeState).not.toHaveBeenCalled();

        requests.mostRecent().response({status: 401});
        expect(monitor.state.records.length).toEqual(3);
        expect(monitor.writeState).not.toHaveBeenCalled();


        monitor.sendData();
        requests.mostRecent().response({status: 201});
        expect(monitor.state.records[0]).toBe(monitor.getCurrentStateObject());
        expect(monitor.state.records.length).toEqual(1);
        expect(monitor.writeState).toHaveBeenCalled();
      });

      it("Should call clearEvents", function() {
        spyOn(monitor, "clearEvents");
        monitor.sendData();
        expect(monitor.clearEvents).toHaveBeenCalled();
      });
    });

    describe("The setupReportingInterval() method", function() {
      it("Should schedule sendData for reportingInterval", function() {
        // Setup
        clearInterval(monitor._intervalId);
        monitor._intervalId = 0;
        spyOn(monitor, "sendData");

        // Run
        monitor.setupReportingInterval();
        expect(monitor._intervalId).not.toEqual(0);

        // Midtest
        expect(monitor.sendData).toHaveBeenCalled();
        monitor.sendData.calls.reset();

        // Posttest
        today.setUTCMilliseconds(today.getUTCMilliseconds() + monitor.reportingInterval + 1000);
        jasmine.clock().mockDate(today);
        jasmine.clock().tick(monitor.reportingInterval + 1000);
        expect(monitor.sendData).toHaveBeenCalled();
      });

      it("Should do nothing if not enabled", function() {
        monitor.enabled = false;
        // Setup
        clearInterval(monitor._intervalId);
        monitor._intervalId = 0;
        spyOn(monitor, "sendData");

        // Run
        monitor.setupReportingInterval();
        expect(monitor._intervalId).toEqual(0);

        // Midtest
        expect(monitor.sendData).not.toHaveBeenCalled();
        monitor.sendData.calls.reset();

        // Posttest
        today.setUTCMilliseconds(today.getUTCMilliseconds() + monitor.reportingInterval + 1000);
        jasmine.clock().mockDate(today);
        expect(monitor.sendData).not.toHaveBeenCalled();
      });
    });

    describe("The __updateEnabled() method", function() {
      it("Should clear the interval if false", function() {
        spyOn(monitor, "sendData");
        expect(monitor._intervalId).not.toEqual(0);

        // Test
        monitor.enabled = false;
        expect(monitor._intervalId).toEqual(0);
        today.setUTCMilliseconds(today.getUTCMilliseconds() + monitor.reportingInterval + 1000);
        jasmine.clock().mockDate(today);
        expect(monitor.sendData).not.toHaveBeenCalled();
      });

      it("Should start the interval if true", function() {
        monitor.enabled = false;
        spyOn(monitor, "sendData");
        expect(monitor._intervalId).toEqual(0);

        // Test
        monitor.enabled = true;
        expect(monitor._intervalId).not.toEqual(0);
        today.setUTCMilliseconds(today.getUTCMilliseconds() + monitor.reportingInterval + 1000);
        jasmine.clock().mockDate(today);
        jasmine.clock().tick(monitor.reportingInterval + 1000);
        expect(monitor.sendData).toHaveBeenCalled();
      });
    });
});