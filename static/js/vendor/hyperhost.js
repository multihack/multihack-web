(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.HyperHost = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
    paths : {
        client : "https://rationalcoding.github.io/HyperHost/client.html?site=",
        wzrd : "https://tmullen-bcdn.herokuapp.com/debug-standalone/",
        crossOriginProxy : "https://crossorigin.me/"
    },
    extensions : {
        text : ["js", "txt", "md", "py", "java"],
        font : ["eot", "woff", "woff2", "ttf", "svg", "sfnt", "otf"],
        image : ["png", "jpg", "jpeg", , "jpeg2000", "tif", "tiff", "gif", "bmp"],
        view : ["html", "css", "json"]
    },
    peerJS : {
        host: "peerjs-server-tmullen.mybluemix.net",
        port: 443,
        path: "/server",
        secure: true
    },
    warnings : {
        maxTreeSize : 40
    },
    maxReconnectAttempts : 10
}
},{}],2:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

HyperHost v2.0
Module to host websites over WebRTC.

*/

const IO = require('./processing/io.js'),
      Flattener = require('./processing/flattener.js'),
      Compiler = require('./processing/compiler.js'),
      StaticServer = require('./runtime/staticServer.js'),
      VirtualServer = require('./runtime/virtualServer.js');

function Host() {
  'use strict';

  this.io = new IO();

  let staticServer,
      virtualServer,
      _handlers = {};

  const flattener = new Flattener(),
        compiler = new Compiler(),
        _emit = function _emit(event, data) {
    var fn = _handlers[event];
    if (fn && typeof fn === 'function') {
      fn(data);
    }
  };

  /*
      Listen for an event.
  */
  this.on = function on(event, handler) {
    _handlers[event] = handler;
  };

  /*
      Launch the server.
  */
  this.launch = function launch() {
    const flat = flattener.flatten(this.io.getContentTree()),
          views = compiler.compile(flat.views, flat.assets);

    staticServer = new StaticServer(views, !!flat.startScript);

    staticServer.on('ready', () => {
      _emit('ready', staticServer.clientURL);
    });

    staticServer.launch();

    if (flat.startScript) {
      virtualServer = new VirtualServer(flat.startScript, flat.virtualModules, flat.jsonFiles);
      virtualServer.launch();
    }
  };
}

module.exports = Host;

},{"./processing/compiler.js":3,"./processing/flattener.js":4,"./processing/io.js":5,"./runtime/staticServer.js":6,"./runtime/virtualServer.js":8}],3:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Injects encoded assets and subviews into views.
*/

const util = require('../util/util.js');

function Compiler() {
  'use strict';

  // Inject assets into views

  const injectAssets = function injectAssets(views, assets) {
    let i, i2, regex;
    i = views.length;
    while (i--) {
      i2 = assets.length;
      while (i2--) {
        if (views[i].isRoot) {
          // Find instances of the path name and replace with encoded content
          regex = new RegExp('(.\/|)' + util.escapeRegex(assets[i2].old), 'g');
          views[i].content = views[i].content.replace(regex, assets[i2].new);
        } else if (views[i].extension === 'css') {
          // Relaxes exact path matching for CSS files (only name match is required)
          regex = new RegExp('url\(([^)]*)(.\/|)' + util.escapeRegex(assets[i2].name) + '([^)]*)\)', 'g');
          views[i].content = views[i].content.replace(regex, 'url(' + assets[i2].new);
        } else {
          /*
          TODO: Support relative paths in more than just stylesheets.
           Javascript may have many false matches.
          Other types are completely unknown.
          */
        }
      }
    }
  },


  // Inject subsviews into views
  injectViews = function injectViews(views) {
    let i, i2, regex, navScript;

    i = views.length;
    while (i--) {
      if (views[i].isInvalid) continue;
      if (views[i].extension !== 'html') continue; // Subviews only make sense for HTML

      i2 = views.length;
      while (i2--) {
        if (views[i2].isInvalid) continue;

        switch (views[i2].extension) {

          case 'css':
            // External CSS files are replaced by embedded stylesheets
            regex = new RegExp("<link.*rel\\s*=\\s*[\"']stylesheet[\"'].*href\\s*=\\s*[\"'](.\/|)" + util.escapeRegex(views[i2].path) + "[\"'].*>", 'g');
            views[i].content = views[i].content.replace(regex, '<style>' + views[i2].content + '</style>');

            break;

          case 'html':
            // Links to internal HTML files are replaced via navigation scripts
            regex = new RegExp("href\\s*=\\s*['\"](.\/|)" + util.escapeRegex(views[i2].path) + "(#[^'\"]*['\"]|['\"])", 'g');

            navScript = `href='#' onclick="event.preventDefault();var parent=window.parent;var event = new CustomEvent('hypermessage', {detail: {type: 'navigate',path:'` + views[i2].path + `'}});parent.dispatchEvent(event)"`;

            views[i].content = views[i].content.replace(regex, navScript);

            break;

          default:
            // TODO support other kinds of injectable views (are there any?)
            continue;
        }
      }
    }
  },


  // Replaces hash links with scrolling scripts
  replaceHashLinks = function replaceHashLinks(views) {
    let i, i2, regex, regex2, regex3, matches, anchorID;

    i = views.length;
    while (i--) {
      if (views[i].isInvalid) continue;
      if (views[i].extension !== 'html') continue;

      // Replace hash links

      // Get all href attributes that begin with a hash
      regex = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#[^'\"]+['\"]", 'g');
      matches = views[i].content.match(regex);

      if (matches !== null) {
        i2 = matches.length;
        while (i2--) {
          // Get the actual name (without the #)
          regex2 = new RegExp("#[^'\"]+['\"]", 'g');
          anchorID = matches[i2].match(regex2)[0];
          anchorID = anchorID.substr(1, anchorID.length - 2);

          // Get the full href again
          regex3 = new RegExp("href\\s*=\\s*['\"](.\/|)\\s*#" + util.escapeRegex(anchorID) + "['\"]", 'g');

          // Inject a script to control scrolling
          // TODO: Is this the best solution?
          views[i].content = views[i].content.replace(regex3, `href="#" onclick="event.preventDefault(); document.getElementById('` + anchorID + `').scrollIntoView();"`);
        }
      }
    }
  };

  /*
      Accepts an array of views and an array of pre-encoded assets.
      Compiles these views in-place.
      Returns the array of compiled views.
  */
  this.compile = function compile(views, assets) {
    injectAssets(views, assets);
    injectViews(views);
    replaceHashLinks(views);
    return views;
  };
}

module.exports = Compiler;

},{"../util/util.js":10}],4:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Flattens the content tree into two arrays of views and assets.

The content tree has the following example structure:

[
    {
        name: 'folder',
        nodes : [
            {
                name : 'nested file',
                content : 'content of file here'
            }
        ]
    },
    {
        name : 'a file',
        content : 'some file content'
    }
]

*/

const util = require('../util/util.js'),
      config = require('../config/config.json');

