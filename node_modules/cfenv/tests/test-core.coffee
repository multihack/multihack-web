# Licensed under the Apache License. See footer for details.

fs   = require "fs"
path = require "path"

_      = require "underscore"
coffee = require "coffee-script"
expect = require "expect.js"
ports  = require "ports"

cfenv = require ".."

SavedEnv = JSON.stringify process.env
SavedDir = process.cwd()
TestDir  = path.join SavedDir, "tmp"

SampleName = "cf-env-testing-app"
SamplePort = ports.getPort SampleName

Manifest_01 = """
"""

#-------------------------------------------------------------------------------
describe "appEnv", ->

  #-----------------------------------------------------------------------------
  beforeEach ->
    process.env = {}
    process.chdir TestDir
    fs.unlinkSync "manifest.yml" if fs.existsSync "manifest.yml"
    fs.unlinkSync "package.json" if fs.existsSync "package.json"

  #-----------------------------------------------------------------------------
  afterEach ->
    fs.unlinkSync "package.json" if fs.existsSync "package.json"
    fs.unlinkSync "manifest.yml" if fs.existsSync "manifest.yml"
    process.chdir SavedDir
    process.env = JSON.parse SavedEnv

  #-----------------------------------------------------------------------------
  it "local - empty environment", ->
    appEnv = cfenv.getAppEnv()
    expect(appEnv.name).to.be        null
    expect(appEnv.port).to.be        3000
    expect(appEnv.bind).to.be        "localhost"
    expect(appEnv.urls.length).to.be 1
    expect(appEnv.urls[0]).to.be     appEnv.url
    expect(appEnv.url).to.be         "http://localhost:3000"
    expect(appEnv.isLocal).to.be     true

    app = appEnv.app
    svs = appEnv.services

    expect(_.isEmpty(app)).to.be true
    expect(_.isEmpty(svs)).to.be true

  #-----------------------------------------------------------------------------
  it "local - getting port via name parm and ports.getPort()", ->
    appEnv = cfenv.getAppEnv {name: SampleName}
    expect(appEnv.name).to.be        SampleName
    expect(appEnv.port).to.be        SamplePort
    expect(appEnv.bind).to.be        "localhost"
    expect(appEnv.urls.length).to.be 1
    expect(appEnv.urls[0]).to.be     appEnv.url
    expect(appEnv.url).to.be         "http://localhost:#{SamplePort}"
    expect(appEnv.isLocal).to.be     true

  #-----------------------------------------------------------------------------
  it "local - getting port via PORT env var", ->

    port = 6000
    process.env.PORT = "#{port}"

    appEnv = cfenv.getAppEnv()
    expect(appEnv.name).to.be        null
    expect(appEnv.port).to.be        port
    expect(appEnv.bind).to.be        "localhost"
    expect(appEnv.urls.length).to.be 1
    expect(appEnv.urls[0]).to.be     appEnv.url
    expect(appEnv.url).to.be         "http://localhost:#{port}"
    expect(appEnv.isLocal).to.be     true

  #-----------------------------------------------------------------------------
  it "local - getAppEnv({protocol})", ->

    appEnv = cfenv.getAppEnv({protocol: "foo:"})
    expect(appEnv.urls.length).to.be 1
    expect(appEnv.url).to.be         "foo://localhost:3000"

  #-----------------------------------------------------------------------------
  it "local - getAppEnv({vcap.application})", ->

    vcap =
      application:
        name: SampleName
        host: "sample-host"
        uris: [ "sample-uri.example.com", "sample-uri.example.net" ]

    appEnv = cfenv.getAppEnv({vcap})
    expect(appEnv.name).to.be        SampleName
    expect(appEnv.port).to.be        SamplePort
    expect(appEnv.bind).to.be        vcap.application.host
    expect(appEnv.urls.length).to.be 1
    expect(appEnv.url).to.be         "http://localhost:#{SamplePort}"
    expect(appEnv.isLocal).to.be     true

    app = appEnv.app

    expect(JSON.stringify(app)).to.be JSON.stringify(vcap.application)

  #-----------------------------------------------------------------------------
  it "local - getAppEnv({vcap.services})", ->

    vcap = services: SampleVCAPServices_1

    appEnv = cfenv.getAppEnv({vcap})

    svs = appEnv.services

    expect(JSON.stringify(svs)).to.be JSON.stringify(vcap.services)

    expected = {}
    for label, services of vcap.services
      for service in services
        expected[service.name] = service

    expected = SampleVCAPServices_1.serviceLabel_2[1]
    service  = appEnv.getService "serviceName_B"
    expect(JSON.stringify(service)).to.be JSON.stringify(expected)

    service  = appEnv.getService /serviceName_B/
    expect(JSON.stringify(service)).to.be JSON.stringify(expected)

    service  = appEnv.getService /B/
    expect(JSON.stringify(service)).to.be JSON.stringify(expected)

  #-----------------------------------------------------------------------------
  it "local - getServiceURL()", ->

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      url: "foo"

    appEnv = cfenv.getAppEnv {vcap}
    url    = appEnv.getServiceURL "service-a"
    expect(url).to.be "foo"

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      uri: "foo"

    appEnv = cfenv.getAppEnv {vcap}
    url    = appEnv.getServiceURL "service-a"
    expect(url).to.be "foo"

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      url:    "org-protocol://org-host:666/org-path"
      proto:  "http:"
      server: "example.com:80"
      PORT:   "80"
      path:   "new-path"

    appEnv = cfenv.getAppEnv {vcap}
    url    = appEnv.getServiceURL "service-a",
      protocol: "proto"
      host:     "server"
      pathname: "path"

    expect(url).to.be "http://example.com:80/new-path"

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      protocol: "proto:"
      host:     "server"
      pathname: "path"

    appEnv = cfenv.getAppEnv {vcap}
    url    = appEnv.getServiceURL "service-a"

    expect(url).to.be null

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      URL:    "org-protocol://org-host:666/org-path"

    appEnv = cfenv.getAppEnv {vcap}
    url    = appEnv.getServiceURL "service-a",
      url: "URL"

    expect(url).to.be "org-protocol://org-host:666/org-path"

  #-----------------------------------------------------------------------------
  it "local - getServiceCreds()", ->

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      url: "foo"

    appEnv = cfenv.getAppEnv {vcap}
    creds  = appEnv.getServiceCreds "service-b"
    expect(creds).to.be null

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      url: "foo"

    vcap["services"]["service-a-label"][0].credentials = null

    appEnv = cfenv.getAppEnv {vcap}
    creds  = appEnv.getServiceCreds "service-a"
    creds  = JSON.stringify(creds)
    expect(creds).to.be '{}'

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      url: "foo"

    delete vcap["services"]["service-a-label"][0].credentials

    appEnv = cfenv.getAppEnv {vcap}
    creds  = appEnv.getServiceCreds "service-a"
    creds  = JSON.stringify(creds)
    expect(creds).to.be '{}'

    #-------------------------------------------
    vcap = getVCAPServicesWithCreds "service-a",
      url: "foo"

    appEnv = cfenv.getAppEnv {vcap}
    creds  = appEnv.getServiceCreds "service-a"
    creds  = JSON.stringify(creds)
    expect(creds).to.be '{"url":"foo"}'

  #-----------------------------------------------------------------------------
  it "remote - VCAP_APPLICATION", ->

    vcap =
      application:
        name: SampleName
        host: "sample-host"
        uris: [ "sample-uri.example.com", "sample-uri.example.net" ]

    process.env.VCAP_APPLICATION = JSON.stringify vcap.application
    process.env.PORT             = "666"

    appEnv = cfenv.getAppEnv()
    expect(appEnv.name).to.be        SampleName
    expect(appEnv.port).to.be        666
    expect(appEnv.bind).to.be        vcap.application.host
    expect(appEnv.urls.length).to.be 2
    expect(appEnv.url).to.be         "https://sample-uri.example.com"
    expect(appEnv.isLocal).to.be     false

    app = appEnv.app

    expect(JSON.stringify(app)).to.be JSON.stringify(vcap.application)

  #-----------------------------------------------------------------------------
  it "remote - getAppEnv({protocol})", ->

    vcap =
      application:
        name: SampleName
        host: "sample-host"
        uris: [ "sample-uri.example.com", "sample-uri.example.net" ]

    process.env.VCAP_APPLICATION = JSON.stringify vcap.application
    process.env.PORT             = "666"

    appEnv = cfenv.getAppEnv({protocol: "foo:"})
    expect(appEnv.url).to.be         "foo://sample-uri.example.com"

  #-----------------------------------------------------------------------------
  it "remote - getAppEnv({vcap}) ignored", ->

    vcap = getVCAPServicesWithCreds "service-a", uri: "http://example.com"
    vcap.application =
      name: SampleName
      host: "sample-host"
      uris: [ "sample-uri.example.com", "sample-uri.example.net" ]

    process.env.VCAP_APPLICATION = JSON.stringify vcap.application
    process.env.VCAP_SERVICES    = JSON.stringify vcap.services
    process.env.PORT             = "666"

    vcap = getVCAPServicesWithCreds "service-a", uri: "http://example.net"
    vcap.application =
      name: "foo"
      host: "foo"
      uris: [ "foo" ]

    appEnv = cfenv.getAppEnv {vcap}
    expect(appEnv.url).to.be         "https://sample-uri.example.com"

    url = appEnv.getServiceURL "service-a"
    expect(url).to.be          "http://example.com/"

