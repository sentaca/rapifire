var merge = require('merge');

var Rapifire = function(config) {
  var configToUse = merge({
    url: 'wss://pubsub.sentaca.com:1443/pubsub',
    debug: false,
    onconnect: function() { console.log("Use new Rapifire({..., onconnect: fn, ...} to overwrite this function.");}
  }, config);

  var debug = configToUse.debug || false;

  if (debug) {
    console.log(configToUse);
  }

  var verifyConfig = function(c) {
    var verifyKey = function(t, k) {
      if (t[k] === undefined || t[k] === null) {
        throw "Please make sure that " + k + " is set via object constructor.";
      }
    };

    verifyKey(c, "appId");
    verifyKey(c, "authId");
    verifyKey(c, "authKey");
  };

  var buildInitPacket = function(c) {
    return {
      "operation": "init",
      "data": {
        "appId" : c.appId,
        "authId" : c.authId,
        "authKey" : c.authKey
      }
    };
  };

  var buildSubscribePacket = function(channel, interactive) {
    return {
      "operation": "subscribe",
      "data": {
        "channel": channel,
        "interactive": interactive
      }
    };
  };


  var connect = function(c, subs) {
    var _self = this;
    var ws = new WebSocket(c.url);
    ws.onopen = function() {
      if (debug) { console.log("Connected to %s", c.url); }
      ws.send(JSON.stringify(buildInitPacket(c)));
      c.onconnect.apply(_self);
    };

    ws.onmessage = function(message) {
      var msg = JSON.parse(message.data);
      if (debug) { console.log("Received message: %O", msg); }
      if(msg.channel !== undefined && msg.channel !== null && subs[msg.channel]) {
        subs[msg.channel].apply(_self, [msg.message, msg.headers]);
      }
    };

    return ws;
  };

  var subscriptions = {};
  var ws = connect.apply(this, [configToUse, subscriptions]);

  this.subscribe = function(subscriptionConfig) {
    var channels = [];
    if(Object.prototype.toString.call( subscriptionConfig.channel ) === '[object Array]') {
      channels = subscriptionConfig.channel;
    } else {
      channels.push(subscriptionConfig.channel);
    }
    var len = channels.length, i;
    for(i = 0; i < len; i++ ) {
      var channel = channels[i];
      subscriptions[channel] = subscriptionConfig.callback;
      ws.send(JSON.stringify(buildSubscribePacket(channel, subscriptionConfig.interactive)));
    }
    return this;
  };

  this.disconnect = function() {
    ws.close();
  };  

};

module.exports = Rapifire;