function Flattener() {
  'use strict';

  let views, assets, startScript, virtualModules, jsonFiles, foundIndex;

  const pushFile = function pushFile(path, item, isRoot) {
    const ext = util.nameToExtension(item.name);

    // Views must not be encoded!
    if (util.contains(config.extensions.view, ext)) {
      if (path + item.name === 'index.html') {
        // Find the root HTML page
        foundIndex = true;
      }

      if (ext === 'json') {
        jsonFiles[path + item.name.split('.')[0]] = JSON.parse(item.content); // JSON files are reserved for the server. If you need them in client, use a virtual backend to serve them
      } else {
        views.push({
          content: item.content,
          path: path + item.name,
          extension: ext,
          isRoot: isRoot
        });
      }
    }

    // Should not be encoded initially, but we will encode them
    else if (util.contains(config.extensions.text, ext)) {
        const dataURI = item.dataURI || util.toDataURI(item.content, util.nameToExtension(item.name));

        if (item.name.substring(0, 3) === 'HH-') {
          if (item.name === 'HH-server.js') {
            // Virtual server start file
            startScript = dataURI;
          } else {
            // Virtual server module
            const name = item.name.substring(3).slice(0, -3);
            virtualModules[name] = dataURI;
          }
        } else {
          assets.push({
            old: path + item.name,
            new: dataURI,
            extension: ext,
            name: item.name,
            isFont: false
          });
        }
      }

      // Misc files should always be encoded
      else {
          const dataURI = item.dataURI || util.toDataURI(item.content, util.nameToExtension(item.name)),
                isFont = util.contains(config.extensions.image, ext); // Identify fonts

          assets.push({
            old: path + item.name,
            new: dataURI,
            extension: ext,
            name: item.name,
            isFont: isFont
          });
        }
  },


  // Traverses an item of unknown type in the content tree
  traverseFileTree = function traverseFileTree(item, path, depth, ancestors) {
    if (item.name[0] === '.' || item.isRemoved) return; // Ignore hidden files

    if (!item.nodes) {
      // No child node array, must be a file
      pushFile(path, item, depth <= 1);
    } else {
      // Recursively traverse folder
      for (let i = 0; i < item.nodes.length; i++) {
        const newPath = path + item.name + '/',
              newAncestors = ancestors.slice(0);
        newAncestors.push(item.name);

        traverseFileTree(item.nodes[i], newPath, depth + 1, newAncestors);
      }
    }
  };

  /*
  Flattens a content tree and returns the result.
  Returns an object containing :
  an array of views,
  an array of assets,
  a virtual server start script (if one exists),
  a dictionary of virtual modules,
  a dictionary of json files.
  */
  this.flatten = function flatten(tree) {
    // Reset working variables
    views = [];
    assets = [];
    virtualModules = {};
    foundIndex = false;
    jsonFiles = {
      package: {
        dependencies: {}
      }
    };

    // Iterate across root level of tree
    for (let i = 0; i < tree.length; i++) {
      traverseFileTree(tree[i], '', 0, []);
    }

    if (!foundIndex) {
      throw new Error('No index.html in root level of content tree.');
    }

    return {
      views,
      assets,
      startScript,
      virtualModules,
      jsonFiles
    };
  };
}

module.exports = Flattener;

},{"../config/config.json":1,"../util/util.js":10}],5:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Builds content trees from different inputs
*/

const util = require('../util/util.js'),
      config = require('../config/config.json');

function IO() {
  'use strict';

  let contentTree = { nodes: [] };

  let _handlers = {};
  const _emit = function _emit(event, data) {
    var fn = _handlers[event];
    if (fn && typeof fn === 'function') {
      fn(data);
    }
  };

  let remainingFiles = 0,
      // For tracking async load
  traversalComplete; //

  // Traverses and loads a webkitEntry
  const traverseWebkitEntry = function travserseWebkitEntry(entry, ancestors, callback) {
    if (entry.isFile) {
      entry.file(function (file) {
        let fileReader = new FileReader(),
            extension = entry.name.split('.');
        extension = extension[extension.length - 1].toLowerCase();

        remainingFiles++;
        fileReader.addEventListener('load', () => {
          util.deepSetTree(contentTree, {
            name: entry.name,
            content: fileReader.result
          }, ancestors);

          // Check for completion
          remainingFiles--;
          if (remainingFiles === 0 && traversalComplete) {
            callback();
          }
        });

        if (config.extensions.view.indexOf(extension) !== -1) {
          // Views must remain text
          fileReader.readAsText(file);
        } else {
          // Everything else must be base64
          fileReader.readAsDataURL(file);
        }
      }, function (err) {
        console.error(err);
      });
    } else if (entry.isDirectory) {
      util.deepSetTree(contentTree, {
        name: entry.name,
        nodes: []
      }, ancestors);

      let dirReader = entry.createReader();
      dirReader.readEntries(entries => {
        for (var i = 0; i < entries.length; i++) {
          let newAncestors = ancestors.slice(0); // Clone ancestors array
          newAncestors.push(entry.name);
          traverseWebkitEntry(entries[i], newAncestors, callback);
        }
      });
    }
  };

  /*
      Listen for an event.
  */
  this.on = function on(event, handler) {
    _handlers[event] = handler;
  };

  this.getContentTree = function () {
    return contentTree;
  };

  /*
  Consumes a content tree directly.
  */
  this.contentTree = function (newContentTree) {
    contentTree = newContentTree;
    _emit('digest', {});
  };

  /*
  Builds a true content tree from a tree containing File objects.
  */
  this.fileTree = function (fileTree) {
    throw new Error('Not implemented'); // TODO
  };

  /*
  Builds content tree from JSZip object.
  */
  this.zip = function (zip) {
    throw new Error('Not implemented'); // TODO
  };

  /*
  Builds content tree from an array of files. Use with <input type='file' multiple>
  */
  this.fileArray = function (fileArray) {
    throw new Error('Not implemented'); // TODO
  };

  /*
  Builds content tree from a webkitdirectory. Use with <input type='file' webkitdirectory>
  */
  this.webkitDirectory = function (fileArray) {
    throw new Error('Not implemented'); // TODO
  };

  /*
  Builds from a drop event. Currently only supports webkitdirectory.
  */
  this.dropEvent = function (event) {
    let items = event.dataTransfer.items;

    traversalComplete = false;
    for (var i = 0; i < items.length; i++) {
      if (items[i].webkitGetAsEntry) {
        traverseWebkitEntry(items[i].webkitGetAsEntry(), [], function () {
          contentTree = contentTree.nodes[0].nodes;
          _emit('digest', {});
        });
      } else {
        // TODO multiple and single files
      }
    }
    traversalComplete = true;
  };
}

module.exports = IO;

},{"../config/config.json":1,"../util/util.js":10}],6:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Serves static resources over WebRTC.

*/

const globalConfig = require('../config/config.json');

function StaticServer(views, hasVirtualBackend) {
  'use strict';

  const myPeerID = parseInt(Math.random() * 1e15, 10).toString(16),
        // A random PeerJS ID
  maxReconnectAttempts = globalConfig.maxReconnectAttempts; // Max attempts to connect to signalling server

  let peer,
      // The PeerJS peer object
  heartbeater,
      _handlers = {};

  const _emit = function _emit(event, data) {
    var fn = _handlers[event];
    if (fn && typeof fn === 'function') {
      fn(data);
    }
  };

  /*
      Listen for an event.
  */
  this.on = function on(event, handler) {
    _handlers[event] = handler;
  };

  // Fixes PeerJS' habit of disconnecting us from the signalling server
  const makePeerHeartbeater = function makePeerHeartbeater(peer) {
    let timeoutID = 0;

    function heartbeat() {
      timeoutID = setTimeout(heartbeat, 20000);
      if (peer.socket._wsOpen()) {
        peer.socket.send({
          type: 'HEARTBEAT'
        });
      }
    }
    heartbeat();

    return {
      start: function () {
        if (timeoutID === 0) {
          heartbeat();
        }
      },
      stop: function () {
        clearTimeout(timeoutID);
        timeoutID = 0;
      }
    };
  },


  // Returns the view for the provided path
  getView = function (path) {
    for (let i = 0; i < views.length; i++) {
      if (views[i].path === path) {
        return views[i];
      }
    }
  };

  this.clientURL = globalConfig.paths.client + myPeerID; // The URL where clients can connect
  this.views = views; // An array of compiled views

  /*
      Connects to signalling server and starts serving views.
  */
  this.launch = function launch() {
    this.config = this.config || globalConfig.peerJS;

    peer = new Peer(myPeerID, this.config); // Create the peer

    peer.on('open', function (id) {
      _emit('ready');
    });

    peer.on('error', err => {
      // TODO: Route PeerJS errors
    });
    heartbeater = makePeerHeartbeater(peer);

    // Handle incoming connections
    peer.on('connection', conn => {
      // TODO: Eventing

      conn.on('close', () => {
        // TODO: Eventing
      });

      // Any data received by the server is intended for the virtual backend
      conn.on('data', data => {
        // TODO: Eventing

        // Send server a request event
        if (data.type === 'request') {
          let event = new CustomEvent('hyperdata', {
            detail: {
              request: JSON.parse(data.request),
              connection: conn,
              id: data.id
            }
          });
          dispatchEvent(event);
        }

        // Intercept post-load view requests
        else if (data.type === 'view') {
            let view = getView(data.path);
            view.body = view.content;
            conn.send({
              type: 'view',
              path: data.path,
              content: {
                view: view,
                hasVirtualBackend: hasVirtualBackend
              }
            });
          }
      });
    });

    // Handle disconnections from signalling server
    let failures = 0;
    peer.on('disconnected', () => {
      // TODO: Eventing
      peer.reconnect(); // Auto-reconnect

      let check = setInterval(() => {
        // Check the reconnection worked
        if (!peer.disconnected) {
          // TODO: Eventing
          failures = 0;
          clearInterval(check);
        } else {
          failures++;
          if (failures >= maxReconnectAttempts) {
            // TODO: Eventing
            throw new Error('Could not reconnect to signalling server.');
          }
        }
      }, 1000);
    });

    return this.clientURL;
  };
}