#-----------------------------------------------------------------------------
  it "name - from option", ->

    appEnv = cfenv.getAppEnv name: "foo"
    expect(appEnv.name).to.be "foo"

    #----------------------------------------
    vcapApplication =
      name: "bar"
      uris: []

    process.env.VCAP_APPLICATION = JSON.stringify vcapApplication

    appEnv = cfenv.getAppEnv name: "foo"
    expect(appEnv.name).to.be "foo"

#-----------------------------------------------------------------------------
  it "name - from manifest.yml", ->

    fs.writeFileSync "manifest.yml", """
      applications:
      - name:    foo
        memory:  128M
    """

    fs.writeFileSync "package.json", """
    {
      "name": "bar",
      "main": "./lib/bar"
    }
    """

    appEnv = cfenv.getAppEnv()
    expect(appEnv.name).to.be "foo"

#-----------------------------------------------------------------------------
  it "name - bogus manifest.yml", ->

    fs.writeFileSync "manifest.yml", """
      ap)(*&))plications:
      )(*&9 name:    foo
      m(*)()emory:  128M
    """

    fs.writeFileSync "package.json", """
    {
      "name": "bar",
      "main": "./lib/bar"
    }
    """

    appEnv = cfenv.getAppEnv()
    expect(appEnv.name).to.be "bar"

