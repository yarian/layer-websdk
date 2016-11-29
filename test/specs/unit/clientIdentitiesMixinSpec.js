/*eslint-disable */
// TODO: All tests should be run with both isTrustedDevice = true and false
describe("The Client Identities Mixin", function() {
    var appId = "Fred's App";
    var userId = "93c83ec4-b508-4a60-8550-099f9c42ec1a";
    var identityToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImN0eSI6ImxheWVyLWVpdDt2PTEiLCJraWQiOiIyOWUzN2ZhZS02MDdlLTExZTQtYTQ2OS00MTBiMDAwMDAyZjgifQ.eyJpc3MiOiI4YmY1MTQ2MC02MDY5LTExZTQtODhkYi00MTBiMDAwMDAwZTYiLCJwcm4iOiI5M2M4M2VjNC1iNTA4LTRhNjAtODU1MC0wOTlmOWM0MmVjMWEiLCJpYXQiOjE0MTcwMjU0NTQsImV4cCI6MTQxODIzNTA1NCwibmNlIjoiRFZPVFZzcDk0ZU9lNUNzZDdmaWVlWFBvUXB3RDl5SjRpQ0EvVHJSMUVJT25BSEdTcE5Mcno0Yk9YbEN2VDVkWVdEdy9zU1EreVBkZmEydVlBekgrNmc9PSJ9.LlylqnfgK5nhn6KEsitJMsjfayvAJUfAb33wuoCaNChsiRXRtT4Ws_mYHlgwofVGIXKYrRf4be9Cw1qBKNmrxr0er5a8fxIN92kbL-DlRAAg32clfZ_MxOfblze0DHszvjWBrI7F-cqs3irRi5NbrSQxeLZIiGQdBCn8Qn5Zv9s";
    var cid1 = "layer:///conversations/test1",
        cid2 = "layer:///conversations/test2",
        cid3 = "layer:///conversations/test3",
        url1 = "https://huh.com/conversations/test1",
        url2 = "https://huh.com/conversations/test2",
        url3 = "https://huh.com/conversations/test3";
    var client, requests, userIdentity, userIdentity2;

    beforeEach(function() {
        jasmine.clock().install();
        jasmine.Ajax.install();
        requests = jasmine.Ajax.requests;
        jasmine.addCustomEqualityTester(mostRecentEqualityTest);
        jasmine.addCustomEqualityTester(responseTest);

        client = new layer.Client({
            appId: appId,
            url: "https://huh.com"
        });
        client.sessionToken = "sessionToken";

        client.user = userIdentity = new layer.Identity({
            clientId: client.appId,
            id: "layer:///identities/Frodo",
            displayName: "Frodo",
            userId: "Frodo"
        });
        userIdentity2 = new layer.Identity({
            clientId: client.appId,
            id: "layer:///identities/1",
            displayName: "UserIdentity",
            userId: '1'
        });

          client.isTrustedDevice = true;
          delete client._identitiesHash['layer:///identities/Frodo'];
          client.user = new layer.Identity({
              userId: client.userId,
              displayName: "Frodo2",
              syncState: layer.Constants.SYNC_STATE.LOADING,
              clientId: client.appId,

          });

          client._clientAuthenticated();
          spyOn(client.dbManager, "getObjects").and.callFake(function(tableName, ids, callback) {
              callback([]);
          });
          spyOn(client.dbManager, "getObject").and.callFake(function(tableName, ids, callback) {
              callback(null);
          });
          client._clientReady();
    });

    afterEach(function() {
        client.destroy();
        jasmine.clock().uninstall();
        jasmine.Ajax.uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor() method", function() {
      it("Should initialize _identitiesHash", function() {
        var identityHash = {};
        identityHash[client.user.id] = client.user;
        identityHash[userIdentity2.id] = userIdentity2;
        expect(client._identitiesHash).toEqual(identityHash);
      });
    });

    describe("The cleanup() method", function() {
      afterEach(function() {
          client._channelsHash = client._messagesHash = client._conversationsHash = client._queriesHash = client._identitiesHash = {};
      });

      it("Should destroy all Identities", function() {
        // Setup
        var userIdentity4 = new layer.Identity({
            clientId: client.appId,
            id: "layer:///identities/2",
            displayName: "userIdentity4"
        });
        client._identitiesHash[userIdentity.id] = userIdentity;

        // Run
        client._cleanup();

        // Posttest
        expect(userIdentity.isDestroyed).toBe(true);
        expect(client._identitiesHash).toBe(null);
      });
    });

    describe("The getIdentity() method", function() {
      var userIdentity3;
      beforeEach(function() {
          userIdentity3 = new layer.Identity({
              clientId: client.appId,
              id: "layer:///identities/2",
              displayName: "userIdentity3"
          });
          client._identitiesHash = {
              "layer:///identities/1": userIdentity2,
              "layer:///identities/2": userIdentity3
          };


      });

      it("Should get the user by ID", function() {
          expect(client.getIdentity(userIdentity2.id)).toBe(userIdentity2);
      });

      it("Should get the user by UserID", function() {
          expect(client.getIdentity(userIdentity2.userId)).toBe(userIdentity2);
      });

      it("Should get the userIdentity3 by ID", function() {
          expect(client.getIdentity(userIdentity3.id)).toBe(userIdentity3);
      });

      it("Should load the identity if canLoad was used", function() {
          var identity = client.getIdentity('222', true);
          expect(requests.mostRecent().url).toEqual(client.url + '/identities/222');
          expect(identity.syncState).toEqual(layer.Constants.SYNC_STATE.LOADING);
      });
  });

  describe("The _addIdentity() method", function() {
      it("Should not add a UserIdentity that already exists", function() {
          // Setup
          client._identitiesHash = {};
          client._identitiesHash[userIdentity.id] = userIdentity;
          userIdentity2.id = userIdentity.id;
          expect(userIdentity).not.toBe(userIdentity2);

          // Run
          client._addIdentity(userIdentity2);

          // Posttest
          var endHash = {};
          endHash[userIdentity.id] = userIdentity;
          expect(client._identitiesHash).toEqual(endHash);
      });

      it("Should add a UserIdentity and trigger identities:add", function() {
          // Setup
          client._identitiesHash = {};
          spyOn(client, "_triggerAsync");

          // Run
          client._addIdentity(userIdentity);

          // Posttest
          var endHash = {};
          endHash[userIdentity.id] = userIdentity;
          expect(client._identitiesHash).toEqual(endHash);
          expect(client._triggerAsync).toHaveBeenCalledWith('identities:add', {identities: [userIdentity]});
      });

      it("Should not add an Identity only a display_name", function() {
          // Setup
          client._identitiesHash = {};
          userIdentity  = new layer.Identity({
              client: client,
              fromServer: {
                  display_name: "Fred"
              }
          });

          // Run
          client._addIdentity(userIdentity);

          // Posttest
          expect(client._identitiesHash).toEqual({});
      });

  });

  describe("The _removeIdentity() method", function() {
      var userIdentity4;
      beforeEach(function() {
          userIdentity4 = new layer.Identity({
              clientId: client.appId,
              id: "layer:///identities/2",
              displayName: "userIdentity4"
          });
          client._identitiesHash = {};
          client._identitiesHash[userIdentity.id] = userIdentity;
          client._identitiesHash[userIdentity4.id] = userIdentity4;
      });

      it("Should ignore irrelevant ID prefixes", function() {
          expect(function() {
              client._removeIdentity(new layer.Identity({
                  id: "layer:///mountains/2",
                  clientId: client.appId
              }));
          }).not.toThrow();
      });

      it("Should ignore IDS not cached", function() {
          client._removeIdentity(new layer.Identity({
              id: "layer:///identities/fooled-you",
              clientId: client.appId
          }));
          client._removeIdentity(new layer.Identity({
              id: "layer:///identities/fooled-you",
              clientId: client.appId
          }));

          // Posttest
          var endTest = {};
          endTest[userIdentity.id] = userIdentity;
          endTest[userIdentity4.id] = userIdentity4;
          expect(client._identitiesHash).toEqual(endTest);
      });

      it("Should remove UserIdentity and trigger identities:remove", function() {
          spyOn(client, "_triggerAsync");
          client._removeIdentity(userIdentity);
          var endTest = {};
          endTest[userIdentity4.id] = userIdentity4;
          expect(client._identitiesHash).toEqual(endTest);
          expect(client._triggerAsync).toHaveBeenCalledWith('identities:remove', {identities: [userIdentity]});
      });
  });


    describe("The followIdentity() method", function() {
        it("Should call follow() on an existing Identity", function() {
            client._identitiesHash[userIdentity.id] = userIdentity;
            spyOn(userIdentity, "follow");

            // Run
            var result1 = client.followIdentity(userIdentity.userId);
            var result2 = client.followIdentity(userIdentity.id);

            // Posttest
            expect(userIdentity.follow.calls.count()).toEqual(2);
            expect(result1).toBe(userIdentity);
            expect(result2).toBe(userIdentity);
        });

        it("Should call follow() on a new Identity", function() {
            var tmp = layer.Identity.prototype.follow;
            spyOn(layer.Identity.prototype, "follow");

            // Run
            var result1 = client.followIdentity("1");

            // Posttest
            expect(layer.Identity.prototype.follow.calls.count()).toEqual(1);
            expect(result1.id).toEqual("layer:///identities/1");
        });
    });

    describe("The unfollowIdentity() method", function() {
        it("Should call unfollow() on an existing Identity", function() {
            client._identitiesHash[userIdentity.id] = userIdentity;
            spyOn(userIdentity, "unfollow");

            // Run
            var result1 = client.unfollowIdentity(userIdentity.userId);
            var result2 = client.unfollowIdentity(userIdentity.id);

            // Posttest
            expect(userIdentity.unfollow.calls.count()).toEqual(2);
            expect(result1).toBe(userIdentity);
            expect(result2).toBe(userIdentity);
        });

        it("Should call unfollow() on a new Identity", function() {
            var tmp = layer.Identity.prototype.unfollow;
            spyOn(layer.Identity.prototype, "unfollow");

            // Run
            var result1 = client.unfollowIdentity("1");

            // Posttest
            expect(layer.Identity.prototype.unfollow.calls.count()).toEqual(1);
            expect(result1.id).toEqual("layer:///identities/1");
        });

    });
});
