# Licensed under the Apache License. See footer for details.

http = require "http"

cfenv = require ".."

#-------------------------------------------------------------------------------
exports.main = ->
  appEnv = cfenv.getAppEnv()

  dump = generateDump appEnv
  # console.log "#{dump}\n"

  server = http.createServer()

  server.on "request", (request, response) ->
    response.writeHead 200,
      "Content-Type": "text/plain"

    response.end dump

  server.listen appEnv.port, appEnv.bind, ->
    console.log "server starting on #{appEnv.url}"

#-------------------------------------------------------------------------------
generateDump = (appEnv) ->
  result = []

  result.push "cfenv.getAppEnv(): #{JL appEnv}"

  services = appEnv.getServices()
  result.push "appEnv.getServices(): #{JL services}"

  serviceURL = appEnv.getServiceURL  "cf-env-test",
    pathname: "database"
    auth:     ["username", "password"]

  result.push "appEnv.getServiceURL(): #{serviceURL}"

  return result.join "\n\n"

#-------------------------------------------------------------------------------
JS = (object) -> JSON.stringify object
JL = (object) -> JSON.stringify object, null, 4

exports.main() if require.main is module

#-------------------------------------------------------------------------------
# Copyright IBM Corp. 2014
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
