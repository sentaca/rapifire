"use strict";
var merge = require('merge');

var Rapifire = function(config) {
  var configToUse = merge({
    url: 'wss://pubsub.sentaca.com:1443/pubsub',
    debug: false,
    onconnect: function() { console.log("Use new Rapifire({..., onconnect: fn, ...} to overwrite this function.");},
    onpresence: function(e) {console.log("Use new Rapifire({..., onpresence: fn, ...} to overwrite this function.", e);},
    onpresenceresponse: function(e) {console.log("Use new Rapifire({..., onpresenceresponse: fn, ...} to overwrite this function.", e);},
    onsubscribe: function(e) {console.log("Use new Rapifire({..., onsubscribe: fn, ...} to overwrite this function.", e);}
  }, config), debug = configToUse.debug || false;

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
    var self = this;
    var ws = new WebSocket(c.url);
    var config = c;
    
    ws.onopen = function() {
      if (debug) { console.log("Connected to %s", c.url); }
      ws.send(JSON.stringify(buildInitPacket(c)));
      c.onconnect.apply(self);
    };

    ws.onmessage = function(message) {
      var msg;
      try {
        msg = JSON.parse(message.data);
      } catch(e) {
        console.error("Received %s but cannot parse it to JSON %s", message.data, e);
        throw e;
      }
      if (debug) { console.log("Received message: %O", msg); }

      // {"authId":"697c3da3-9836-4486-b277-2b0a16ef74a0","type":"notification/channel","action":"CHANNEL_JOIN","channel":"85ca2671dca9831bb43baa43ecdd6c28"}
      if(msg.type === "notification/channel" && typeof(config.onpresence) === 'function' ) {
        config.onpresence.apply(self, [{channel: msg.channel, authId: msg.authId, action: msg.action}]);
      } else if(msg.type === "presence" && typeof(config.onpresenceresponse) === 'function' ) {
        // {"type":"presence","status":"OK","details":[{"channel":"0fb3198b2192d4ff92f6c165e6233ba6","authIds":["697c3da3-9836-4486-b277-2b0a16ef74a0","22165b61-2a52-4b71-bef4-45a16634da6d"]}]}
        for(var i in msg.details) {
          var detail = msg.details[i];
          config.onpresenceresponse.apply(self, [detail]);
        }
      } else if(msg.type === "notification/subscription" && typeof(config.onsubscribe) === 'function' ) {
        config.onsubscribe.apply(self, [{channel: msg.channel, authId: msg.authId}]);
      } else if(msg.channel !== undefined && msg.channel !== null && subs[msg.channel]) {
        subs[msg.channel].apply(self, [msg.message, msg.headers]);
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
    var len = channels.length, i = 0, channel;
    for(i = 0; i < len; i++) {
      channel = channels[i];
      var send = (subscriptions[channels] === undefined);
      subscriptions[channel] = subscriptionConfig.callback
      if(send) { 
        ws.send(JSON.stringify(buildSubscribePacket(channel, subscriptionConfig.interactive)));
      }
    }
    return this;
  };

  this.publish = function(channel, message) {
    var packet = {
      "operation": "publish",
      "data": {
        "channel": channel,
        "message": JSON.parse(message)
      }
    };
    ws.send(JSON.stringify(packet));

    return this;
  };

  this.presence = function(channel) {
    var packet = {
      "operation" : "presence",
      "data" : { "channel" : channel }
    };
    ws.send(JSON.stringify(packet));
  };

  this.disconnect = function() {
    ws.close();
  };

};

module.exports = Rapifire;