module.exports = StaticServer;

},{"../config/config.json":1}],7:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

This module is used by a virtual server running INSIDE HyperHost.
It is not a component of HH itself, but a requirement for the virtual server.

It is similar to Express.js, but with HH connections instead of HTTP.

*/

// Constructor for the response object, which abstracts away PeerJS
var Response = function (conn, id) {
  this.body;
  this.send = function (data) {
    this.body = data;
    this.end();
  };
  this.end = function () {
    conn.send({
      type: 'response',
      id: id,
      content: {
        statuscode: this.statuscode,
        body: this.body
      }
    });
  };
  this.statuscode = 200;
  this.kill = function () {
    conn.close();
  };
};

// Creates the server app
module.exports.createApp = function () {
  var listening = false,


  // Constructs a new router function with the specified methods allowed
  RouterFunction = function (methods) {
    var routerFunction = function (route, requestListener, next) {
      addEventListener('hyperdata', function (e) {
        if (!listening) return; // Ignore requests made before server is started
        if (route !== e.detail.request.route) return; // Ignore invalid routes TODO: error here
        if (routerFunction.methods.indexOf(e.detail.request.method.toLowerCase()) === -1) {
          // Block invalid method
          console.error("Client requested unsupported route '" + e.detail.request.method + "' on route '" + route + "'");
          return;
        }
        console.log(e.detail.id + ' : ' + e.detail.request.method.toUpperCase() + ' ' + route);
        requestListener(e.detail.request, new Response(e.detail.connection, e.detail.id), next);
      }, false);
    };
    routerFunction.methods = methods;
    return routerFunction;
  };

  // Router functions for different methods
  app = {
    all: new RouterFunction(['get', 'post']),
    get: new RouterFunction(['get']),
    post: new RouterFunction(['post'])
  };

  // Allows requests to be served
  app.listen = function () {
    listening = true;
    console.log('Virtual server listenting...');
  };

  return app;
};

},{}],8:[function(require,module,exports){
/*
Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Emulates a Node.js server.

*/

const config = require('../config/config.json'),
      util = require('../util/util.js'),
      hyperhostRequireModule = require('./virtualModules/HH-hyperhost.js');

function VirtualServer(startScript, modules, jsonFiles) {
  'use strict';

  let moduleListing = [];

  // The 'require' emulator
  const HHrequire = function HHrequire(moduleName) {
    if (moduleListing.indexOf(moduleName) === -1) {
      return;
    } else {
      return modules[moduleName];
    }
  };

  // Gets a Wzrd.in url from module name
  const getWzrdModuleUrl = function getWzrdModuleUrl(name, version) {
    return config.paths.wzrd + name + jsonFiles['package']['dependencies'][name] + (version ? '@' + version : '');
  };

  /*
      Launch the virtual server.
  */
  this.launch = function launch() {
    let npmModuleList = Object.keys(jsonFiles['package']['dependencies']); // Get NPM modules from package.json
    moduleListing = Object.keys(modules);
    moduleListing = moduleListing.concat(npmModuleList);

    // Generate urls for wzrd.in files
    for (let i = 0; i < npmModuleList.length; i++) {
      modules[npmModuleList[i]] = getWzrdModuleUrl(npmModuleList[i], jsonFiles['package']['dependencies'][npmModuleList[i]]);
    }

    window.HyperHost.modules = modules; // Expose the modules

    // Inject the virtual backend modules
    util.injectScripts(moduleListing, modules, function () {
      // Wzrd will put everything on the window, so we need to move it to the modules
      for (let i = 0; i < npmModuleList.length; i++) {
        modules[npmModuleList[i]] = window[util.camelize(npmModuleList[i])];
      }

      // Add the HyperHost virtual module
      moduleListing.push('hyperhost');
      modules['hyperhost'] = hyperhostRequireModule;

      window.require = HHrequire; // Overwrite any other 'require' methods

      // Inject the virtual start script after modules loaded
      const script = document.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', startScript);
      document.head.appendChild(script);
    });
  };
}

module.exports = VirtualServer;

},{"../config/config.json":1,"../util/util.js":10,"./virtualModules/HH-hyperhost.js":7}],9:[function(require,module,exports){
module.exports={"123":"application/vnd.lotus-1-2-3","ez":"application/andrew-inset","aw":"application/applixware","atom":"application/atom+xml","atomcat":"application/atomcat+xml","atomsvc":"application/atomsvc+xml","ccxml":"application/ccxml+xml","cdmia":"application/cdmi-capability","cdmic":"application/cdmi-container","cdmid":"application/cdmi-domain","cdmio":"application/cdmi-object","cdmiq":"application/cdmi-queue","cu":"application/cu-seeme","mdp":"application/dash+xml","davmount":"application/davmount+xml","dbk":"application/docbook+xml","dssc":"application/dssc+der","xdssc":"application/dssc+xml","ecma":"application/ecmascript","emma":"application/emma+xml","epub":"application/epub+zip","exi":"application/exi","pfr":"application/font-tdpfr","woff":"application/font-woff","woff2":"application/font-woff2","gml":"application/gml+xml","gpx":"application/gpx+xml","gxf":"application/gxf","stk":"application/hyperstudio","ink":"application/inkml+xml","inkml":"application/inkml+xml","ipfix":"application/ipfix","jar":"application/java-archive","ser":"application/java-serialized-object","class":"application/java-vm","js":"application/javascript","json":"application/json","map":"application/json","json5":"application/json5","jsonml":"application/jsonml+json","lostxml":"application/lost+xml","hqx":"application/mac-binhex40","cpt":"application/mac-compactpro","mads":"application/mads+xml","mrc":"application/marc","mrcx":"application/marcxml+xml","ma":"application/mathematica","nb":"application/mathematica","mb":"application/mathematica","mathml":"application/mathml+xml","mbox":"application/mbox","mscml":"application/mediaservercontrol+xml","metalink":"application/metalink+xml","meta4":"application/metalink4+xml","mets":"application/mets+xml","mods":"application/mods+xml","m21":"application/mp21","mp21":"application/mp21","mp4s":"application/mp4","m4p":"application/mp4","doc":"application/msword","dot":"application/msword","mxf":"application/mxf","bin":"application/octet-stream","dms":"application/octet-stream","lrf":"application/octet-stream","mar":"application/octet-stream","so":"application/octet-stream","dist":"application/octet-stream","distz":"application/octet-stream","pkg":"application/octet-stream","bpk":"application/octet-stream","dump":"application/octet-stream","elc":"application/octet-stream","deploy":"application/octet-stream","buffer":"application/octet-stream","oda":"application/oda","opf":"application/oebps-package+xml","ogx":"application/ogg","omdoc":"application/omdoc+xml","onetoc":"application/onenote","onetoc2":"application/onenote","onetmp":"application/onenote","onepkg":"application/onenote","oxps":"application/oxps","xer":"application/patch-ops-error+xml","pdf":"application/pdf","pgp":"application/pgp-encrypted","asc":"application/pgp-signature","sig":"application/pgp-signature","prf":"application/pics-rules","p10":"application/pkcs10","p7m":"application/pkcs7-mime","p7c":"application/pkcs7-mime","p7s":"application/pkcs7-signature","p8":"application/pkcs8","ac":"application/pkix-attr-cert","cer":"application/pkix-cert","crl":"application/pkix-crl","pkipath":"application/pkix-pkipath","pki":"application/pkixcmp","pls":"application/pls+xml","ai":"application/postscript","eps":"application/postscript","ps":"application/postscript","cww":"application/prs.cww","pskcxml":"application/pskc+xml","rdf":"application/rdf+xml","rif":"application/reginfo+xml","rnc":"application/relax-ng-compact-syntax","rl":"application/resource-lists+xml","rld":"application/resource-lists-diff+xml","rs":"application/rls-services+xml","gbr":"application/rpki-ghostbusters","mft":"application/rpki-manifest","roa":"application/rpki-roa","rsd":"application/rsd+xml","rss":"application/rss+xml","rtf":"application/rtf","sbml":"application/sbml+xml","scq":"application/scvp-cv-request","scs":"application/scvp-cv-response","spq":"application/scvp-vp-request","spp":"application/scvp-vp-response","sdp":"application/sdp","setpay":"application/set-payment-initiation","setreg":"application/set-registration-initiation","shf":"application/shf+xml","smi":"application/smil+xml","smil":"application/smil+xml","rq":"application/sparql-query","srx":"application/sparql-results+xml","gram":"application/srgs","grxml":"application/srgs+xml","sru":"application/sru+xml","ssdl":"application/ssdl+xml","ssml":"application/ssml+xml","tei":"application/tei+xml","teicorpus":"application/tei+xml","tfi":"application/thraud+xml","tsd":"application/timestamped-data","plb":"application/vnd.3gpp.pic-bw-large","psb":"application/vnd.3gpp.pic-bw-small","pvb":"application/vnd.3gpp.pic-bw-var","tcap":"application/vnd.3gpp2.tcap","pwn":"application/vnd.3m.post-it-notes","aso":"application/vnd.accpac.simply.aso","imp":"application/vnd.accpac.simply.imp","acu":"application/vnd.acucobol","atc":"application/vnd.acucorp","acutc":"application/vnd.acucorp","air":"application/vnd.adobe.air-application-installer-package+zip","fcdt":"application/vnd.adobe.formscentral.fcdt","fxp":"application/vnd.adobe.fxp","fxpl":"application/vnd.adobe.fxp","xdp":"application/vnd.adobe.xdp+xml","xfdf":"application/vnd.adobe.xfdf","ahead":"application/vnd.ahead.space","azf":"application/vnd.airzip.filesecure.azf","azs":"application/vnd.airzip.filesecure.azs","azw":"application/vnd.amazon.ebook","acc":"application/vnd.americandynamics.acc","ami":"application/vnd.amiga.ami","apk":"application/vnd.android.package-archive","cii":"application/vnd.anser-web-certificate-issue-initiation","fti":"application/vnd.anser-web-funds-transfer-initiation","atx":"application/vnd.antix.game-component","mpkg":"application/vnd.apple.installer+xml","m3u8":"application/vnd.apple.mpegurl","swi":"application/vnd.aristanetworks.swi","iota":"application/vnd.astraea-software.iota","aep":"application/vnd.audiograph","mpm":"application/vnd.blueice.multipass","bmi":"application/vnd.bmi","rep":"application/vnd.businessobjects","cdxml":"application/vnd.chemdraw+xml","mmd":"application/vnd.chipnuts.karaoke-mmd","cdy":"application/vnd.cinderella","cla":"application/vnd.claymore","rp9":"application/vnd.cloanto.rp9","c4g":"application/vnd.clonk.c4group","c4d":"application/vnd.clonk.c4group","c4f":"application/vnd.clonk.c4group","c4p":"application/vnd.clonk.c4group","c4u":"application/vnd.clonk.c4group","c11amc":"application/vnd.cluetrust.cartomobile-config","c11amz":"application/vnd.cluetrust.cartomobile-config-pkg","csp":"application/vnd.commonspace","cdbcmsg":"application/vnd.contact.cmsg","cmc":"application/vnd.cosmocaller","clkx":"application/vnd.crick.clicker","clkk":"application/vnd.crick.clicker.keyboard","clkp":"application/vnd.crick.clicker.palette","clkt":"application/vnd.crick.clicker.template","clkw":"application/vnd.crick.clicker.wordbank","wbs":"application/vnd.criticaltools.wbs+xml","pml":"application/vnd.ctc-posml","ppd":"application/vnd.cups-ppd","car":"application/vnd.curl.car","pcurl":"application/vnd.curl.pcurl","dart":"application/vnd.dart","rdz":"application/vnd.data-vision.rdz","uvf":"application/vnd.dece.data","uvvf":"application/vnd.dece.data","uvd":"application/vnd.dece.data","uvvd":"application/vnd.dece.data","uvt":"application/vnd.dece.ttml+xml","uvvt":"application/vnd.dece.ttml+xml","uvx":"application/vnd.dece.unspecified","uvvx":"application/vnd.dece.unspecified","uvz":"application/vnd.dece.zip","uvvz":"application/vnd.dece.zip","fe_launch":"application/vnd.denovo.fcselayout-link","dna":"application/vnd.dna","mlp":"application/vnd.dolby.mlp","dpg":"application/vnd.dpgraph","dfac":"application/vnd.dreamfactory","kpxx":"application/vnd.ds-keypoint","ait":"application/vnd.dvb.ait","svc":"application/vnd.dvb.service","geo":"application/vnd.dynageo","mag":"application/vnd.ecowin.chart","nml":"application/vnd.enliven","esf":"application/vnd.epson.esf","msf":"application/vnd.epson.msf","qam":"application/vnd.epson.quickanime","slt":"application/vnd.epson.salt","ssf":"application/vnd.epson.ssf","es3":"application/vnd.eszigno3+xml","et3":"application/vnd.eszigno3+xml","ez2":"application/vnd.ezpix-album","ez3":"application/vnd.ezpix-package","fdf":"application/vnd.fdf","mseed":"application/vnd.fdsn.mseed","seed":"application/vnd.fdsn.seed","dataless":"application/vnd.fdsn.seed","gph":"application/vnd.flographit","ftc":"application/vnd.fluxtime.clip","fm":"application/vnd.framemaker","frame":"application/vnd.framemaker","maker":"application/vnd.framemaker","book":"application/vnd.framemaker","fnc":"application/vnd.frogans.fnc","ltf":"application/vnd.frogans.ltf","fsc":"application/vnd.fsc.weblaunch","oas":"application/vnd.fujitsu.oasys","oa2":"application/vnd.fujitsu.oasys2","oa3":"application/vnd.fujitsu.oasys3","fg5":"application/vnd.fujitsu.oasysgp","bh2":"application/vnd.fujitsu.oasysprs","ddd":"application/vnd.fujixerox.ddd","xdw":"application/vnd.fujixerox.docuworks","xbd":"application/vnd.fujixerox.docuworks.binder","fzs":"application/vnd.fuzzysheet","txd":"application/vnd.genomatix.tuxedo","ggb":"application/vnd.geogebra.file","ggt":"application/vnd.geogebra.tool","gex":"application/vnd.geometry-explorer","gre":"application/vnd.geometry-explorer","gxt":"application/vnd.geonext","g2w":"application/vnd.geoplan","g3w":"application/vnd.geospace","gmx":"application/vnd.gmx","kml":"application/vnd.google-earth.kml+xml","kmz":"application/vnd.google-earth.kmz","gqf":"application/vnd.grafeq","gqs":"application/vnd.grafeq","gac":"application/vnd.groove-account","ghf":"application/vnd.groove-help","gim":"application/vnd.groove-identity-message","grv":"application/vnd.groove-injector","gtm":"application/vnd.groove-tool-message","tpl":"application/vnd.groove-tool-template","vcg":"application/vnd.groove-vcard","hal":"application/vnd.hal+xml","zmm":"application/vnd.handheld-entertainment+xml","hbci":"application/vnd.hbci","les":"application/vnd.hhe.lesson-player","hpgl":"application/vnd.hp-hpgl","hpid":"application/vnd.hp-hpid","hps":"application/vnd.hp-hps","jlt":"application/vnd.hp-jlyt","pcl":"application/vnd.hp-pcl","pclxl":"application/vnd.hp-pclxl","mpy":"application/vnd.ibm.minipay","afp":"application/vnd.ibm.modcap","listafp":"application/vnd.ibm.modcap","list3820":"application/vnd.ibm.modcap","irm":"application/vnd.ibm.rights-management","sc":"application/vnd.ibm.secure-container","icc":"application/vnd.iccprofile","icm":"application/vnd.iccprofile","igl":"application/vnd.igloader","ivp":"application/vnd.immervision-ivp","ivu":"application/vnd.immervision-ivu","igm":"application/vnd.insors.igm","xpw":"application/vnd.intercon.formnet","xpx":"application/vnd.intercon.formnet","i2g":"application/vnd.intergeo","qbo":"application/vnd.intu.qbo","qfx":"application/vnd.intu.qfx","rcprofile":"application/vnd.ipunplugged.rcprofile","irp":"application/vnd.irepository.package+xml","xpr":"application/vnd.is-xpr","fcs":"application/vnd.isac.fcs","jam":"application/vnd.jam","rms":"application/vnd.jcp.javame.midlet-rms","jisp":"application/vnd.jisp","joda":"application/vnd.joost.joda-archive","ktz":"application/vnd.kahootz","ktr":"application/vnd.kahootz","karbon":"application/vnd.kde.karbon","chrt":"application/vnd.kde.kchart","kfo":"application/vnd.kde.kformula","flw":"application/vnd.kde.kivio","kon":"application/vnd.kde.kontour","kpr":"application/vnd.kde.kpresenter","kpt":"application/vnd.kde.kpresenter","ksp":"application/vnd.kde.kspread","kwd":"application/vnd.kde.kword","kwt":"application/vnd.kde.kword","htke":"application/vnd.kenameaapp","kia":"application/vnd.kidspiration","kne":"application/vnd.kinar","knp":"application/vnd.kinar","skp":"application/vnd.koan","skd":"application/vnd.koan","skt":"application/vnd.koan","skm":"application/vnd.koan","sse":"application/vnd.kodak-descriptor","lasxml":"application/vnd.las.las+xml","lbd":"application/vnd.llamagraphics.life-balance.desktop","lbe":"application/vnd.llamagraphics.life-balance.exchange+xml","apr":"application/vnd.lotus-approach","pre":"application/vnd.lotus-freelance","nsf":"application/vnd.lotus-notes","org":"application/vnd.lotus-organizer","scm":"application/vnd.lotus-screencam","lwp":"application/vnd.lotus-wordpro","portpkg":"application/vnd.macports.portpkg","mcd":"application/vnd.mcd","mc1":"application/vnd.medcalcdata","cdkey":"application/vnd.mediastation.cdkey","mwf":"application/vnd.mfer","mfm":"application/vnd.mfmp","flo":"application/vnd.micrografx.flo","igx":"application/vnd.micrografx.igx","mif":"application/vnd.mif","daf":"application/vnd.mobius.daf","dis":"application/vnd.mobius.dis","mbk":"application/vnd.mobius.mbk","mqy":"application/vnd.mobius.mqy","msl":"application/vnd.mobius.msl","plc":"application/vnd.mobius.plc","txf":"application/vnd.mobius.txf","mpn":"application/vnd.mophun.application","mpc":"application/vnd.mophun.certificate","xul":"application/vnd.mozilla.xul+xml","cil":"application/vnd.ms-artgalry","cab":"application/vnd.ms-cab-compressed","xls":"application/vnd.ms-excel","xlm":"application/vnd.ms-excel","xla":"application/vnd.ms-excel","xlc":"application/vnd.ms-excel","xlt":"application/vnd.ms-excel","xlw":"application/vnd.ms-excel","xlam":"application/vnd.ms-excel.addin.macroenabled.12","xlsb":"application/vnd.ms-excel.sheet.binary.macroenabled.12","xlsm":"application/vnd.ms-excel.sheet.macroenabled.12","xltm":"application/vnd.ms-excel.template.macroenabled.12","eot":"application/vnd.ms-fontobject","chm":"application/vnd.ms-htmlhelp","ims":"application/vnd.ms-ims","lrm":"application/vnd.ms-lrm","thmx":"application/vnd.ms-officetheme","cat":"application/vnd.ms-pki.seccat","stl":"application/vnd.ms-pki.stl","ppt":"application/vnd.ms-powerpoint","pps":"application/vnd.ms-powerpoint","pot":"application/vnd.ms-powerpoint","ppam":"application/vnd.ms-powerpoint.addin.macroenabled.12","pptm":"application/vnd.ms-powerpoint.presentation.macroenabled.12","sldm":"application/vnd.ms-powerpoint.slide.macroenabled.12","ppsm":"application/vnd.ms-powerpoint.slideshow.macroenabled.12","potm":"application/vnd.ms-powerpoint.template.macroenabled.12","mpp":"application/vnd.ms-project","mpt":"application/vnd.ms-project","docm":"application/vnd.ms-word.document.macroenabled.12","dotm":"application/vnd.ms-word.template.macroenabled.12","wps":"application/vnd.ms-works","wks":"application/vnd.ms-works","wcm":"application/vnd.ms-works","wdb":"application/vnd.ms-works","wpl":"application/vnd.ms-wpl","xps":"application/vnd.ms-xpsdocument","mseq":"application/vnd.mseq","mus":"application/vnd.musician","msty":"application/vnd.muvee.style","taglet":"application/vnd.mynfc","nlu":"application/vnd.neurolanguage.nlu","ntf":"application/vnd.nitf","nitf":"application/vnd.nitf","nnd":"application/vnd.noblenet-directory","nns":"application/vnd.noblenet-sealer","nnw":"application/vnd.noblenet-web","ngdat":"application/vnd.nokia.n-gage.data","rpst":"application/vnd.nokia.radio-preset","rpss":"application/vnd.nokia.radio-presets","edm":"application/vnd.novadigm.edm","edx":"application/vnd.novadigm.edx","ext":"application/vnd.novadigm.ext","odc":"application/vnd.oasis.opendocument.chart","otc":"application/vnd.oasis.opendocument.chart-template","odb":"application/vnd.oasis.opendocument.database","odf":"application/vnd.oasis.opendocument.formula","odft":"application/vnd.oasis.opendocument.formula-template","odg":"application/vnd.oasis.opendocument.graphics","otg":"application/vnd.oasis.opendocument.graphics-template","odi":"application/vnd.oasis.opendocument.image","oti":"application/vnd.oasis.opendocument.image-template","odp":"application/vnd.oasis.opendocument.presentation","otp":"application/vnd.oasis.opendocument.presentation-template","ods":"application/vnd.oasis.opendocument.spreadsheet","ots":"application/vnd.oasis.opendocument.spreadsheet-template","odt":"application/vnd.oasis.opendocument.text","odm":"application/vnd.oasis.opendocument.text-master","ott":"application/vnd.oasis.opendocument.text-template","oth":"application/vnd.oasis.opendocument.text-web","xo":"application/vnd.olpc-sugar","dd2":"application/vnd.oma.dd2+xml","oxt":"application/vnd.openofficeorg.extension","pptx":"application/vnd.openxmlformats-officedocument.presentationml.presentation","sldx":"application/vnd.openxmlformats-officedocument.presentationml.slide","ppsx":"application/vnd.openxmlformats-officedocument.presentationml.slideshow","potx":"application/vnd.openxmlformats-officedocument.presentationml.template","xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","xltx":"application/vnd.openxmlformats-officedocument.spreadsheetml.template","docx":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","dotx":"application/vnd.openxmlformats-officedocument.wordprocessingml.template","mgp":"application/vnd.osgeo.mapguide.package","dp":"application/vnd.osgi.dp","esa":"application/vnd.osgi.subsystem","pdb":"application/vnd.palm","pqa":"application/vnd.palm","oprc":"application/vnd.palm","paw":"application/vnd.pawaafile","str":"application/vnd.pg.format","ei6":"application/vnd.pg.osasli","efif":"application/vnd.picsel","wg":"application/vnd.pmi.widget","plf":"application/vnd.pocketlearn","pbd":"application/vnd.powerbuilder6","box":"application/vnd.previewsystems.box","mgz":"application/vnd.proteus.magazine","qps":"application/vnd.publishare-delta-tree","ptid":"application/vnd.pvi.ptid1","qxd":"application/vnd.quark.quarkxpress","qxt":"application/vnd.quark.quarkxpress","qwd":"application/vnd.quark.quarkxpress","qwt":"application/vnd.quark.quarkxpress","qxl":"application/vnd.quark.quarkxpress","qxb":"application/vnd.quark.quarkxpress","bed":"application/vnd.realvnc.bed","mxl":"application/vnd.recordare.musicxml","musicxml":"application/vnd.recordare.musicxml+xml","cryptonote":"application/vnd.rig.cryptonote","cod":"application/vnd.rim.cod","rm":"application/vnd.rn-realmedia","rmvb":"application/vnd.rn-realmedia-vbr","link66":"application/vnd.route66.link66+xml","st":"application/vnd.sailingtracker.track","see":"application/vnd.seemail","sema":"application/vnd.sema","semd":"application/vnd.semd","semf":"application/vnd.semf","ifm":"application/vnd.shana.informed.formdata","itp":"application/vnd.shana.informed.formtemplate","iif":"application/vnd.shana.informed.interchange","ipk":"application/vnd.shana.informed.package","twd":"application/vnd.simtech-mindmapper","twds":"application/vnd.simtech-mindmapper","mmf":"application/vnd.smaf","teacher":"application/vnd.smart.teacher","sdkm":"application/vnd.solent.sdkm+xml","sdkd":"application/vnd.solent.sdkm+xml","dxp":"application/vnd.spotfire.dxp","sfs":"application/vnd.spotfire.sfs","sdc":"application/vnd.stardivision.calc","sda":"application/vnd.stardivision.draw","sdd":"application/vnd.stardivision.impress","smf":"application/vnd.stardivision.math","sdw":"application/vnd.stardivision.writer","vor":"application/vnd.stardivision.writer","sgl":"application/vnd.stardivision.writer-global","smzip":"application/vnd.stepmania.package","sm":"application/vnd.stepmania.stepchart","sxc":"application/vnd.sun.xml.calc","stc":"application/vnd.sun.xml.calc.template","sxd":"application/vnd.sun.xml.draw","std":"application/vnd.sun.xml.draw.template","sxi":"application/vnd.sun.xml.impress","sti":"application/vnd.sun.xml.impress.template","sxm":"application/vnd.sun.xml.math","sxw":"application/vnd.sun.xml.writer","sxg":"application/vnd.sun.xml.writer.global","stw":"application/vnd.sun.xml.writer.template","sus":"application/vnd.sus-calendar","susp":"application/vnd.sus-calendar","svd":"application/vnd.svd","sis":"application/vnd.symbian.install","sisx":"application/vnd.symbian.install","xsm":"application/vnd.syncml+xml","bdm":"application/vnd.syncml.dm+wbxml","xdm":"application/vnd.syncml.dm+xml","tao":"application/vnd.tao.intent-module-archive","pcap":"application/vnd.tcpdump.pcap","cap":"application/vnd.tcpdump.pcap","dmp":"application/vnd.tcpdump.pcap","tmo":"application/vnd.tmobile-livetv","tpt":"application/vnd.trid.tpt","mxs":"application/vnd.triscape.mxs","tra":"application/vnd.trueapp","ufd":"application/vnd.ufdl","ufdl":"application/vnd.ufdl","utz":"application/vnd.uiq.theme","umj":"application/vnd.umajin","unityweb":"application/vnd.unity","uoml":"application/vnd.uoml+xml","vcx":"application/vnd.vcx","vsd":"application/vnd.visio","vst":"application/vnd.visio","vss":"application/vnd.visio","vsw":"application/vnd.visio","vis":"application/vnd.visionary","vsf":"application/vnd.vsf","wbxml":"application/vnd.wap.wbxml","wmlc":"application/vnd.wap.wmlc","wmlsc":"application/vnd.wap.wmlscriptc","wtb":"application/vnd.webturbo","nbp":"application/vnd.wolfram.player","wpd":"application/vnd.wordperfect","wqd":"application/vnd.wqd","stf":"application/vnd.wt.stf","xar":"application/vnd.xara","xfdl":"application/vnd.xfdl","hvd":"application/vnd.yamaha.hv-dic","hvs":"application/vnd.yamaha.hv-script","hvp":"application/vnd.yamaha.hv-voice","osf":"application/vnd.yamaha.openscoreformat","osfpvg":"application/vnd.yamaha.openscoreformat.osfpvg+xml","saf":"application/vnd.yamaha.smaf-audio","spf":"application/vnd.yamaha.smaf-phrase","cmp":"application/vnd.yellowriver-custom-menu","zir":"application/vnd.zul","zirz":"application/vnd.zul","zaz":"application/vnd.zzazz.deck+xml","vxml":"application/voicexml+xml","wgt":"application/widget","hlp":"application/winhlp","wsdl":"application/wsdl+xml","wspolicy":"application/wspolicy+xml","7z":"application/x-7z-compressed","abw":"application/x-abiword","ace":"application/x-ace-compressed","dmg":"application/x-apple-diskimage","aab":"application/x-authorware-bin","x32":"application/x-authorware-bin","u32":"application/x-authorware-bin","vox":"application/x-authorware-bin","aam":"application/x-authorware-map","aas":"application/x-authorware-seg","bcpio":"application/x-bcpio","torrent":"application/x-bittorrent","blb":"application/x-blorb","blorb":"application/x-blorb","bz":"application/x-bzip","bz2":"application/x-bzip2","boz":"application/x-bzip2","cbr":"application/x-cbr","cba":"application/x-cbr","cbt":"application/x-cbr","cbz":"application/x-cbr","cb7":"application/x-cbr","vcd":"application/x-cdlink","cfs":"application/x-cfs-compressed","chat":"application/x-chat","pgn":"application/x-chess-pgn","crx":"application/x-chrome-extension","nsc":"application/x-conference","cpio":"application/x-cpio","csh":"application/x-csh","deb":"application/x-debian-package","udeb":"application/x-debian-package","dgc":"application/x-dgc-compressed","dir":"application/x-director","dcr":"application/x-director","dxr":"application/x-director","cst":"application/x-director","cct":"application/x-director","cxt":"application/x-director","w3d":"application/x-director","fgd":"application/x-director","swa":"application/x-director","wad":"application/x-doom","ncx":"application/x-dtbncx+xml","dtb":"application/x-dtbook+xml","res":"application/x-dtbresource+xml","dvi":"application/x-dvi","evy":"application/x-envoy","eva":"application/x-eva","bdf":"application/x-font-bdf","gsf":"application/x-font-ghostscript","psf":"application/x-font-linux-psf","otf":"font/opentype","pcf":"application/x-font-pcf","snf":"application/x-font-snf","ttf":"application/x-font-ttf","ttc":"application/x-font-ttf","pfa":"application/x-font-type1","pfb":"application/x-font-type1","pfm":"application/x-font-type1","afm":"application/x-font-type1","arc":"application/x-freearc","spl":"application/x-futuresplash","gca":"application/x-gca-compressed","ulx":"application/x-glulx","gnumeric":"application/x-gnumeric","gramps":"application/x-gramps-xml","gtar":"application/x-gtar","hdf":"application/x-hdf","install":"application/x-install-instructions","iso":"application/x-iso9660-image","jnlp":"application/x-java-jnlp-file","latex":"application/x-latex","luac":"application/x-lua-bytecode","lzh":"application/x-lzh-compressed","lha":"application/x-lzh-compressed","mie":"application/x-mie","prc":"application/x-mobipocket-ebook","mobi":"application/x-mobipocket-ebook","application":"application/x-ms-application","lnk":"application/x-ms-shortcut","wmd":"application/x-ms-wmd","wmz":"application/x-msmetafile","xbap":"application/x-ms-xbap","mdb":"application/x-msaccess","obd":"application/x-msbinder","crd":"application/x-mscardfile","clp":"application/x-msclip","exe":"application/x-msdownload","dll":"application/x-msdownload","com":"application/x-msdownload","bat":"application/x-msdownload","msi":"application/x-msdownload","mvb":"application/x-msmediaview","m13":"application/x-msmediaview","m14":"application/x-msmediaview","wmf":"application/x-msmetafile","emf":"application/x-msmetafile","emz":"application/x-msmetafile","mny":"application/x-msmoney","pub":"application/x-mspublisher","scd":"application/x-msschedule","trm":"application/x-msterminal","wri":"application/x-mswrite","nc":"application/x-netcdf","cdf":"application/x-netcdf","nzb":"application/x-nzb","p12":"application/x-pkcs12","pfx":"application/x-pkcs12","p7b":"application/x-pkcs7-certificates","spc":"application/x-pkcs7-certificates","p7r":"application/x-pkcs7-certreqresp","rar":"application/x-rar-compressed","ris":"application/x-research-info-systems","sh":"application/x-sh","shar":"application/x-shar","swf":"application/x-shockwave-flash","xap":"application/x-silverlight-app","sql":"application/x-sql","sit":"application/x-stuffit","sitx":"application/x-stuffitx","srt":"application/x-subrip","sv4cpio":"application/x-sv4cpio","sv4crc":"application/x-sv4crc","t3":"application/x-t3vm-image","gam":"application/x-tads","tar":"application/x-tar","tcl":"application/x-tcl","tex":"application/x-tex","tfm":"application/x-tex-tfm","texinfo":"application/x-texinfo","texi":"application/x-texinfo","obj":"application/x-tgif","ustar":"application/x-ustar","src":"application/x-wais-source","webapp":"application/x-web-app-manifest+json","der":"application/x-x509-ca-cert","crt":"application/x-x509-ca-cert","fig":"application/x-xfig","xlf":"application/x-xliff+xml","xpi":"application/x-xpinstall","xz":"application/x-xz","z1":"application/x-zmachine","z2":"application/x-zmachine","z3":"application/x-zmachine","z4":"application/x-zmachine","z5":"application/x-zmachine","z6":"application/x-zmachine","z7":"application/x-zmachine","z8":"application/x-zmachine","xaml":"application/xaml+xml","xdf":"application/xcap-diff+xml","xenc":"application/xenc+xml","xhtml":"application/xhtml+xml","xht":"application/xhtml+xml","xml":"application/xml","xsl":"application/xml","xsd":"application/xml","dtd":"application/xml-dtd","xop":"application/xop+xml","xpl":"application/xproc+xml","xslt":"application/xslt+xml","xspf":"application/xspf+xml","mxml":"application/xv+xml","xhvml":"application/xv+xml","xvml":"application/xv+xml","xvm":"application/xv+xml","yang":"application/yang","yin":"application/yin+xml","zip":"application/zip","adp":"audio/adpcm","au":"audio/basic","snd":"audio/basic","mid":"audio/midi","midi":"audio/midi","kar":"audio/midi","rmi":"audio/midi","mp4a":"audio/mp4","m4a":"audio/mp4","mpga":"audio/mpeg","mp2":"audio/mpeg","mp2a":"audio/mpeg","mp3":"audio/mpeg","m2a":"audio/mpeg","m3a":"audio/mpeg","oga":"audio/ogg","ogg":"audio/ogg","spx":"audio/ogg","s3m":"audio/s3m","sil":"audio/silk","uva":"audio/vnd.dece.audio","uvva":"audio/vnd.dece.audio","eol":"audio/vnd.digital-winds","dra":"audio/vnd.dra","dts":"audio/vnd.dts","dtshd":"audio/vnd.dts.hd","lvp":"audio/vnd.lucent.voice","pya":"audio/vnd.ms-playready.media.pya","ecelp4800":"audio/vnd.nuera.ecelp4800","ecelp7470":"audio/vnd.nuera.ecelp7470","ecelp9600":"audio/vnd.nuera.ecelp9600","rip":"audio/vnd.rip","weba":"audio/webm","aac":"audio/x-aac","aif":"audio/x-aiff","aiff":"audio/x-aiff","aifc":"audio/x-aiff","caf":"audio/x-caf","flac":"audio/x-flac","mka":"audio/x-matroska","m3u":"audio/x-mpegurl","wax":"audio/x-ms-wax","wma":"audio/x-ms-wma","ram":"audio/x-pn-realaudio","ra":"audio/x-pn-realaudio","rmp":"audio/x-pn-realaudio-plugin","wav":"audio/x-wav","xm":"audio/xm","cdx":"chemical/x-cdx","cif":"chemical/x-cif","cmdf":"chemical/x-cmdf","cml":"chemical/x-cml","csml":"chemical/x-csml","xyz":"chemical/x-xyz","bmp":"image/bmp","cgm":"image/cgm","g3":"image/g3fax","gif":"image/gif","ief":"image/ief","jpeg":"image/jpeg","jpg":"image/jpeg","jpe":"image/jpeg","ktx":"image/ktx","png":"image/png","btif":"image/prs.btif","sgi":"image/sgi","svg":"image/svg+xml","svgz":"image/svg+xml","tiff":"image/tiff","tif":"image/tiff","psd":"image/vnd.adobe.photoshop","uvi":"image/vnd.dece.graphic","uvvi":"image/vnd.dece.graphic","uvg":"image/vnd.dece.graphic","uvvg":"image/vnd.dece.graphic","djvu":"image/vnd.djvu","djv":"image/vnd.djvu","sub":"text/vnd.dvb.subtitle","dwg":"image/vnd.dwg","dxf":"image/vnd.dxf","fbs":"image/vnd.fastbidsheet","fpx":"image/vnd.fpx","fst":"image/vnd.fst","mmr":"image/vnd.fujixerox.edmics-mmr","rlc":"image/vnd.fujixerox.edmics-rlc","mdi":"image/vnd.ms-modi","wdp":"image/vnd.ms-photo","npx":"image/vnd.net-fpx","wbmp":"image/vnd.wap.wbmp","xif":"image/vnd.xiff","webp":"image/webp","3ds":"image/x-3ds","ras":"image/x-cmu-raster","cmx":"image/x-cmx","fh":"image/x-freehand","fhc":"image/x-freehand","fh4":"image/x-freehand","fh5":"image/x-freehand","fh7":"image/x-freehand","ico":"image/x-icon","sid":"image/x-mrsid-image","pcx":"image/x-pcx","pic":"image/x-pict","pct":"image/x-pict","pnm":"image/x-portable-anymap","pbm":"image/x-portable-bitmap","pgm":"image/x-portable-graymap","ppm":"image/x-portable-pixmap","rgb":"image/x-rgb","tga":"image/x-tga","xbm":"image/x-xbitmap","xpm":"image/x-xpixmap","xwd":"image/x-xwindowdump","eml":"message/rfc822","mime":"message/rfc822","igs":"model/iges","iges":"model/iges","msh":"model/mesh","mesh":"model/mesh","silo":"model/mesh","dae":"model/vnd.collada+xml","dwf":"model/vnd.dwf","gdl":"model/vnd.gdl","gtw":"model/vnd.gtw","mts":"model/vnd.mts","vtu":"model/vnd.vtu","wrl":"model/vrml","vrml":"model/vrml","x3db":"model/x3d+binary","x3dbz":"model/x3d+binary","x3dv":"model/x3d+vrml","x3dvz":"model/x3d+vrml","x3d":"model/x3d+xml","x3dz":"model/x3d+xml","appcache":"text/cache-manifest","manifest":"text/cache-manifest","ics":"text/calendar","ifb":"text/calendar","coffee":"text/coffeescript","css":"text/css","csv":"text/csv","hjson":"text/hjson","html":"text/html","htm":"text/html","jade":"text/jade","jsx":"text/jsx","less":"text/less","n3":"text/n3","txt":"text/plain","text":"text/plain","conf":"text/plain","def":"text/plain","list":"text/plain","log":"text/plain","in":"text/plain","ini":"text/plain","dsc":"text/prs.lines.tag","rtx":"text/richtext","sgml":"text/sgml","sgm":"text/sgml","stylus":"text/stylus","styl":"text/stylus","tsv":"text/tab-separated-values","t":"text/troff","tr":"text/troff","roff":"text/troff","man":"text/troff","me":"text/troff","ms":"text/troff","ttl":"text/turtle","uri":"text/uri-list","uris":"text/uri-list","urls":"text/uri-list","vcard":"text/vcard","curl":"text/vnd.curl","dcurl":"text/vnd.curl.dcurl","mcurl":"text/vnd.curl.mcurl","scurl":"text/vnd.curl.scurl","fly":"text/vnd.fly","flx":"text/vnd.fmi.flexstor","gv":"text/vnd.graphviz","3dml":"text/vnd.in3d.3dml","spot":"text/vnd.in3d.spot","jad":"text/vnd.sun.j2me.app-descriptor","wml":"text/vnd.wap.wml","wmls":"text/vnd.wap.wmlscript","vtt":"text/vtt","s":"text/x-asm","asm":"text/x-asm","c":"text/x-c","cc":"text/x-c","cxx":"text/x-c","cpp":"text/x-c","h":"text/x-c","hh":"text/x-c","dic":"text/x-c","htc":"text/x-component","f":"text/x-fortran","for":"text/x-fortran","f77":"text/x-fortran","f90":"text/x-fortran","hbs":"text/x-handlebars-template","java":"text/x-java-source","lua":"text/x-lua","markdown":"text/x-markdown","md":"text/x-markdown","mkd":"text/x-markdown","nfo":"text/x-nfo","opml":"text/x-opml","p":"text/x-pascal","pas":"text/x-pascal","sass":"text/x-sass","scss":"text/x-scss","etx":"text/x-setext","sfv":"text/x-sfv","uu":"text/x-uuencode","vcs":"text/x-vcalendar","vcf":"text/x-vcard","yaml":"text/yaml","yml":"text/yaml","3gp":"video/3gpp","3g2":"video/3gpp2","h261":"video/h261","h263":"video/h263","h264":"video/h264","jpgv":"video/jpeg","jpm":"video/jpm","jpgm":"video/jpm","mj2":"video/mj2","mjp2":"video/mj2","ts":"video/mp2t","mp4":"video/mp4","mp4v":"video/mp4","mpg4":"video/mp4","mpeg":"video/mpeg","mpg":"video/mpeg","mpe":"video/mpeg","m1v":"video/mpeg","m2v":"video/mpeg","ogv":"video/ogg","qt":"video/quicktime","mov":"video/quicktime","uvh":"video/vnd.dece.hd","uvvh":"video/vnd.dece.hd","uvm":"video/vnd.dece.mobile","uvvm":"video/vnd.dece.mobile","uvp":"video/vnd.dece.pd","uvvp":"video/vnd.dece.pd","uvs":"video/vnd.dece.sd","uvvs":"video/vnd.dece.sd","uvv":"video/vnd.dece.video","uvvv":"video/vnd.dece.video","dvb":"video/vnd.dvb.file","fvt":"video/vnd.fvt","mxu":"video/vnd.mpegurl","m4u":"video/vnd.mpegurl","pyv":"video/vnd.ms-playready.media.pyv","uvu":"video/vnd.uvvu.mp4","uvvu":"video/vnd.uvvu.mp4","viv":"video/vnd.vivo","webm":"video/webm","f4v":"video/x-f4v","fli":"video/x-fli","flv":"video/x-flv","m4v":"video/x-m4v","mkv":"video/x-matroska","mk3d":"video/x-matroska","mks":"video/x-matroska","mng":"video/x-mng","asf":"video/x-ms-asf","asx":"video/x-ms-asf","vob":"video/x-ms-vob","wm":"video/x-ms-wm","wmv":"video/x-ms-wmv","wmx":"video/x-ms-wmx","wvx":"video/x-ms-wvx","avi":"video/x-msvideo","movie":"video/x-sgi-movie","smv":"video/x-smv","ice":"x-conference/x-cooltalk"}
},{}],10:[function(require,module,exports){
/*

Copyright (c) 2016 Thomas Mullen. All rights reserved.
MIT License

Utilities.

*/

var mimeTypes = require('./mimeTypes.json');

var base64 = {
  _keyStr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',

  encode: function (input) {
    var output = '',
        chr1,
        chr2,
        chr3,
        enc1,
        enc2,
        enc3,
        enc4,
        i = 0;

    input = base64._utf8_encode(input);

    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = (chr1 & 3) << 4 | chr2 >> 4;
      enc3 = (chr2 & 15) << 2 | chr3 >> 6;
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
    }
    return output;
  },

  // private method for UTF-8 encoding
  _utf8_encode: function (string) {
    string = string.replace(/\r\n/g, '\n');

    var utftext = '';

    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utftext += String.fromCharCode(c >> 6 | 192) + String.fromCharCode(c & 63 | 128);
      } else {
        utftext += String.fromCharCode(c >> 12 | 224);
        +String.fromCharCode(c >> 6 & 63 | 128);
        +String.fromCharCode(c & 63 | 128);
      }
    }
    return utftext;
  }
};

