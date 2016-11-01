// Manage a registry of unique port assignments for
// an operating system. Store user-defined meta-data
// with each port.

// The registry lives in ~/.ports

// Note that this module currently doesn’t check whether
// a port is actually available. That’s TBD.

var fs = require("fs");
var path = require("path");

module.exports.ports_file = getPortsFile();
module.exports.base_port = 6000;

module.exports.getPort = function getPort(name, data) {

  data = data || {};
  var map = read_json(module.exports.ports_file);
  var max_port = module.exports.base_port;

  for(var port_m in map) {
    port_m = parseInt(port_m, 10);

    if(port_m > max_port) {
      max_port = port_m;
    }

    var name_m = map[port_m].name;
    if(name_m == name) {
      return port_m;
    }
  }

  // if we got here, max_port is the highest registered port
  var new_port = max_port + 1;
  data.name = name;
  map[new_port] = data;

  write_json(module.exports.ports_file, map);
  return new_port;
};

var read_json = function read_json(filename, default_value) {
  try {
    return JSON.parse(fs.readFileSync(filename));
  } catch(e) {
    return default_value || {};
  }
};

var write_json = function write_json(filename, value) {
  fs.writeFileSync(filename + ".tmp", JSON.stringify(value));
  fs.renameSync(filename + ".tmp", filename);
};

function getPortsFile() {
  var homedir = "HOME";
  if(process.platform === "win32") {
    homedir = "USERPROFILE";
  }
  return path.join(process.env[homedir],".ports.json");
};

module.exports._getPortsFile = getPortsFile;