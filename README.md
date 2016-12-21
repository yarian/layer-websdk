# Layer Web SDK

[![Build Status](http://img.shields.io/travis/layerhq/layer-websdk.svg)](https://travis-ci.org/layerhq/layer-websdk)
[![npm version](http://img.shields.io/npm/v/layer-websdk.svg)](https://npmjs.org/package/layer-websdk)

The Layer Web SDK is a JavaScript library for adding chat services to your web application. For detailed documentation, tutorials and guides please visit our [Web SDK documentation](https://docs.layer.com/sdk/web-3.0/install).

## About this Beta

This beta release exists solely for customers interested in trying out Channels.  Customers should be familiar with Layer's services and the WebSDK,
or should learn about them before learning how to use this beta.  Resources to get started are at:

* https://docs.layer.com/
* https://docs.layer.com/sdk/web/introduction

This beta introduces Channels; to learn about our Channels concepts, you should become familiar with the concepts (though not the APIs) documented at:

* https://////
    * Note that Roles, Discoverability, `last_read_message_id` and `unread_message_count` described in the spec are not yet available.

This Beta introduces the following new APIs:

### Create a Channel

Channels must have a unique name; attempting to create a Channel where the name is already taken will either cause an error
or return an existing Channel.  The basic creation is:

```javascript
client.createChannel({
    members: ['layer:///identities/a', 'layer:///identities/b'],
    name: 'a-channel-with-metadata',
    metadata: {
        topicDetails: 'I am a detail'
    }
});
```

For more info, see [client.createChannel](http://static.layer.com/layer-websdk-beta/docs/#!/api/layer.mixins.ClientChannels-method-createChannel)

### Listing Channels

You can get a list of Channels for rendering using:

```javascript
var query = client.createQuery({
    model: layer.Query.Channel,
    paginationWindow: 50
});
```

This query will behave the same as a Conversation Query, with the following exception:

* There is no options for sorting the list at this time. This should change when `unread_message_count` and `last_read_message_id` become available.

The `query.data` will store an array of [Channel Objects](http://static.layer.com/layer-websdk-beta/docs/#!/api/layer.Channel).

### Listing members of a Channel

Channels use the term `members` rather than `participants`; unlike Conversations which come with a `participants` array as part of the Object,
its assumed that Channels will have many participants that can not be listed, thus we use the term `members` and have a Query API for requesting
the server to send the members:

```javascript
var query = client.createQuery({
    model: layer.Query.Membership,
    predicate: 'channel.id = "layer:///channels/UUID"',
    paginationWindow: 50
});
```

The `query.data` will store an array of [Membership Objects](http://static.layer.com/layer-websdk-beta/docs/#!/api/layer.Membership).

## Supported Browsers

* IE 11 and Edge
* Safari 7
* Chrome 42 and up
* Firefox 40 and up

Older versions of Chrome and Firefox will likely work.

## Installation

All examples below assume your using the CDN installation method; adapting instructions to other methods should be straightforward.

### CDN

Simplest approach to install the Web SDK is to add the following script tag:

```html
<script src='//cdn.layer.com/sdk/3.1.0-beta/layer-websdk.min.js'></script>
```

* For stricter code control, use `//cdn.layer.com/sdk/3.0.n/layer-websdk.min.js` instead. (where `n` is the patch number for the desired release)

All classes can then be accessed via the `layer` namespace:

```javascript
var client = new layer.Client({
    appId: LAYER_APP_ID
});
```

### NPM

    npm install layer-websdk@beta --save

All classes can then be accessed via the layer module:

```javascript
var layer = require('layer-websdk');

var client = new layer.Client({
    appId: LAYER_APP_ID
});
```

### From source

Download the latest SDK release [Source code](https://github.com/layerhq/layer-websdk/releases/latest) archive, extract the files and run the following commands from the extracted project folder:

    > npm install
    > grunt build

A `build/` folder will be generated that contains `client.min.js` file.

Other build commands:

* `grunt debug`: Generates `build/client.debug.js` which provides source-mapped files if you need to step through the Web SDK.
* `grunt docs`: Generates `docs/index.html` which you can open to view the API documentation.
* `grunt test`: Run the unit tests

Beta Users Note: code for this beta will be developped in the `channels-3.1` branch until it exits beta and is merged to master.

## Getting Started

* For a full introduction, see https://docs.layer.com/sdk/web/introduction
* For an API Reference, see https://docs.layer.com/api_reference/web-3.0/