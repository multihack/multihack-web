var util = {}


util.getFilename = function (path) {
  var split = path.split('/')
  return split[split.length-1]
}

util.getExtension = function (path) {
  path = util.getFilename(path)
  var split = path.split('.')
  return split[split.length-1]
}

var CM_MAPPINGS = {
  "js": "javascript",
  "ts": "javascript",
  "json": "javascript",
  "css": "css",
  "sass": "css",
  "less": "css",
  "html": "htmlmixed",
  "xml": "xml",
  "php": "application/x-httpd-php"
}
util.pathToMode = function (path) {
  return CM_MAPPINGS[util.getExtension(path)]
}

var VIEW_MAPPINGS = {
  "png" : "image", 
  "jpg": "image",
  "jpeg": "image",
  "jpeg2000": "image",
  "tif": "image", 
  "tiff": "image",
  "gif": "image",
  "bmp": "image",
  "ico": "image"
}
util.getViewMapping = function (path){
  return VIEW_MAPPINGS[util.getExtension(path)] || "text"
}
  
module.exports = util