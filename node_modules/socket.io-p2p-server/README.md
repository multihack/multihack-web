Socket.io-p2p-server
====================

The socket.io middleware that powers [socket.io-p2p](https://github.com/tomcartwrightuk/socket.io-p2p). It handles passing signalling data between all peers. Just include the middleware and everything is handled for you.

## How to use

Simple require the module and [use]("http://socket.io/docs/server-api/#namespace#use(fn:function):namespace") it.

```
var p2pserver = require('socket.io-p2p-server').Server
var io = require('socket.io')(server);
io.use(p2pserver)
```

For example, in an express powered app, you can do the following:

```
var app = require('express')()
var server = require('http').Server(app)
var p2pserver = require('socket.io-p2p-server').Server
var io = require('socket.io')(server)

app.use(express.static(__dirname))
io.use(p2pserver)

server.listen(3030, function () {
  console.log("Listening on 3030")
})
```

It can also be used inside your connection logic so that you can specify a room that clients will communicate over:

```
p2pserver(socket, null, room)
```

Note that `null` must be passed as the second arguement when being used in this context.
