/*eslint-disable */
describe("The Channel Class", function() {
    var appId = "Fred's App";

    var channel,
        userIdentity1,
        userIdentity2,
        client,
        requests;

    beforeEach(function() {
        jasmine.clock().install();
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;
        client = new layer.Client({
            appId: appId,
            url: "https://huh.com"
        });
        client.sessionToken = "sessionToken";

        client.user = new layer.Identity({
          clientId: client.appId,
          userId: "Frodo",
          id: "layer:///identities/" + "Frodo",
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
        userIdentity1 = new layer.Identity({
            clientId: client.appId,
            id: "layer:///identities/1",
            displayName: "1",
            userId: "1"
        });
        userIdentity2 = new layer.Identity({
            clientId: client.appId,
            id: "layer:///identities/2",
            displayName: "2",
            userId: "2"
        });

        client._clientAuthenticated();
        getObjectsResult = [];
        spyOn(client.dbManager, "getObjects").and.callFake(function(tableName, ids, callback) {
            setTimeout(function() {
                callback(getObjectsResult);
            }, 10);
        });
        client._clientReady();
        client.onlineManager.isOnline = true;

        channel = client._createObject(responses.channel1);
        jasmine.clock().tick(1);
        requests.reset();
        client.syncManager.queue = [];

    });

    afterEach(function() {
        client.destroy();
        jasmine.Ajax.uninstall();
        jasmine.clock().uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor() method", function() {
      it("Should register the channel", function() {
        expect(client.getChannel(channel.id)).toBe(channel);
      });
    });

    describe("The destroy() method", function() {
      /* Waiting for Spec to Complete */
      xit("Should clear the membership", function() {
            // Pretest
            var m = channel.membership;
            expect(m).not.toBe(null);

            // Run
            channel.destroy();

            // Posttest
            expect(channel.membership).toBe(null);
        });

        it("Should call _removeChannel", function() {
            // Setup
            spyOn(client, "_removeChannel");

            // Run
            channel.destroy();

            // Posttest
            expect(client._removeChannel).toHaveBeenCalledWith(channel);
        });


        it("Should fire a destroy event", function() {
            // Setup
            spyOn(channel, "trigger");

            // Run
            channel.destroy();

            // Posttest
            expect(channel.trigger).toHaveBeenCalledWith("destroy");
        });
    });

    describe("The send() method", function() {
      it("Should be chainable", function() {
          // Run
          expect(channel.send()).toBe(channel);
      });

      it("Should call client.sendSocketRequest", function() {
          // Setup
          spyOn(client, "sendSocketRequest");
          channel.syncState = layer.Constants.SYNC_STATE.NEW;

          // Run
          channel.send();

          // Posttest
          expect(client.sendSocketRequest).toHaveBeenCalledWith({
              method: 'POST',
              body: {},
              sync: {
                depends: channel.id,
                target: channel.id
              }
            }, jasmine.any(Function));
      });

      it("Should set the message position", function() {
        var message = channel.createMessage("Hello");
        expect(message.position).toBe(0);
        channel.send(message);
        expect(message.position > 0).toBe(true);
      });
    });

    describe("The _getSendData() method", function() {
      it("Should return the current state of the data in a create format", function() {
        var channel = new layer.Channel({
          client: client,
          metadata: {hey: "ho"},
          name: "Frodo is a Dodo"
        });
        expect(channel._getSendData()).toEqual({
          method: 'Channel.create',
          data: {
            members: [client.user.id],
            metadata: {hey: "ho"},
            id: channel.id,
            name: "Frodo is a Dodo"
          }
        });
      });

      it("Should return null if no metadata", function() {
        var channel = new layer.Channel({
          participants: [userIdentity1, client.user],
          client: client,
          name: "Frodo is a Dodo"
        });
        expect(channel._getSendData()).toEqual({
          method: 'Channel.create',
          data: {
            members: [client.user.id],
            id: channel.id,
            name: "Frodo is a Dodo",
            metadata: null
          }
        });
      });
    });

    describe("The _populateFromServer() method", function() {
        var channel, c;
        beforeEach(function() {
            c = JSON.parse(JSON.stringify(responses.channel2));
            channel = new layer.Channel({client: client});
            jasmine.clock().tick(1);
        });

        it("Should copy in all channel properties", function() {
            // Run
            channel._populateFromServer(c);

            // Posttest
            expect(channel.id).toEqual(c.id);
            expect(channel.url).toEqual(c.url);
            expect(channel.name).toEqual(c.name);
            expect(channel.metadata).toEqual(c.metadata);
            expect(channel.createdAt).toEqual(new Date(c.created_at));

            /* WAITING FOR SPEC TO COMPLETE
            expect(channel.membership).toEqual(jasmine.any(layer.Membership));
            expect(channel.membership).toBe(client.getMember(c.membership.id));
            */
        });

        it("Should trigger change events if not new", function() {
            // Setup
            channel.syncState = layer.Constants.SYNC_STATE.SYNCED;
            spyOn(channel, "_triggerAsync");

            // Run
            channel._populateFromServer(c);

            // Posttest
            expect(channel._triggerAsync).toHaveBeenCalledWith("channels:change", jasmine.any(Object));
        });

        it("Should trigger ID change events", function() {
            // Setup
            spyOn(channel, "_triggerAsync");
            var initialId = channel.id;

            // Run
            channel._populateFromServer(c);

            // Posttest
            expect(channel._triggerAsync)
                .toHaveBeenCalledWith('channels:change', {
                    oldValue: initialId,
                    newValue: channel.id,
                    property: 'id',
                });
        });

        it("Should trigger name change events", function() {
          // Setup
            channel.name = 'a';
            spyOn(channel, "_triggerAsync");

            // Run
            channel._populateFromServer(c);

            // Posttest
            expect(channel._triggerAsync)
                .toHaveBeenCalledWith('channels:change', {
                    oldValue: 'a',
                    newValue: c.name,
                    property: 'name',
                });

        });

        /* TODO Waiting for SPEC Complete */
        xit("Should setup membership", function() {
            // Setup
            client._membersHash = {};

            // Run
            channel._populateFromServer(c);

            // Posttest
            expect(client._membersHash[channel.membership.id]).toEqual(jasmine.any(layer.Membership));
            expect(channel.membership).toEqual(jasmine.any(layer.Membership));
        });

        /* TODO Waiting for SPEC Complete */
        xit("Should setup membership from string", function() {
            // Setup
            var mid = c.membership.id;
            client._membersHash = {};
            client._createObject(c.membership);
            c.membership = mid;

            // Run
            channel._populateFromServer(c);

            // Posttest
            expect(channel.membership).toEqual(jasmine.any(layer.Membership));
            expect(channel.membership).toBe(client._membersHash[mid]);
        });

        it("Should call client._addChannel", function() {
            // Setup
            spyOn(client, "_addChannel");

            // Run
            channel._populateFromServer(c);

            // Posttest
            expect(client._addChannel).toHaveBeenCalledWith(channel);
        });

        it("Should set isCurrentParticipant", function() {
            // Setup
            channel.isCurrentParticipant = false;

            // Run
            channel._populateFromServer(c);

            // Posttest
            expect(channel.isCurrentParticipant).toBe(true);

            // Rerun
            c.membership = null;
            channel._populateFromServer(c);
            expect(channel.isCurrentParticipant).toBe(false);
        });
    });

    /* TODO Waiting for SPEC Complete */
    xdescribe("The addMembers() method", function() {
      it("Should fire off an xhr call", function() {
        channel.addMembers(['a', 'b', 'c']);
        expect(channel._xhr).toHaveBeenCalledWith({
          url: channel.url + '/members/a',
          method: 'PUT'
        });
        expect(channel._xhr).toHaveBeenCalledWith({
          url: channel.url + '/members/b',
          method: 'PUT'
        });
        expect(channel._xhr).toHaveBeenCalledWith({
          url: channel.url + '/members/c',
          method: 'PUT'
        });
      });
    });

    /* TODO Waiting for SPEC Complete */
    xdescribe("The removeMembers() method", function() {
      it("Should fire off an xhr call", function() {
        channel.removeMembers(['a', 'b', 'c']);
        expect(channel._xhr).toHaveBeenCalledWith({
          url: channel.url + '/members/a',
          method: 'DELETE'
        });
        expect(channel._xhr).toHaveBeenCalledWith({
          url: channel.url + '/members/b',
          method: 'DELETE'
        });
        expect(channel._xhr).toHaveBeenCalledWith({
          url: channel.url + '/members/c',
          method: 'DELETE'
        });
      });
    });

    describe("The join() method", function() {
      it("Should call addMembers", function() {
        spyOn(channel, "addMembers");
        channel.join();
        expect(channel.addMembers).toHaveBeenCalledWith([client.user.id]);
      });
    });

    describe("The leave() method", function() {
      it("Should call removeMembers", function() {
        spyOn(channel, "removeMembers");
        channel.leave();
        expect(channel.removeMembers).toHaveBeenCalledWith([client.user.id]);
      });
    });

    describe("The getMember() method", function() {
      it("Should return a cached member", function() {
        var m = client._createObject(responses.membership1);
        expect(client.getMember(m.id)).toBe(m);
        expect(m.channelId).toEqual(responses.membership1.channel.id);
      });

      it("Should return an empty member that is loading", function() {
        var m = client.getMember(responses.membership1.id, true);
        expect(m).toEqual(jasmine.any(layer.Membership));
        expect(m.syncState).toEqual(layer.Constants.SYNC_STATE.LOADING);
      });
    });

    describe("The delete() method", function() {
      it("Should call _delete", function() {
        spyOn(channel, "_delete");
        channel.delete();
        expect(channel._delete).toHaveBeenCalledWith('');
      });
    });
});