#-----------------------------------------------------------------------------
  it "name - from package.json", ->

    fs.writeFileSync "package.json", """
    {
      "name": "bar",
      "main": "./lib/bar"
    }
    """

    appEnv = cfenv.getAppEnv()
    expect(appEnv.name).to.be "bar"

#-----------------------------------------------------------------------------
  it "name - bogus package.json", ->

    fs.writeFileSync "package.json", """
    foop)(*)(*){
      "name": "bar",
      "main": "./lib/bar"
    }
    """

    appEnv = cfenv.getAppEnv()
    expect(appEnv.name).to.be null

  #-----------------------------------------------------------------------------
  it "error - VCAP_APPLICATION is not JSON", ->

    process.env.VCAP_APPLICATION = ":foo:)("

    fn = -> appEnv = cfenv.getAppEnv()
    console.log "expecting an error printed below:"
    expect(fn).to.throwError /VCAP_APPLICATION is not JSON/

  #-----------------------------------------------------------------------------
  it "error - VCAP_SERVICES is not JSON", ->

    process.env.VCAP_SERVICES = ":foo:)("

    fn = -> appEnv = cfenv.getAppEnv()
    console.log "expecting an error printed below:"
    expect(fn).to.throwError /VCAP_SERVICES is not JSON/

  #-----------------------------------------------------------------------------
  it "error - invalid port", ->

    process.env.PORT = ":foo:)("

    fn = -> appEnv = cfenv.getAppEnv()
    console.log "expecting an error printed below:"
    expect(fn).to.throwError /invalid PORT value:/

  #-----------------------------------------------------------------------------
  it "Diego - use localhost in url", ->

    # VCAP_APPLICATION with no uris/uri in it
    vcapApplication =
        name: SampleName
        host: "sample-host"

    process.env.VCAP_APPLICATION = JSON.stringify vcapApplication

    appEnv = cfenv.getAppEnv()

    expect(appEnv.isLocal).to.be     false
    expect(appEnv.urls.length).to.be 1
    expect(appEnv.url).to.be         "https://localhost"

  #-----------------------------------------------------------------------------
  it "env PORT", ->
    vcapApplication =
        name: SampleName
        host: "sample-host"

    process.env.VCAP_APPLICATION = JSON.stringify vcapApplication
    process.env.PORT             = "4000"

    appEnv = cfenv.getAppEnv()

    expect(appEnv.port).to.be 4000

  #-----------------------------------------------------------------------------
  it "env CF_INSTANCE_PORT", ->
    vcapApplication =
        name: SampleName
        host: "sample-host"

    process.env.VCAP_APPLICATION = JSON.stringify vcapApplication
    process.env.CF_INSTANCE_PORT = "4001"

    appEnv = cfenv.getAppEnv()

    expect(appEnv.port).to.be 4001

  #-----------------------------------------------------------------------------
  it "env VCAP_APP_PORT", ->
    vcapApplication =
        name: SampleName
        host: "sample-host"

    process.env.VCAP_APPLICATION = JSON.stringify vcapApplication
    process.env.VCAP_APP_PORT    = "4002"

    appEnv = cfenv.getAppEnv()

    expect(appEnv.port).to.be 4002

