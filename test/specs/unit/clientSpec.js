/*eslint-disable */
// TODO: All tests should be run with both isTrustedDevice = true and false
describe("The Client class", function() {
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
        client.isReady = true;
    });

    afterEach(function() {
        jasmine.clock().uninstall();
        jasmine.Ajax.uninstall();
    });

    afterAll(function() {
        layer.Client.destroyAllClients();
    });

    describe("The constructor() method", function() {
        it("Should register the Client", function() {
            var client = new layer.Client({
                appId: "Samunwise",
                url: "https://huh.com"
            });
            expect(layer.Client.getClient("Samunwise")).toBe(client);
        });

        it("Should initialize all caches", function() {
            expect(client._scheduleCheckAndPurgeCacheItems).toEqual([]);
        });


        it("Should call _initComponents", function() {
            expect(client.syncManager).toEqual(jasmine.any(layer.SyncManager));
        });

        it("Should call _connectionRestored on receiving an online event", function() {
            var _connectionRestored =  layer.Client.prototype._connectionRestored;
            spyOn(layer.Client.prototype, "_connectionRestored");
            var client = new layer.Client({
                appId: "Samunwise",
                url: "https://huh.com"
            });
            expect(client._connectionRestored).not.toHaveBeenCalled();

            // Run
            client.trigger("online");

            // Posttest
            expect(client._connectionRestored).toHaveBeenCalled();

            // Restore
            layer.Client.prototype._connectionRestored = _connectionRestored;
        });
    });

    describe("The _initComponents() method", function() {
        it("Should setup the TypingListenerIndicator", function() {
            client._initComponents();
            expect(client._typingIndicators).toEqual(jasmine.any(layer.Root));
        });

        xit("Should have a test for plugins", function() {

        });
    });


    describe("The destroy() method", function() {
        afterEach(function() {
            client = null;
        });
        it("Should call _cleanup", function() {
            spyOn(client, "_cleanup");
            client.destroy();
            expect(client._cleanup).toHaveBeenCalledWith();
        });

        it("Should call _destroyComponents", function() {
            spyOn(client, "_destroyComponents");
            client.destroy();
            expect(client._destroyComponents).toHaveBeenCalledWith();
        });

        it("Should unregister the client", function() {
            var appId = client.appId;
            expect(layer.Client.getClient(appId)).toBe(client);
            client.destroy();
            expect(layer.Client.getClient(appId)).toBe(null);
        });
    });

    describe("Methods that require clientReady", function() {
        beforeEach(function() {
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

        describe("The _cleanup() method", function() {
            afterEach(function() {
                client._channelsHash = client._messagesHash = client._conversationsHash = client._queriesHash = client._identitiesHash = {};
            });

            it("Should close the websocket", function() {
                spyOn(client.socketManager, "close");
                client._cleanup();
                expect(client.socketManager.close).toHaveBeenCalled();
            });

            it("Should do nothing if destroyed", function() {
                client.isDestroyed = true;
                client._cleanup();
                expect(client._conversationsHash).toEqual({});
                client.isDestroyed = false;
            });
        });



        describe("The getMessagePart() method", function() {
            var conversation;
            var message;
            beforeEach(function() {
                conversation = client.createConversation({ participants: ["a"] });
                message = new layer.Message({
                    client: client,
                    fromServer: responses.message1,
                });
            });

            it("Should get by id", function() {
                expect(client.getMessagePart(responses.message1.parts[1].id)).toBe(message.parts[1]);
            });

            it("Should fail by id", function() {
                expect(client.getMessagePart(responses.message1.parts[1].id + "1")).toBe(null);
            });
        });


        describe("The _fixIdentities() method", function() {
            it("Should return identities by userId", function() {
               expect(client._fixIdentities([userIdentity2.userId])).toEqual([userIdentity2]);
            });

            it("Should return identities by Identity ID", function() {
               expect(client._fixIdentities([userIdentity2.id])).toEqual([userIdentity2]);
            });

            it("Should return identities by identity instance", function() {
               expect(client._fixIdentities([userIdentity2])).toEqual([userIdentity2]);
            });

            it("Should return identities by identity object", function() {
               expect(client._fixIdentities([userIdentity2.toObject()])).toEqual([userIdentity2]);
            });

            it("Should return identities by server object", function() {
               expect(client._fixIdentities([{user_id: userIdentity2.userId, id: userIdentity2.id, display_name: userIdentity2.displayName}])).toEqual([userIdentity2]);
            });
        });


        describe("The _purgeMessagesByPosition() method", function() {
            var m1, m2, m3, m4, conversation;

            beforeEach(function() {
                    conversation = client.createConversation({ participants: ["a"] });
                    var c2 = client.createConversation({ participants: ["b"] });
                    m1 = conversation.createMessage("hello").send();
                    m2 = conversation.createMessage("hello").send();
                    m3 = conversation.createMessage("hello").send();
                    m4 = c2.createMessage("hello").send();

                    m1.position = 5;
                    m2.position = 6;
                    m3.position = 7;
                    m4.position = 1;
                    client._purgeMessagesByPosition(conversation.id, 6);
                });

            it("Should remove messages in the Conversation", function() {
                expect(m1.isDestroyed).toBe(true);
                expect(m2.isDestroyed).toBe(true);
            });

            it("Should leave messages not in the Conversation", function() {
                expect(m3.isDestroyed).toBe(false);
            });

            it("Should leave messages whose position is greater than fromPosition", function() {
                expect(m4.isDestroyed).toBe(false);
            });
        });

        describe("The _getObject() method", function() {
            var message, announcement, conversation, query, userIdentity, serviceIdentity;
            beforeEach(function() {
                client._clientReady();
                conversation = client.createConversation({ participants: ["a"] });
                message = conversation.createMessage("hey").send();
                announcement = new layer.Announcement({
                    client: client,
                    parts: "Hey Ho"
                });
                client._addMessage(announcement);
                query = client.createQuery({
                    model: "Conversation"
                });
                userIdentity = client._createObject(JSON.parse(JSON.stringify(responses.useridentity)));
                serviceIdentity = client._createObject({
                    id: "layer:///identities/2",
                    user_id: "2",
                    display_name: "ServiceIdentity"
                });
            });

            // This test validates our inital state before running tests,
            // and is not a unit test.
            it("Should have suitable initial states", function() {
                var cHash = {},
                    mHash = {},
                    qHash = {},
                    identHash = {};
                cHash[conversation.id] = conversation;
                mHash[message.id] = message;
                mHash[announcement.id] = announcement;
                qHash[query.id] = query;
                identHash[userIdentity.id] = userIdentity;
                identHash[client.user.id] = client.user;
                identHash['layer:///identities/a'] = client.getIdentity('a');
                identHash[responses.useridentity.id] = client.getIdentity(responses.useridentity.id);
                identHash[userIdentity2.id] = userIdentity2;
                identHash[serviceIdentity.id] = serviceIdentity;

                expect(client._conversationsHash).toEqual(cHash);
                expect(client._messagesHash).toEqual(mHash);
                expect(client._queriesHash).toEqual(qHash);
                expect(client._identitiesHash).toEqual(identHash);
            });

            it("Should get a Conversation", function() {
                expect(client._getObject(conversation.id)).toBe(conversation);
            });

            it("Should not get a Conversation", function() {
                expect(client._getObject(conversation.id + "a")).toBe(null);
            });

            it("Should get a Message", function() {
                expect(client._getObject(message.id)).toBe(message);
            });

            it("Should not get a Message", function() {
                expect(client._getObject(message.id + "a")).toBe(null);
            });

            it("Should get an Announcement", function() {
                expect(client._getObject(announcement.id)).toBe(announcement);
            });

            it("Should not get an Announcement", function() {
                expect(client._getObject(announcement.id + "a")).toBe(null);
            });

            it("Should get a Query", function() {
                expect(client._getObject(query.id)).toBe(query);
            });

            it("Should not get a Query", function() {
                expect(client._getObject(query.id + "a")).toBe(null);
            });

            it("Should get a UserIdentity", function() {
                expect(client._getObject(userIdentity.id)).toBe(userIdentity);
            });

            it("Should not get a UserIdentity", function() {
                expect(client._getObject(userIdentity.id + "a")).toBe(null);
            });

            it("Should get a ServiceIdentity", function() {
                expect(client._getObject(serviceIdentity.id)).toBe(serviceIdentity);
            });

            it("Should not get a ServiceIdentity", function() {
                expect(client._getObject(serviceIdentity.id + "a")).toBe(null);
            });

            it("Should not get a non-layer-object", function() {
                expect(client._getObject("Hey")).toBe(null);
            });
        });

        describe("The _createObject() method", function() {
            it("Should call _populateFromServer if found", function() {
            // Setup
            var m = client.createConversation({ participants: ["a"]}).createMessage("a").send({ });
            spyOn(m, "_populateFromServer");

            // Pretest
            expect(client.getMessage(m.id)).toBe(m);

            // Run
            var result = client._createObject(m.toObject());

            // Posttest
            expect(result).toBe(m);
            expect(m._populateFromServer).toHaveBeenCalledWith(m.toObject());
            });

            it("Should call Message._createFromServer", function() {
                // Setup
                var tmp = layer.Message._createFromServer;
                var m = client.createConversation({ participants: ["a"]}).createMessage("a").send();
                spyOn(layer.Message, "_createFromServer").and.returnValue(m);
                var messageObj = JSON.parse(JSON.stringify(responses.message1));

                // Run
                var message = client._createObject(messageObj);

                // Posttest
                expect(message).toBe(m);
                expect(layer.Message._createFromServer).toHaveBeenCalledWith(messageObj, client);

                // Restore
                layer.Message._createFromServer = tmp;
            });

            it("Should call Announcement._createFromServer", function() {
                // Setup
                var tmp = layer.Announcement._createFromServer;
                var announcement = new layer.Announcement({
                client: client,
                fromServer: JSON.parse(JSON.stringify(responses.announcement))
                });
                delete client._messagesHash[announcement.id];
                spyOn(layer.Announcement, "_createFromServer").and.returnValue(announcement);
                var messageObj = JSON.parse(JSON.stringify(responses.announcement));

                // Run
                var message = client._createObject(messageObj);

                // Posttest
                expect(message).toBe(announcement);
                expect(layer.Announcement._createFromServer).toHaveBeenCalledWith(messageObj, client);

                // Restore
                layer.Announcement._createFromServer = tmp;
            });

            it("Should call Conversation._createFromServer", function() {
                // Setup
                var tmp = layer.Conversation._createFromServer;
                var c = new layer.Conversation({
                    client: client
                });
                spyOn(layer.Conversation, "_createFromServer").and.returnValue(c);
                var conversationObj = JSON.parse(JSON.stringify(responses.conversation1));

                // Run
                var conversation = client._createObject(conversationObj);

                // Posttest
                expect(conversation).toBe(c);
                expect(layer.Conversation._createFromServer).toHaveBeenCalledWith(conversationObj, client);

                // Restore
                layer.Conversation._createFromServer = tmp;
            });

            it("Should call Identity._createFromServer", function() {
                // Setup
                var tmp = layer.Identity._createFromServer;
                var identity = new layer.Identity({
                    id: responses.useridentity.id,
                    clientId: client.appId
                });
                spyOn(layer.Identity, "_createFromServer").and.returnValue(identity);
                var identityObj = JSON.parse(JSON.stringify(responses.useridentity));
                delete client._identitiesHash[identity.id];

                // Run
                var identity2 = client._createObject(identityObj);

                // Posttest
                expect(identity2).toBe(identity);
                expect(layer.Identity._createFromServer).toHaveBeenCalledWith(identityObj, client);

                // Restore
                layer.Identity._createFromServer = tmp;
            });

            it("Should call ServiceIdentity._createFromServer", function() {
                // Setup
                var tmp = layer.Identity._createFromServer;
                var identity = new layer.Identity({
                    id: layer.Identity.prefixUUID + '/dohbot',
                    clientId: client.appId
                });
                spyOn(layer.Identity, "_createFromServer").and.returnValue(identity);
                var identityObj = {
                    displayName: "dohbot",
                    id: "layer:///identities/dohbot"
                };

                // Run
                var identity2 = client._createObject(identityObj);

                // Posttest
                expect(identity2).toBe(identity);
                expect(layer.Identity._createFromServer).toHaveBeenCalledWith(identityObj, client);

                // Restore
                layer.Identity._createFromServer = tmp;
            });
        });

        describe("The _processDelayedTriggers() method", function() {

            it("Should call _foldEvents on all conversations:add events", function() {
                // Setup
                var c1 = new layer.Conversation({
                    client: client
                });
                var c2 = new layer.Conversation({
                    client: client
                });
                client._delayedTriggers = [];
                client._triggerAsync("conversations:a", {value: "a"});
                client._triggerAsync("conversations:b", {value: "b"});
                client._triggerAsync("conversations:add", {conversations: [c1]});
                client._triggerAsync("conversations:add", {conversations: [c2]});
                client._triggerAsync("conversations:c", {value: "c"});
                spyOn(client, "_foldEvents");

                // Run
                client._processDelayedTriggers();

                // Posttest
                expect(client._foldEvents)
                    .toHaveBeenCalledWith([
                        ["conversations:add", jasmine.objectContaining({
                            conversations: [c1]
                        })],
                        ["conversations:add", jasmine.objectContaining({
                            conversations: [c2]
                        })]
                    ], "conversations", client);
            });

            it("Should call _foldEvents on all conversations:remove events", function() {
                // Setup
                var c1 = new layer.Conversation({
                    client: client
                });
                var c2 = new layer.Conversation({
                    client: client
                });
                client._triggerAsync("conversations:a", {value: "a"});
                client._triggerAsync("conversations:b", {value: "b"});
                client._triggerAsync("conversations:remove", {conversations: [c1]});
                client._triggerAsync("conversations:remove", {conversations: [c2]});
                client._triggerAsync("conversations:c", {value: "c"});
                spyOn(client, "_foldEvents");

                // Run
                client._processDelayedTriggers();

                // Posttest
                expect(client._foldEvents)
                    .toHaveBeenCalledWith([
                        ["conversations:remove", jasmine.objectContaining({
                            conversations: [c1]
                        })],
                        ["conversations:remove", jasmine.objectContaining({
                            conversations: [c2]
                        })]
                    ], "conversations", client);
            });

            it("Should call _foldEvents on all messages:add events", function() {
                // Setup
                var c1 = client.createConversation({ participants: ["a"] });
                var m1 = new layer.Message({clientId: client.appId, parts: "a"});
                var m2 = new layer.Message({clientId: client.appId, parts: "b"});
                client._delayedTriggers = [];
                client._triggerAsync("messages:a", {value: "a"});
                client._triggerAsync("messages:b", {value: "b"});
                client._triggerAsync("messages:add", {messages: [m1]});
                client._triggerAsync("messages:add", {messages: [m2]});
                client._triggerAsync("messages:c", {value: "c"});
                spyOn(client, "_foldEvents");

                // Run
                client._processDelayedTriggers();

                // Posttest
                expect(client._foldEvents)
                    .toHaveBeenCalledWith([
                        ["messages:add", jasmine.objectContaining({
                            messages: [m1]
                        })],
                        ["messages:add", jasmine.objectContaining({
                            messages: [m2]
                        })]
                    ], "messages", client);
            });

            it("Should call _foldEvents on all messages:remove events", function() {
                // Setup
                var c1 = client.createConversation({ participants: ["a"] });
                var m1 = new layer.Message({clientId: client.appId, parts: "a"});
                var m2 = new layer.Message({clientId: client.appId, parts: "b"});
                client._delayedTriggers = [];
                client._triggerAsync("messages:a", {value: "a"});
                client._triggerAsync("messages:b", {value: "b"});
                client._triggerAsync("messages:remove", {messages: [m1]});
                client._triggerAsync("messages:remove", {messages: [m2]});
                client._triggerAsync("messages:c", {value: "c"});
                spyOn(client, "_foldEvents");

                // Run
                client._processDelayedTriggers();

                // Posttest
                expect(client._foldEvents)
                    .toHaveBeenCalledWith([
                        ["messages:remove", jasmine.objectContaining({
                            messages: [m1]
                        })],
                        ["messages:remove", jasmine.objectContaining({
                            messages: [m2]
                        })]
                    ], "messages", client);
            });

            it("Should call _foldEvents on all identities:add events", function() {
                // Setup
                var i1 = new layer.Identity({clientId: client.appId, userId: "a", id: "layer:///identities/a"});
                var i2 = new layer.Identity({clientId: client.appId, userId: "b", id: "layer:///identities/b"});
                client._delayedTriggers = [];
                client._triggerAsync("identities:a", {value: "a"});
                client._triggerAsync("identities:b", {value: "b"});
                client._triggerAsync("identities:add", {identities: [i1]});
                client._triggerAsync("identities:add", {identities: [i2]});
                client._triggerAsync("identities:c", {value: "c"});
                spyOn(client, "_foldEvents");

                // Run
                client._processDelayedTriggers();

                // Posttest
                expect(client._foldEvents)
                    .toHaveBeenCalledWith([
                        ["identities:add", jasmine.objectContaining({
                            identities: [i1]
                        })],
                        ["identities:add", jasmine.objectContaining({
                            identities: [i2]
                        })]
                    ], "identities", client);
            });

            it("Should call _foldEvents on all identities:remove events", function() {
                // Setup
                var i1 = new layer.Identity({clientId: client.appId, userId: "a", id: "layer:///identities/a"});
                var i2 = new layer.Identity({clientId: client.appId, userId: "b", id: "layer:///identities/b"});
                client._delayedTriggers = [];
                client._triggerAsync("identities:a", {value: "a"});
                client._triggerAsync("identities:b", {value: "b"});
                client._triggerAsync("identities:remove", {identities: [i1]});
                client._triggerAsync("identities:remove", {identities: [i2]});
                client._triggerAsync("identities:c", {value: "c"});
                spyOn(client, "_foldEvents");

                // Run
                client._processDelayedTriggers();

                // Posttest
                expect(client._foldEvents)
                    .toHaveBeenCalledWith([
                        ["identities:remove", jasmine.objectContaining({
                            identities: [i1]
                        })],
                        ["identities:remove", jasmine.objectContaining({
                            identities: [i2]
                        })]
                    ], "identities", client);
            });
        });

        describe("The _resetSession() method", function() {
            it("Should call _cleanup", function() {
                // Setup
                spyOn(client, "_cleanup");

                // Run
                client._resetSession();

                // Posttest
                expect(client._cleanup).toHaveBeenCalled();
            });

            it("Should reset conversation data", function() {
                // Setup
                client.createConversation({ participants: ["a"] });

                // Run
                client._resetSession();

                // Posttest
                expect(client._conversationsHash).toEqual({});
            });

            it("Should reset message data", function() {
                // Setup
                client.createConversation({ participants: ["a"]}).createMessage("Hi").send();

                // Run
                client._resetSession();

                // Posttest
                expect(client._messagesHash).toEqual({});
            });

            it("Should reset query data", function() {
                // Setup
                client._clientReady();
                client.createQuery({model: "Conversation"});

                // Run
                client._resetSession();

                // Posttest
                expect(client._queriesHash).toEqual({});
            });

            it("Should reset identity data", function() {
                // Setup
                client._clientReady();
                var serviceIdentity = new layer.Identity({
                    clientId: client.appId,
                    id: "layer:///identities/2",
                    displayName: "ServiceIdentity"
                });

                // Run
                client._resetSession();

                // Posttest
                expect(client._identitiesHash).toEqual({});
            });
        });


        // TODO: May want to break these up, but they form a fairly simple self contained test
        describe("The _checkAndPurgeCache(), _isCachedObject and _removeObject methods", function() {
            beforeEach(function() {
            client._clientReady();
            });

            it("Should destroy Conversations if there are no Queries", function() {
                var c1 = client.createConversation({ participants: ["a"] });
                var c2 = client.createConversation({ participants: ["b"] });
                var c3 = client.createConversation({ participants: ["c"] });

                // Run
                client._checkAndPurgeCache([c1, c2, c3]);

                // Posttest
                expect(Object.keys(client._conversationsHash)).toEqual([]);
                expect(c1.isDestroyed).toBe(true);
                expect(c2.isDestroyed).toBe(true);
                expect(c3.isDestroyed).toBe(true);
            });

            it("Should ignore destroyed objects", function() {
                var c1 = client.createConversation({ participants: ["a"] });
                var c2 = client.createConversation({ participants: ["b"] });
                var c3 = client.createConversation({ participants: ["c"] });
                c2.isDestroyed = true;

                // Run
                client._checkAndPurgeCache([c1, c2, c3]);

                // Posttest
                expect(Object.keys(client._conversationsHash)).toEqual([c2.id]);
                expect(c1.isDestroyed).toBe(true);
                expect(c2.isDestroyed).toBe(true);
                expect(c3.isDestroyed).toBe(true);
            });

            it("Should keep Conversations if they are in a Query and remove and destroy all others", function() {
                // Setup
                var query = client.createQuery({model: layer.Query.Conversation});
                var c1 = client.createConversation({ participants: ["a"] });
                var c2 = client.createConversation({ participants: ["b"] });
                var c3 = client.createConversation({ participants: ["c"] });
                query.data = [c1, c3];

                // Pretest
                expect(Object.keys(client._conversationsHash))
                    .toEqual(jasmine.arrayContaining([c1.id, c2.id, c3.id]));

                // Run
                client._checkAndPurgeCache([c1, c2, c3]);

                // Posttest
                expect(Object.keys(client._conversationsHash)).toEqual(jasmine.arrayContaining([c1.id, c3.id]));
                expect(c1.isDestroyed).toBe(false);
                expect(c2.isDestroyed).toBe(true);
                expect(c3.isDestroyed).toBe(false);
            });


            it("Should handle immutable objects; keeping Conversations if they are in a Query and remove and destroy all others", function() {
                // Setup
                var query = client.createQuery({model: layer.Query.Conversation});
                var c1 = client.createConversation({ participants: ["a"] });
                var c2 = client.createConversation({ participants: ["b"] });
                var c3 = client.createConversation({ participants: ["c"] });
                query.data = [c1, c3];

                // Pretest
                expect(Object.keys(client._conversationsHash))
                    .toEqual(jasmine.arrayContaining([c1.id, c2.id, c3.id]));

                // Run
                client._checkAndPurgeCache([c1.toObject(), c2.toObject(), c3.toObject()]);

                // Posttest
                expect(Object.keys(client._conversationsHash)).toEqual(jasmine.arrayContaining([c1.id, c3.id]));
                expect(c1.isDestroyed).toBe(false);
                expect(c2.isDestroyed).toBe(true);
                expect(c3.isDestroyed).toBe(false);
            });

            it("Should keep Messages if they are in a Query and remove and destroy all others", function() {
                // Setup
                var c = client.createConversation({ participants: ["a"] });
                var query = client.createQuery({
                    model: layer.Query.Message,
                    predicate: "conversation.id = '" + c.id + "'"
                });
                var m1 = c.createMessage("a").send();
                var m2 = c.createMessage("b").send();
                var m3 = c.createMessage("c").send();
                jasmine.clock().tick(1);

                // Pretest
                expect(query.data).toEqual([m3, m2, m1]);

                query.data = [m1, m3];

                // Pretest
                expect(Object.keys(client._messagesHash)).toEqual(jasmine.arrayContaining([m1.id, m2.id, m3.id]));

                // Run
                client._checkAndPurgeCache([m1, m2, m3]);

                // Posttest
                expect(Object.keys(client._messagesHash)).toEqual(jasmine.arrayContaining([m1.id, m3.id]));
                expect(m1.isDestroyed).toBe(false);
                expect(m2.isDestroyed).toBe(true);
                expect(m3.isDestroyed).toBe(false);
            });
        });

        describe("The _scheduleCheckAndPurgeCache() method", function() {
            var conversation;
            beforeEach(function() {
                conversation = client.createConversation({
                    participants: ["a","z"],
                    distinct: false
                });
                conversation.syncState = layer.Constants.SYNC_STATE.SYNCED;
            });

            afterEach(function() {
                conversation.destroy();
            });

            it("Should schedule call to _runScheduledCheckAndPurgeCache if unscheduled", function() {
                client._scheduleCheckAndPurgeCacheAt = 0;
                spyOn(client, "_runScheduledCheckAndPurgeCache");

                // Run
                client._scheduleCheckAndPurgeCache(conversation);
                jasmine.clock().tick(layer.Client.CACHE_PURGE_INTERVAL + 1);

                // Posttest
                expect(client._runScheduledCheckAndPurgeCache).toHaveBeenCalledWith();
            });

            it("Should schedule call to _runScheduledCheckAndPurgeCache if late", function() {
                client._scheduleCheckAndPurgeCacheAt = Date.now() - 10;
                spyOn(client, "_runScheduledCheckAndPurgeCache");

                // Run
                client._scheduleCheckAndPurgeCache(conversation);
                jasmine.clock().tick(layer.Client.CACHE_PURGE_INTERVAL + 1);

                // Posttest
                expect(client._runScheduledCheckAndPurgeCache).toHaveBeenCalledWith();
            });

            it("Should not schedule call to _runScheduledCheckAndPurgeCache if already scheduled", function() {
                client._scheduleCheckAndPurgeCacheAt = Date.now() + 10;
                spyOn(client, "_runScheduledCheckAndPurgeCache");

                // Run
                client._scheduleCheckAndPurgeCache(conversation);
                jasmine.clock().tick(layer.Client.CACHE_PURGE_INTERVAL + 1);

                // Posttest
                expect(client._runScheduledCheckAndPurgeCache).not.toHaveBeenCalled();
            });

            it("Should add object to _scheduleCheckAndPurgeCacheItems if new schedule", function() {
                client._scheduleCheckAndPurgeCacheAt = 0;
                client._scheduleCheckAndPurgeCache(conversation);
                expect(client._scheduleCheckAndPurgeCacheItems).toEqual([conversation]);
            });

            it("Should add object to _scheduleCheckAndPurgeCacheItems if no new schedule", function() {
                client._scheduleCheckAndPurgeCacheAt = Date.now() + 10;
                client._scheduleCheckAndPurgeCache(conversation);
                expect(client._scheduleCheckAndPurgeCacheItems).toEqual([conversation]);
            });

            it("Should ignore unsaved objects", function() {
                conversation.syncState = layer.Constants.SYNC_STATE.SAVING;
                client._scheduleCheckAndPurgeCacheAt = Date.now() + 10;
                client._scheduleCheckAndPurgeCache(conversation);
                expect(client._scheduleCheckAndPurgeCacheItems).toEqual([]);
            });
        });

        describe("The _runScheduledCheckAndPurgeCache() method", function() {
            var c1, c2, c3;
            beforeEach(function() {
                c1 = client.createConversation({ participants: ["a"] });
                c2 = client.createConversation({ participants: ["b"] });
                c3 = client.createConversation({ participants: ["c"] });
                client._scheduleCheckAndPurgeCacheItems = [c1, c2, c3];
                client._scheduleCheckAndPurgeCacheAt = Date.now() + 10;
            });
            it("Should call _checkAndPurgeCache", function() {
                spyOn(client, "_checkAndPurgeCache");
                client._runScheduledCheckAndPurgeCache();
                expect(client._checkAndPurgeCache).toHaveBeenCalledWith([c1, c2, c3]);
            });

            it("Should clear the list", function() {
                client._runScheduledCheckAndPurgeCache();
                expect(client._scheduleCheckAndPurgeCacheItems).toEqual([]);
            });

            it("Should clear the scheduled time", function() {
                client._runScheduledCheckAndPurgeCache();
                expect(client._scheduleCheckAndPurgeCacheAt).toEqual(0);
            });
        });



        describe("The _connectionRestored() method", function() {
        var q1, q2, conversation;
        beforeEach(function() {
            client._clientReady();
            conversation = client.createConversation({ participants: ["a"] });
            q1 = client.createQuery({model: "Conversation"});
            q2 = client.createQuery({model: "Message", predicate: 'conversation.id = \'' + conversation.id + '\''});
        });

        it("Should delete all database data if duration was large", function() {
            spyOn(client.dbManager, "deleteTables");

            // Run
            client.trigger('online', {
                isOnline: true,
                reset: true
            });

            // Posttest
            expect(client.dbManager.deleteTables).toHaveBeenCalledWith(jasmine.any(Function));
        });

        it("Should call reset on all queries if duration was large", function() {
            spyOn(client.dbManager, "deleteTables").and.callFake(function(callback) {callback();});
            spyOn(q1, "reset");
            spyOn(q2, "reset");

            // Run
            client.trigger('online', {
                isOnline: true,
                reset: true
            });

            // Posttest
            expect(q1.reset).toHaveBeenCalledWith();
            expect(q2.reset).toHaveBeenCalledWith();
        });

        it("Should not call reset on all queries if duration was small", function() {
            spyOn(q1, "reset");
            spyOn(q2, "reset");

            // Run
            client.trigger('online', {
            isOnline: true,
            reset: false
            });

            // Posttest
            expect(q1.reset).not.toHaveBeenCalled();
            expect(q2.reset).not.toHaveBeenCalled();

        });

        });

        describe("The createTypingListener() method", function() {
            it("Should return a layer.TypingListener.TypingListener", function() {
                var input = document.createElement("input");
                expect(client.createTypingListener(input)).toEqual(jasmine.any(layer.TypingIndicators.TypingListener));
            });

            it("Should get a proper client ID property", function() {
                var input = document.createElement("input");
                expect(client.createTypingListener(input).clientId).toBe(client.appId);
            });

            it("Should get a proper input property", function() {
                var input = document.createElement("input");
                expect(client.createTypingListener(input).input).toBe(input);
            });
        });

        describe("The createTypingPublisher() method", function() {
            it("Should return a layer.TypingListener.TypingPublisher", function() {
                expect(client.createTypingPublisher()).toEqual(jasmine.any(layer.TypingIndicators.TypingPublisher));
            });

            it("Should get a proper client ID", function() {
                expect(client.createTypingPublisher().clientId).toBe(client.appId);
            });
        });

        describe("The getTypingState() method", function() {
            it("Should call typingListener.getState", function() {
                spyOn(client._typingIndicators, "getState").and.callThrough();
                expect(client.getTypingState('layer:///conversations/c11')).toEqual({
                    typing: [],
                    paused: []
                });
                expect(client._typingIndicators.getState).toHaveBeenCalledWith('layer:///conversations/c11');
            });
        });

        describe("The getClient() static method", function() {
            it("Should get a registered client", function() {
                var client = new layer.Client({
                    appId: "test1"
                });
                expect(layer.Client.getClient("test1")).toBe(client);
            });

            it("Should not get an unregistered client", function() {
                var client = new layer.Client({
                    appId: "test1"
                });
                expect(layer.Client.getClient("test2")).toBe(null);
            });
        });
    });
});