// Escapes a regex expression
module.exports.escapeRegex = function (str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
};

// Creates a dataURI from some data
module.exports.toDataURI = function (content, extension) {
  var prefix = 'data:' + mimeTypes[extension] + ';base64,';

  if (content.slice(0, 5) === 'data:') {
    return content; // Likely alredy encoded
  }
  if (content.indexOf(prefix) !== -1) {
    return content; // Likely to be already encoded
  }
  try {
    return prefix + base64.encode(content);
  } catch (err) {
    console.warn(err);
    try {
      return prefix + base64.encode(unescape(encodeURIComponent(content)));
    } catch (err) {
      console.warn(err);
      return '';
    }
  }
};

// Gets the extension of a file name
module.exports.nameToExtension = function (name) {
  var ext = name.split('.');
  ext = ext[ext.length - 1].toLowerCase();
  return ext;
};

// Check if array contains an item
module.exports.contains = function (array, item) {
  return array.indexOf(item) !== -1;
};

// Deeply sets a nested object/array tree, creating ancestors where they are missing
// Ancestors is an array of names that lead from root to the target object
module.exports.deepSetTree = function (tempObj, value, ancestors) {
  for (var i = 0; i < ancestors.length; i++) {
    var found = false;
    for (var i2 = 0; i2 < tempObj.nodes.length; i2++) {
      // Locate the ancestors
      if (tempObj.nodes[i2].name === ancestors[i]) {
        tempObj = tempObj.nodes[i2];
        found = true;
        break;
      }
    }
    if (!found) {
      tempObj.nodes.push({ // Create the ancestor if it doesn't exits
        name: ancestors[i],
        nodes: []
      });
      for (var i2 = 0; i2 < tempObj.nodes.length; i2++) {
        // Get the reference of the new object
        if (tempObj.nodes[i2].name === ancestors[i]) {
          tempObj = tempObj.nodes[i2];
          break;
        }
      }
    }
  }
  tempObj.nodes.push(value);
};