#-------------------------------------------------------------------------------
SampleVCAPServices_1 =
  serviceLabel_1: [
    {
      name:            "serviceName_1"
      label:           "serviceLabel_1"
      credentials:
          "credKey_1": "credVal_1"
          "credKey_2": "credVal_2"
          "credKey_3": "credVal_3"
    }
    {
      name:            "serviceName_2"
      label:           "serviceLabel_1"
      credentials:
          "credKey_A": "credVal_A"
          "credKey_B": "credVal_B"
          "credKey_C": "credVal_C"
    }
  ]
  serviceLabel_2: [
    {
      name:            "serviceName_A"
      label:           "serviceLabel_2"
      credentials:
          "credKey_4": "credVal_4"
          "credKey_5": "credVal_5"
          "credKey_6": "credVal_6"
    }
    {
      name:            "serviceName_B"
      label:           "serviceLabel_2"
      credentials:
          "credKey_D": "credVal_D"
          "credKey_E": "credVal_E"
          "credKey_F": "credVal_F"
    }
  ]

#-------------------------------------------------------------------------------
getVCAPServicesWithCreds = (name, creds) ->
  label       = "#{name}-label"
  credentials = JSON.parse JSON.stringify creds

  services = {}
  services[label] = []
  services[label].push {name, label, credentials}

  return {services}

#-------------------------------------------------------------------------------
JS = (object) -> JSON.stringify object
JL = (object) -> JSON.stringify object, null, 4

#-------------------------------------------------------------------------------
# Copyright IBM Corp. 2014
# Copyright Patrick Mueller 2015
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#-------------------------------------------------------------------------------
