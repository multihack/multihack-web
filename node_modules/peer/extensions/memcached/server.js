var PeerServer = require('peer');
var server = new PeerServer({port: 9000, path: '/myapp'});

var memcached = require('peerjs-server-memcached');
server.use(memcached);





var Memcached = require('memcached');

function memcachedServer(server) {
  this._peerServer = server;
}

// Create memcached client.
if (this._options.memcached_hosts.length > 0) {

  if (!this._options.ip || !this._options.port) {
    util.prettyError("ip and port must be specified when using memcached.");
    return;
  }

  util.log('memcached_hosts: ', this._options.memcached_hosts);
  this._memcached = new Memcached(this._options.memcached_hosts);
}
