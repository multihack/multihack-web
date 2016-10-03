var assert = require("assert");
var ports = require("./index.js");
var fs = require("fs");

ports.ports_file = tmp() + "/ports-test.json";
ports.base_port = 6000;

var tests = {}

tests.test_getPort = function() {
  ports.getPort("foo");
  var expect = {
    "6001": {
      "name": "foo"
    }
  };
  var result = read_json(ports.ports_file);
  assert.deepEqual(result, expect);
}

tests.test_getPortAgain = function() {
  ports.getPort("foo");
  ports.getPort("bar");
  var expect = {
    "6001": {
      "name": "foo"
    },
    "6002": {
      "name": "bar"
    }
  };
  var result = read_json(ports.ports_file);
  assert.deepEqual(result, expect);
}

tests.test_setData = function() {
  ports.getPort("baz", {"meta":"data"});
  var expect = {
    "6001": {
      "name": "foo"
    },
    "6002": {
      "name": "bar"
    },
    "6003": {
      "name": "baz",
      "meta": "data"
    }
  };

  var result = read_json(ports.ports_file);
  assert.deepEqual(result, expect);
}


try {
  run_test("test_getPort");
  run_test("test_getPortAgain");
  run_test("test_setData");
  console.log("All tests OK.")
} catch(e) {
  throw e;
} finally {
  cleanup();
}

function cleanup() {
  try {
    fs.unlinkSync(ports.ports_file);
  } catch (e) {
    // yup
  }
}

function run_test(name) {
  try {
    tests[name]();
    console.log("OK: %s.", name);
  } catch(e) {
    console.log("Fail: %j.", name, e);
    throw e;
  }
}

function read_json(filename) {
  return JSON.parse(fs.readFileSync(filename));
}

function tmp() {
  if(process.platform == "win32") {
    return process.env["TMP"];
  }
  return process.env["TMPDIR"];
}