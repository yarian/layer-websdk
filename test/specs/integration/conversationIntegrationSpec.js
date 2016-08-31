/*eslint-disable */
describe("Conversation Integration Tests", function() {
    var socket, client, syncManager, request;
    var appId = "Fred's App";
    var userId = "Frodo";

    beforeEach(function() {
        jasmine.clock().install();
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;
        client = new layer.Client({
            appId: appId,
            url: "https://huh.com",
            isTrustedDevice: false
        });
        client.sessionToken = "sessionToken";
        client.user = {userId: userId};

        client._clientAuthenticated();
        conversation = client._createObject(JSON.parse(JSON.stringify(responses.conversation1)));

        syncManager = new layer.SyncManager({
            client: client,
            onlineManager: client.onlineManager,
            socketManager: client.socketManager,
            requestManager: client.socketRequestManager
        });
        client.onlineManager.isOnline = true;
        client.socketManager._socket = {
            send: function() {},
            addEventListener: function() {},
            removeEventListener: function() {},
            close: function() {},
            readyState: WebSocket.OPEN
        };

        request = new layer.XHRSyncEvent({
            method: "POST",
            data: {hey: "ho"},
            target: "fred",
            callback: function() {}
        });

        jasmine.clock().tick(1);
        requests.reset();
        syncManager.queue = [request];
        client.syncManager.queue = [];
        client._clientReady();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });


    it("Should reload participants on error and refire a conversations:change event", function() {
      syncManager.queue = [];

      // Run replaceParticipant and have it fail
      conversation.replaceParticipants([client.user.userId, "6"]);
      requests.mostRecent().response({
        status: 500,
        data: {}
      });

      // Run Conversation.load
      spyOn(conversation, "_triggerAsync");
      requests.mostRecent().response({
        status: 200,
        responseText: JSON.stringify(responses.conversation1)
      });


      // Posttest
      expect(conversation._triggerAsync).toHaveBeenCalledWith("conversations:change", jasmine.objectContaining({
        oldValue: [client.user.userId, "6"],
        newValue: client._fixIdentities(responses.conversation1.participants),
        property: "participants"
      }));
    });

    it("Should reload metadata on error and refire a conversations:change event", function() {
      var initialMetadata = JSON.parse(JSON.stringify(responses.conversation1.metadata));
      initialMetadata.hey = "ho";

      // Run setMetadataProperties and have it fail
      conversation.setMetadataProperties({hey: "ho"});
      requests.mostRecent().response({
        status: 500,
        data: {}
      });

      // Run Conversation.load
      spyOn(conversation, "_triggerAsync");
      requests.mostRecent().response({
        status: 200,
        responseText: JSON.stringify(responses.conversation1)
      });


      // Posttest
      expect(conversation._triggerAsync).toHaveBeenCalledWith("conversations:change", jasmine.objectContaining({
        oldValue: initialMetadata,
        newValue: responses.conversation1.metadata,
        property: "metadata"
      }));
    });

});