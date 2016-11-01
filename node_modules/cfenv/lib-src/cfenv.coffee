# Licensed under the Apache License. See footer for details.

fs   = require "fs"
URL  = require "url"

pkg   = require "../package.json"
_     = require "underscore"
ports = require "ports"
yaml  = require "js-yaml"

#-------------------------------------------------------------------------------
# properties on the cfenv object will be the module exports
#-------------------------------------------------------------------------------
cfenv = exports

#-------------------------------------------------------------------------------
cfenv.getAppEnv = (options={}) ->
  return new AppEnv options

#-------------------------------------------------------------------------------
class AppEnv

  #-----------------------------------------------------------------------------
  constructor: (options = {}) ->
    @isLocal  = not process.env.VCAP_APPLICATION?
    unless @isLocal
      try
        JSON.parse process.env.VCAP_APPLICATION
      catch
        @isLocal = true

    @app      = getApp      @, options
    @services = getServices @, options

    @name     = getName @, options
    @port     = getPort @
    @bind     = getBind @
    @urls     = getURLs @, options
    @url      = @urls[0]

  #-----------------------------------------------------------------------------
  toJSON: ->
    {@app, @services, @isLocal, @name, @port, @bind, @urls, @url}

  #-----------------------------------------------------------------------------
  getServices: ->
    result = {}

    for type, services of @services
      for service in services
        result[service.name] = service

    return result

  #-----------------------------------------------------------------------------
  getService: (spec) ->

    # set our matching function
    if _.isRegExp spec
      matches = (name) -> name.match spec
    else
      spec = "#{spec}"
      matches = (name) -> name is spec

    services = @getServices()
    for name, service of services
      if matches name
        return service

    # no matches
    return null

  #-----------------------------------------------------------------------------
  getServiceURL: (spec, replacements={}) ->
    service     = @getService spec

    credentials = service?.credentials
    return null unless credentials?

    replacements = _.clone replacements

    if replacements.url
      url = credentials[replacements.url]
    else
      url = credentials.url || credentials.uri

    return null unless url?

    delete replacements.url

    purl = URL.parse url

    for key, value of replacements
      if key is "auth"
        [userid, password] = value
        purl[key] = "#{credentials[userid]}:#{credentials[password]}"
      else
        purl[key] = credentials[value]

    return URL.format purl

  #-----------------------------------------------------------------------------
  getServiceCreds: (spec) ->
    service     = @getService spec
    return null unless service?

    return service.credentials || {}

#-------------------------------------------------------------------------------
getApp = (appEnv, options) ->
  string = process.env.VCAP_APPLICATION

  envValue = {}
  if string?
    try
      envValue = JSON.parse string
    catch e
      throwError "env var VCAP_APPLICATION is not JSON: /#{string}/"

  return envValue unless appEnv.isLocal

  locValue = options?.vcap?.application
  return locValue if locValue?
  return envValue

#-------------------------------------------------------------------------------
getServices = (appEnv, options) ->
  string = process.env.VCAP_SERVICES

  envValue = {}
  if string?
    try
      envValue = JSON.parse string
    catch e
      throwError "env var VCAP_SERVICES is not JSON: /#{string}/"

  return envValue unless appEnv.isLocal

  locValue = options?.vcap?.services
  return locValue if locValue?
  return envValue

#-------------------------------------------------------------------------------
getPort = (appEnv) ->
  portString = process.env.PORT || process.env.CF_INSTANCE_PORT || process.env.VCAP_APP_PORT

  unless portString?
    return 3000 unless appEnv.name?

    portString = "#{ports.getPort appEnv.name}"

  port = parseInt portString, 10
  throwError "invalid PORT value: /#{portString}/" if isNaN port

  return port

#-------------------------------------------------------------------------------
getName = (appEnv, options) ->
  return options.name if options.name?

  val = appEnv.app?.name
  return val if val?

  if fs.existsSync "manifest.yml"
    yString = fs.readFileSync "manifest.yml", "utf8"
    yObject = yaml.safeLoad yString, filename: "manifest.yml"

    yObject = yObject.applications[0] if yObject.applications?
    return yObject.name if yObject.name?

  if fs.existsSync "package.json"
    pString = fs.readFileSync "package.json", "utf8"
    try
      pObject = JSON.parse pString
    catch
      pObject = null

    return pObject.name if pObject?.name

  return null

#-------------------------------------------------------------------------------
getBind = (appEnv) ->
  return appEnv.app?.host || "localhost"

#-------------------------------------------------------------------------------
getURLs = (appEnv, options) ->

  uris = appEnv.app?.uris

  if appEnv.isLocal
    uris = [ "localhost:#{appEnv.port}" ]

  else
    unless uris?
      uris = [ "localhost" ]

  protocol = options.protocol

  unless protocol?
    if appEnv.isLocal
      protocol = "http:"
    else
      protocol = "https:"

  urls = for uri in uris
    "#{protocol}//#{uri}"

  return urls

#-------------------------------------------------------------------------------
throwError = (message) ->
  message = "#{pkg.name}: #{message}"
  console.log "error: #{message}"
  throw new Error message

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
