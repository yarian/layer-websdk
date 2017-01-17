/* eslint-disable */
describe("The Util Library", function() {
    describe("The generateUUID() function", function() {
        it("Should generate a properly structured UUID", function() {
            expect(layer.Util.generateUUID()).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
        });

        it("Should generate a unique UUID", function() {
            var hash = {};
            for (var i = 0; i < 100; i++) {
                var id = layer.Util.generateUUID();
                expect(hash[id]).toBe(undefined);
                hash[id] = true;
            }
        });
    });

    describe("The typeFromID() function", function() {
        it("Should detect conversations", function() {
            expect(layer.Util.typeFromID("layer:///conversations/fred")).toEqual("conversations");
        });

        it("Should detect messages", function() {
            expect(layer.Util.typeFromID("layer:///messages/fred")).toEqual("messages");
        });

        it("Should detect queries", function() {
            expect(layer.Util.typeFromID("layer:///queries/fred")).toEqual("queries");
        });

        it("Should detect content", function() {
            expect(layer.Util.typeFromID("layer:///content/fred")).toEqual("content");
        });
    });

    describe("The isEmpty() function", function() {
        it("Should return true for an empty object", function() {
            expect(layer.Util.isEmpty({})).toBe(true);
        });

        it("Should return false for a non-empty object", function() {
            expect(layer.Util.isEmpty({hey: "ho"})).toBe(false);
        });

        it("Should return false for a non-plain object", function() {
            expect(layer.Util.isEmpty(new Date())).toBe(false);
        });
    });

    describe("The sortBy() function", function() {
        it("Should sort by a", function() {
            var a1 = [{a: 5}, {a: 10}, {a: 3}];
            layer.Util.sortBy(a1, function(v) {return v.a;});
            expect(a1).toEqual([{a: 3}, {a: 5}, {a: 10}]);
        });

        it("Should sort by negative a", function() {
            var a1 = [{a: 5}, {a: 10}, {a: 3}];
            layer.Util.sortBy(a1, function(v) {return -v.a;})
            expect(a1).toEqual([{a: 10}, {a: 5}, {a: 3}]);
        });

        it("Should not matter for equivalent values", function() {
            var a1 = [{a: 5}, {a: 5}, {a: 3}];
            layer.Util.sortBy(a1, function(v) {return v.a;});
            expect(a1).toEqual([{a: 3}, {a: 5}, {a: 5}]);
        });

        it("Should put undefined at the end.", function() {
            var a1 = [{a: 5}, {b: 4}, {a: 3}, {c: 10}];
            layer.Util.sortBy(a1, function(v) {return v.a;});
            expect(a1.slice(0,2)).toEqual([{a: 3}, {a: 5}]);
            expect(a1.slice(2,4)).toEqual(jasmine.arrayContaining([{b: 4}, {c: 10}]));
        });




    });

    describe("The clone() function", function() {
        it("Should return a new object", function() {
            var a = {hey: "ho"};
            expect(layer.Util.clone(a)).not.toBe(a);
            expect(layer.Util.clone(a)).toEqual(a);
        });
    });

    describe("The doesObjectMatch() method", function() {
        it("Should match identical objects", function() {
            expect(layer.Util.doesObjectMatch(
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all"}
                    },
                    doh: "ray"
                },
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all"}
                    },
                    doh: "ray"
                }
            )).toBe(true);
        });

        it("Should detect additional properties", function() {
            expect(layer.Util.doesObjectMatch(
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all"}
                    },
                    doh: "ray"
                },
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all", g: "people"}
                    },
                    doh: "ray"
                }
            )).toBe(false);
        });

        it("Should detect removed properties", function() {
            expect(layer.Util.doesObjectMatch(
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all", g: "people"}
                    },
                    doh: "ray"
                },
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all"}
                    },
                    doh: "ray"
                }
            )).toBe(false);
        });

        it("Should detect changed properties", function() {
            expect(layer.Util.doesObjectMatch(
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all", g: "people"}
                    },
                    doh: "ray"
                },
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all", g: "people2"}
                    },
                    doh: "ray"
                }
            )).toBe(false);
        });

        it("Should detect changed keys", function() {
            expect(layer.Util.doesObjectMatch(
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all", g: "people"}
                    },
                    doh: "ray"
                },
                {
                    a: "hi",
                    b: {
                        c: "there",
                        d: "5",
                        e: {f: "all", h: "people"}
                    },
                    doh: "ray"
                }
            )).toBe(false);
        });
    });


    describe("The defer() method", function() {
        it("Should call methods in the right order", function(done) {
            var result = [];
            layer.Util.defer(function() {
                result.push("a");
            });
            layer.Util.defer(function() {
                result.push("b");
            });
            layer.Util.defer(function() {
                result.push("c");
            });
            layer.Util.defer(function() {
                result.push("d");
            });
            result.push("before");
            layer.Util.defer(function() {
                expect(result).toEqual(["before", "a", "b", "c", "d"]);
                setTimeout(function() {
                    done();
                }, 0);
            });
        });

        it("Should run functions queued within defer after all other queued calls", function(done) {
            var result = [];

            layer.Util.defer(function() {
                result.push(1);
                layer.Util.defer(function() {
                    result.push(11);
                });
            });

            layer.Util.defer(function() {
                result.push(2);
                layer.Util.defer(function() {
                    result.push(22);
                });
            });

            setTimeout(function() {
                expect(result).toEqual([1, 2, 11, 22]);
                done();
            }, 10);
        });
    });

     describe("The getExponentialBackoffSeconds() method", function() {
        it("Should return a value between 0.1 and 0.35", function() {
            for (var i = 0; i < 100; i++) {
                var result = layer.Util.getExponentialBackoffSeconds(10000, 0);
                expect(result >= 0.1 && result <= 0.35).toBe(true);
            }
        });

        it("Should return a value between 0.2 and 0.45", function() {
            for (var i = 0; i < 100; i++) {
                var result = layer.Util.getExponentialBackoffSeconds(10000, 1);
                expect(result >= 0.2 && result <= 0.45).toBe(true);
            }
        });

        it("Should return a value between 0.4 and 0.9", function() {
            for (var i = 0; i < 100; i++) {
                var result = layer.Util.getExponentialBackoffSeconds(10000, 2);
                expect(result >= 0.4 && result <= 0.95).toBe(true);
            }
        });

        it("Should return a value between 0.8 and 1.3", function() {
            for (var i = 0; i < 100; i++) {
                var result = layer.Util.getExponentialBackoffSeconds(1000, 3);
                expect(result >= 0.8 && result <= 1.3).toBe(true);
            }
        });

        it("Should apply max to the non-random part of the result", function() {
            for (var i = 0; i < 100; i++) {
                var result = layer.Util.getExponentialBackoffSeconds(10, 50);
                expect(result >= 10 && result <= 11).toBe(true);
            }
        });
    });

    describe("The fetchTextFromFile() method", function() {
        var  blob, text;
        beforeEach(function() {
            text = new Array(layer.DbManager.MaxPartSize + 10).join('a');
            blob = new Blob([text], {type : 'text/plain'});
        });

        it("Should return file if file is really a string", function() {
            var result;
            layer.Util.fetchTextFromFile(text, function(data) { result = data;});
            expect(result).toEqual(text);
        });

        it("Should turn text blob to string", function(done) {
            var result;
            layer.Util.fetchTextFromFile(text, function(data) {
                expect(data).toEqual(text);
                done();
            });
        });

    });

    describe("The layerParse() method", function() {
        var client, conversation, config, message;
        beforeEach(function() {
            client = new layer.Client({appId: "fred"});

            client.user = new layer.Identity({
                clientId: client.appId,
                userId: "c",
                id: "layer:///identities/c",
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
            getObjectsResult = [];
            spyOn(client.dbManager, "getObjects").and.callFake(function(tableName, ids, callback) {
                setTimeout(function() {
                    callback(getObjectsResult);
                }, 10);
            });
            client._clientReady();
            client.onlineManager.isOnline = true;

            conversation = client.createConversation({
                participants: ["a", "b"],
                metadata: {
                    eat: "food",
                    drink: "coffee"
                }
            }).send();
            message = conversation.createMessage("hi").send();
            config = {
                client: client,
                object: conversation,
                type: 'Conversation',
                operations: [
                    {operation: "set", property: "unread_message_count", value: 5},
                    {operation: "add", property: "participants", id: "layer:///identities/c", value: {id: "layer:///identities/c", url: "https:///heyho.com/identities/c", user_id: "c", display_name: "User C", avatar_url: null}},
                    {operation: "remove", property: "participants", id: "layer:///identities/a"},
                    {operation: "delete", property: "metadata.eat"},
                    {operation: "set", property: "lastMessage", id: message.id}
                ]
            };
        });

        afterEach(function() {
            client.destroy();
        });

        it("Should set the unread_message_count", function() {
            layer.Util.layerParse(config);
            expect(conversation.unreadCount).toEqual(5);
        });

        it("Should add a participant", function() {
            layer.Util.layerParse(config);
            var identityC = client.getIdentity("c");
            expect(conversation.participants.indexOf(identityC)).not.toEqual(-1);
        });

        it("Should remove a participant", function() {
            layer.Util.layerParse(config);
            var identityA = client.getIdentity("a");
            expect(conversation.participants.indexOf(identityA)).toEqual(-1);
        });

        it("Should delete a metadata property", function() {
            layer.Util.layerParse(config);
            expect(conversation.metadata).toEqual({
                drink: "coffee"
            });
        });

        it("Should set the lastMessage property by id", function() {
            conversation.lastMessage = null;
            layer.Util.layerParse(config);
            expect(conversation.lastMessage).toBe(message);
        });

        it("Should update recipientStatus", function() {
            message.recipientStatus = {
                "layer:///identities/a": "sent",
                "layer:///identities/b": "sent",
                "layer:///identities/c": "read"
            };
            layer.Util.layerParse({
                client: client,
                object: message,
                type: 'Message',
                operations: [
                    {operation: "set", property: "recipient_status.layer:///identities/a", value: "read"},
                    {operation: "set", property: "recipient_status.layer:///identities/b", value: "delivered"}
                ]
            });

            // Posttest
            expect(message.recipientStatus).toEqual({
                "layer:///identities/a": "read",
                "layer:///identities/b": "delivered",
                "layer:///identities/c": "read"
            });
        });

        it("Should call __updateRecipientStatus", function() {
            message.recipientStatus = {
                "layer:///identities/a": "sent",
                "layer:///identities/b": "sent",
                "layer:///identities/c": "read"
            };
            spyOn(message, "__updateRecipientStatus");
            layer.Util.layerParse({
                client: client,
                object: message,
                type: 'Message',
                operations: [
                    {operation: "set", property: "recipient_status.layer:///identities/a", value: "read"},
                    {operation: "set", property: "recipient_status.layer:///identities/b", value: "delivered"}
                ]
            });

            // Posttest
            expect(message.__updateRecipientStatus).toHaveBeenCalledWith({
                "layer:///identities/a": "read",
                "layer:///identities/b": "delivered",
                "layer:///identities/c": "read"
            }, {
                "layer:///identities/a": "sent",
                "layer:///identities/b": "sent",
                "layer:///identities/c": "read"
            });
        });
    });

    describe("The includes() method", function() {
      it("Should detect inclusion", function() {
        expect(layer.Util.includes([1,3,5], 3)).toBe(true);
      });

      it("Should detect absence", function() {
        expect(layer.Util.includes([1,3,5], 4)).toBe(false);
      });
    });

    describe("The asciiInit() method", function() {
      it("Should return ASCII Layer logo with version 1.0.0", function() {
        expect(layer.Util.asciiInit('1.0.0')).toEqual(
        '\n    /hNMMMMMMMMMMMMMMMMMMMms.' +
        '\n  hMMy+/////////////////omMN-        \'oo.' +
        '\n  MMN                    oMMo        .MM/' +
        '\n  MMN                    oMMo        .MM/              ....                       ....            ...' +
        '\n  MMN       Web SDK      oMMo        .MM/           ohdddddddo\' +md.      smy  -sddddddho.   hmosddmm.' +
        '\n  MMM-                   oMMo        .MM/           ::.\'  \'.mM+ \'hMd\'    +Mm. +Nm/\'   .+Nm-  mMNs-\'.' +
        '\n  MMMy      v1.0.0       oMMo        .MM/             .-:/+yNMs  .mMs   /MN: .MMs///////dMh  mMy' +
        '\n  MMMMo                  oMMo        .MM/          .ymhyso+:hMs   :MM/ -NM/  :MMsooooooooo+  mM+' +
        '\n  MMMMMy.                oMMo        .MM/          dMy\'    \'dMs    +MN:mM+   \'NMo            mM+' +
        '\n  MMMMMMNy:\'             oMMo        .MMy++++++++: sMm/---/dNMs     yMMMs     -dMd+:-:/smy\'  mM+' +
        '\n  NMMMMMMMMmy+:-.\'      \'yMM/        \'yyyyyyyyyyyo  :shhhys:+y/     .MMh       \'-oyhhhys:\'   sy:' +
        '\n  :dMMMMMMMMMMMMNNNNNNNNNMNs                                        hMd\'' +
        '\n   -/+++++++++++++++++++:\'                                      sNmdo\'');
      });

      it("Should return ASCII Layer logo with version 2.10.37", function() {
        expect(layer.Util.asciiInit('2.10.37')).toEqual(
          '\n    /hNMMMMMMMMMMMMMMMMMMMms.' +
          '\n  hMMy+/////////////////omMN-        \'oo.' +
          '\n  MMN                    oMMo        .MM/' +
          '\n  MMN                    oMMo        .MM/              ....                       ....            ...' +
          '\n  MMN       Web SDK      oMMo        .MM/           ohdddddddo\' +md.      smy  -sddddddho.   hmosddmm.' +
          '\n  MMM-                   oMMo        .MM/           ::.\'  \'.mM+ \'hMd\'    +Mm. +Nm/\'   .+Nm-  mMNs-\'.' +
          '\n  MMMy      v2.10.37     oMMo        .MM/             .-:/+yNMs  .mMs   /MN: .MMs///////dMh  mMy' +
          '\n  MMMMo                  oMMo        .MM/          .ymhyso+:hMs   :MM/ -NM/  :MMsooooooooo+  mM+' +
          '\n  MMMMMy.                oMMo        .MM/          dMy\'    \'dMs    +MN:mM+   \'NMo            mM+' +
          '\n  MMMMMMNy:\'             oMMo        .MMy++++++++: sMm/---/dNMs     yMMMs     -dMd+:-:/smy\'  mM+' +
          '\n  NMMMMMMMMmy+:-.\'      \'yMM/        \'yyyyyyyyyyyo  :shhhys:+y/     .MMh       \'-oyhhhys:\'   sy:' +
          '\n  :dMMMMMMMMMMMMNNNNNNNNNMNs                                        hMd\'' +
          '\n   -/+++++++++++++++++++:\'                                      sNmdo\'');
      });

      it("Should return ASCII Layer logo with version 2.0.0-beta.3", function() {
        expect(layer.Util.asciiInit('2.0.0-beta.3')).toEqual(
          '\n    /hNMMMMMMMMMMMMMMMMMMMms.' +
          '\n  hMMy+/////////////////omMN-        \'oo.' +
          '\n  MMN                    oMMo        .MM/' +
          '\n  MMN                    oMMo        .MM/              ....                       ....            ...' +
          '\n  MMN       Web SDK      oMMo        .MM/           ohdddddddo\' +md.      smy  -sddddddho.   hmosddmm.' +
          '\n  MMM-                   oMMo        .MM/           ::.\'  \'.mM+ \'hMd\'    +Mm. +Nm/\'   .+Nm-  mMNs-\'.' +
          '\n  MMMy      v2.0.0       oMMo        .MM/             .-:/+yNMs  .mMs   /MN: .MMs///////dMh  mMy' +
          '\n  MMMMo     beta.3       oMMo        .MM/          .ymhyso+:hMs   :MM/ -NM/  :MMsooooooooo+  mM+' +
          '\n  MMMMMy.                oMMo        .MM/          dMy\'    \'dMs    +MN:mM+   \'NMo            mM+' +
          '\n  MMMMMMNy:\'             oMMo        .MMy++++++++: sMm/---/dNMs     yMMMs     -dMd+:-:/smy\'  mM+' +
          '\n  NMMMMMMMMmy+:-.\'      \'yMM/        \'yyyyyyyyyyyo  :shhhys:+y/     .MMh       \'-oyhhhys:\'   sy:' +
          '\n  :dMMMMMMMMMMMMNNNNNNNNNMNs                                        hMd\'' +
          '\n   -/+++++++++++++++++++:\'                                      sNmdo\'');
      });
    });
});
