# Rapifire Websocket API


## Example

````html
<script src="rapifire.min.js"></script>

<script>
 var client = new Rapifire({
   appId: '...',
   authId: '...',
   authKey: '...',
   debug: true,
   url: 'ws://ps.sentaca.com/pubsub',
   onconnect: function() {
     client.subscribe({
       channel:  'test', // or channel: ['a', 'b', 'c'] 
       interactive: true,
       callback: function(message, headers) {
         console.log("Received msg: %O headers: %O", message, headers);
       }
     });
   }
 });

</script>
````