// Injects an array of urls as scripts into the document
module.exports.injectScripts = function (scripts, mappingObject, callback) {
  var remaining = scripts.length;

  function loadScript(i) {
    if (!scripts[i]) {
      callback();
      return;
    }
    var script = document.createElement('script');
    script.type = 'text/javascript';

    if (script.readyState) {
      // IE
      script.onreadystatechange = function () {
        if (script.readyState === 'loaded' || script.readyState === 'complete') {
          script.onreadystatechange = null;
          remaining--;
          if (remaining === 0) {
            callback();
          } else {
            if (i < scripts.length - 1) {
              loadScript(i + 1);
            }
          }
        }
      };
    } else {
      // Others
      script.onload = function () {
        remaining--;
        if (remaining === 0) {
          callback();
        } else {
          loadScript(i + 1);
        }
      };
    }

    script.src = mappingObject[scripts[i]];
    document.getElementsByTagName('head')[0].appendChild(script);
  }
  loadScript(0);
};

// Basic ajax call
module.exports.ajax = function (method, url, xOriginProxy, successCallback, errorCallback) {
  var xhr = new XMLHttpRequest();
  url = xOriginProxy + url;
  xhr.open(method, url, true);
  xhr.onreadystatechange = function (e) {
    if (this.readyState === 4) {
      if (this.status >= 200 && this.status < 400) {
        if (successCallback && successCallback.constructor == Function) {
          return successCallback(this.responseText);
        }
      } else {
        if (errorCallback && errorCallback.constructor == Function) {
          return errorCallback(this.statusText);
        } else {
          console.error("Failed to get resource '" + url + "' Error: " + this.statusText);
        }
      }
    }
  };
  xhr.onerror = function (e) {
    if (errorCallback && errorCallback.constructor == Function) {
      return errorCallback(this.statusText);
    } else {
      console.error('Failed to get resource. Error: ' + this.statusText);
    }
  };
  xhr.send(null);
};

// Ajax-es an array of urls, only returning when all have been loaded
module.exports.ajaxMulti = function (arr, successCallback, errorCallback) {
  var result = [];
  var remaining = arr.length;
  for (var i = 0; i < arr.length; i++) {
    ajax(arr[i], function (data) {
      result[i] = data;
      remaining--;
      if (remaining === 0) {
        successCallback(result);
      }
    }, errorCallback);
  }
};

// dash-case to camelCase
module.exports.camelize = function (str) {
  return str.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
};

},{"./mimeTypes.json":9}]},{},[2])(2)
});