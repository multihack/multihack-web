(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Multihack = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],2:[function(require,module,exports){
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false Mustache: true*/

(function defineMustache (global, factory) {
  if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
    factory(exports); // CommonJS
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    global.Mustache = {};
    factory(global.Mustache); // script, wsh, asp
  }
}(this, function mustacheFactory (mustache) {

  var objectToString = Object.prototype.toString;
  var isArray = Array.isArray || function isArrayPolyfill (object) {
    return objectToString.call(object) === '[object Array]';
  };

  function isFunction (object) {
    return typeof object === 'function';
  }

  /**
   * More correct typeof string handling array
   * which normally returns typeof 'object'
   */
  function typeStr (obj) {
    return isArray(obj) ? 'array' : typeof obj;
  }

  function escapeRegExp (string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
  }

  /**
   * Null safe way of checking whether or not an object,
   * including its prototype, has a given property
   */
  function hasProperty (obj, propName) {
    return obj != null && typeof obj === 'object' && (propName in obj);
  }

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  var regExpTest = RegExp.prototype.test;
  function testRegExp (re, string) {
    return regExpTest.call(re, string);
  }

  var nonSpaceRe = /\S/;
  function isWhitespace (string) {
    return !testRegExp(nonSpaceRe, string);
  }

  var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  function escapeHtml (string) {
    return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap (s) {
      return entityMap[s];
    });
  }

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var equalsRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  /**
   * Breaks up the given `template` string into a tree of tokens. If the `tags`
   * argument is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
   * course, the default is to use mustaches (i.e. mustache.tags).
   *
   * A token is an array with at least 4 elements. The first element is the
   * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
   * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
   * all text that appears outside a symbol this element is "text".
   *
   * The second element of a token is its "value". For mustache tags this is
   * whatever else was inside the tag besides the opening symbol. For text tokens
   * this is the text itself.
   *
   * The third and fourth elements of the token are the start and end indices,
   * respectively, of the token in the original template.
   *
   * Tokens that are the root node of a subtree contain two more elements: 1) an
   * array of tokens in the subtree and 2) the index in the original template at
   * which the closing tag for that section begins.
   */
  function parseTemplate (template, tags) {
    if (!template)
      return [];

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace () {
      if (hasTag && !nonSpace) {
        while (spaces.length)
          delete tokens[spaces.pop()];
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var openingTagRe, closingTagRe, closingCurlyRe;
    function compileTags (tagsToCompile) {
      if (typeof tagsToCompile === 'string')
        tagsToCompile = tagsToCompile.split(spaceRe, 2);

      if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
        throw new Error('Invalid tags: ' + tagsToCompile);

      openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
      closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
      closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
    }

    compileTags(tags || mustache.tags);

    var scanner = new Scanner(template);

    var start, type, value, chr, token, openSection;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(openingTagRe);

      if (value) {
        for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push([ 'text', chr, start, start + 1 ]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr === '\n')
            stripSpace();
        }
      }

      // Match the opening tag.
      if (!scanner.scan(openingTagRe))
        break;

      hasTag = true;

      // Get the tag type.
      type = scanner.scan(tagRe) || 'name';
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === '=') {
        value = scanner.scanUntil(equalsRe);
        scanner.scan(equalsRe);
        scanner.scanUntil(closingTagRe);
      } else if (type === '{') {
        value = scanner.scanUntil(closingCurlyRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(closingTagRe);
        type = '&';
      } else {
        value = scanner.scanUntil(closingTagRe);
      }

      // Match the closing tag.
      if (!scanner.scan(closingTagRe))
        throw new Error('Unclosed tag at ' + scanner.pos);

      token = [ type, value, start, scanner.pos ];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === '/') {
        // Check section nesting.
        openSection = sections.pop();

        if (!openSection)
          throw new Error('Unopened section "' + value + '" at ' + start);

        if (openSection[1] !== value)
          throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      } else if (type === 'name' || type === '{' || type === '&') {
        nonSpace = true;
      } else if (type === '=') {
        // Set the tags for the next time around.
        compileTags(value);
      }
    }

    // Make sure there are no open sections when we're done.
    openSection = sections.pop();

    if (openSection)
      throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

    return nestTokens(squashTokens(tokens));
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens (tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          squashedTokens.push(token);
          lastToken = token;
        }
      }
    }

    return squashedTokens;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens (tokens) {
    var nestedTokens = [];
    var collector = nestedTokens;
    var sections = [];

    var token, section;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      switch (token[0]) {
        case '#':
        case '^':
          collector.push(token);
          sections.push(token);
          collector = token[4] = [];
          break;
        case '/':
          section = sections.pop();
          section[5] = token[2];
          collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
          break;
        default:
          collector.push(token);
      }
    }

    return nestedTokens;
  }

  /**
   * A simple string scanner that is used by the template parser to find
   * tokens in template strings.
   */
  function Scanner (string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function eos () {
    return this.tail === '';
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function scan (re) {
    var match = this.tail.match(re);

    if (!match || match.index !== 0)
      return '';

    var string = match[0];

    this.tail = this.tail.substring(string.length);
    this.pos += string.length;

    return string;
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function scanUntil (re) {
    var index = this.tail.search(re), match;

    switch (index) {
      case -1:
        match = this.tail;
        this.tail = '';
        break;
      case 0:
        match = '';
        break;
      default:
        match = this.tail.substring(0, index);
        this.tail = this.tail.substring(index);
    }

    this.pos += match.length;

    return match;
  };

  /**
   * Represents a rendering context by wrapping a view object and
   * maintaining a reference to the parent context.
   */
  function Context (view, parentContext) {
    this.view = view;
    this.cache = { '.': this.view };
    this.parent = parentContext;
  }

  /**
   * Creates a new context using the given view with this context
   * as the parent.
   */
  Context.prototype.push = function push (view) {
    return new Context(view, this);
  };

  /**
   * Returns the value of the given name in this context, traversing
   * up the context hierarchy if the value is absent in this context's view.
   */
  Context.prototype.lookup = function lookup (name) {
    var cache = this.cache;

    var value;
    if (cache.hasOwnProperty(name)) {
      value = cache[name];
    } else {
      var context = this, names, index, lookupHit = false;

      while (context) {
        if (name.indexOf('.') > 0) {
          value = context.view;
          names = name.split('.');
          index = 0;

          /**
           * Using the dot notion path in `name`, we descend through the
           * nested objects.
           *
           * To be certain that the lookup has been successful, we have to
           * check if the last object in the path actually has the property
           * we are looking for. We store the result in `lookupHit`.
           *
           * This is specially necessary for when the value has been set to
           * `undefined` and we want to avoid looking up parent contexts.
           **/
          while (value != null && index < names.length) {
            if (index === names.length - 1)
              lookupHit = hasProperty(value, names[index]);

            value = value[names[index++]];
          }
        } else {
          value = context.view[name];
          lookupHit = hasProperty(context.view, name);
        }

        if (lookupHit)
          break;

        context = context.parent;
      }

      cache[name] = value;
    }

    if (isFunction(value))
      value = value.call(this.view);

    return value;
  };

  /**
   * A Writer knows how to take a stream of tokens and render them to a
   * string, given a context. It also maintains a cache of templates to
   * avoid the need to parse the same template twice.
   */
  function Writer () {
    this.cache = {};
  }

  /**
   * Clears all cached templates in this writer.
   */
  Writer.prototype.clearCache = function clearCache () {
    this.cache = {};
  };

  /**
   * Parses and caches the given `template` and returns the array of tokens
   * that is generated from the parse.
   */
  Writer.prototype.parse = function parse (template, tags) {
    var cache = this.cache;
    var tokens = cache[template];

    if (tokens == null)
      tokens = cache[template] = parseTemplate(template, tags);

    return tokens;
  };

  /**
   * High-level method that is used to render the given `template` with
   * the given `view`.
   *
   * The optional `partials` argument may be an object that contains the
   * names and templates of partials that are used in the template. It may
   * also be a function that is used to load partial templates on the fly
   * that takes a single argument: the name of the partial.
   */
  Writer.prototype.render = function render (template, view, partials) {
    var tokens = this.parse(template);
    var context = (view instanceof Context) ? view : new Context(view);
    return this.renderTokens(tokens, context, partials, template);
  };

  /**
   * Low-level method that renders the given array of `tokens` using
   * the given `context` and `partials`.
   *
   * Note: The `originalTemplate` is only ever used to extract the portion
   * of the original template that was contained in a higher-order section.
   * If the template doesn't use higher-order sections, this argument may
   * be omitted.
   */
  Writer.prototype.renderTokens = function renderTokens (tokens, context, partials, originalTemplate) {
    var buffer = '';

    var token, symbol, value;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      value = undefined;
      token = tokens[i];
      symbol = token[0];

      if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate);
      else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate);
      else if (symbol === '>') value = this.renderPartial(token, context, partials, originalTemplate);
      else if (symbol === '&') value = this.unescapedValue(token, context);
      else if (symbol === 'name') value = this.escapedValue(token, context);
      else if (symbol === 'text') value = this.rawValue(token);

      if (value !== undefined)
        buffer += value;
    }

    return buffer;
  };

  Writer.prototype.renderSection = function renderSection (token, context, partials, originalTemplate) {
    var self = this;
    var buffer = '';
    var value = context.lookup(token[1]);

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender (template) {
      return self.render(template, context, partials);
    }

    if (!value) return;

    if (isArray(value)) {
      for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
        buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string')
        throw new Error('Cannot use higher-order sections without the original template');

      // Extract the portion of the original template that the section contains.
      value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

      if (value != null)
        buffer += value;
    } else {
      buffer += this.renderTokens(token[4], context, partials, originalTemplate);
    }
    return buffer;
  };

  Writer.prototype.renderInverted = function renderInverted (token, context, partials, originalTemplate) {
    var value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0))
      return this.renderTokens(token[4], context, partials, originalTemplate);
  };

  Writer.prototype.renderPartial = function renderPartial (token, context, partials) {
    if (!partials) return;

    var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
    if (value != null)
      return this.renderTokens(this.parse(value), context, partials, value);
  };

  Writer.prototype.unescapedValue = function unescapedValue (token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return value;
  };

  Writer.prototype.escapedValue = function escapedValue (token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return mustache.escape(value);
  };

  Writer.prototype.rawValue = function rawValue (token) {
    return token[1];
  };

  mustache.name = 'mustache.js';
  mustache.version = '2.3.0';
  mustache.tags = [ '{{', '}}' ];

  // All high-level mustache.* functions use this writer.
  var defaultWriter = new Writer();

  /**
   * Clears all cached templates in the default writer.
   */
  mustache.clearCache = function clearCache () {
    return defaultWriter.clearCache();
  };

  /**
   * Parses and caches the given template in the default writer and returns the
   * array of tokens it contains. Doing this ahead of time avoids the need to
   * parse templates on the fly as they are rendered.
   */
  mustache.parse = function parse (template, tags) {
    return defaultWriter.parse(template, tags);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  mustache.render = function render (template, view, partials) {
    if (typeof template !== 'string') {
      throw new TypeError('Invalid template! Template should be a "string" ' +
                          'but "' + typeStr(template) + '" was given as the first ' +
                          'argument for mustache#render(template, view, partials)');
    }

    return defaultWriter.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.,
  /*eslint-disable */ // eslint wants camel cased function name
  mustache.to_html = function to_html (template, view, partials, send) {
    /*eslint-enable*/

    var result = mustache.render(template, view, partials);

    if (isFunction(send)) {
      send(result);
    } else {
      return result;
    }
  };

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  mustache.escape = escapeHtml;

  // Export these mainly for testing, but also for advanced usage.
  mustache.Scanner = Scanner;
  mustache.Context = Context;
  mustache.Writer = Writer;

  return mustache;
}));

},{}],3:[function(require,module,exports){
module.exports={
  "hostname": "quiet-shelf-57463.herokuapp.com"
}
},{}],4:[function(require,module,exports){
/* globals CodeMirror */

var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var FileSystem = require('./../filesystem/filesystem')

inherits(Editor, EventEmitter)

function Editor () {
  var self = this
  if (!(self instanceof Editor)) return new Editor()

  var textArea = document.getElementById('editor')
  
  var options = {
                  mode: 'javascript',
                  lineNumbers: true,
                  theme: self._theme || 'atom',
                  tabSize: 4,
                  indentUnit: 4,
                  lineWrapping: !!(window.innerWidth < 480), // No wrap on mobile
                  styleActiveLine: true
                }
  
  self._cm = CodeMirror.fromTextArea(textArea, options)
  
  self._workingFile = null
  self._mutex = false
  self._cm.on('change', self._onchange.bind(self))
  
  self._theme = null
}

Editor.prototype._onchange = function (cm, change) {
  var self = this
  
  if (self._mutex || !self._workingFile) return
  self.emit('change', {
    filePath: self._workingFile.path,
    change: change
  })
}

// Handle an external change
Editor.prototype.change = function (filePath, change) {
  var self = this
  self._mutex = true
  if (!self._workingFile || filePath !== self._workingFile.path) {
    FileSystem.getFile(filePath).content.replaceRange(change.text, change.to, change.from)
  } else {
    self._cm.replaceRange(change.text, change.to, change.from)
  }
  self._mutex = false
}

Editor.prototype.open = function (filePath) {
  var self = this
  if (self._workingFile && filePath === self._workingFile.path) return
  self._workingFile = FileSystem.get(filePath)
  document.getElementById('working-file').innerHTML = self._workingFile.name
  switch (self._workingFile.viewMapping) {
    case 'image':
      document.querySelector('.image-wrapper').style.display = ''
      document.querySelector('.image-wrapper > img').src = 'data:text/javascript;base64,'+self._workingFile.content
    break
    default:
      document.querySelector('.image-wrapper').style.display = 'none'
      self._cm.swapDoc(self._workingFile.content)
    break
  }
}
  
module.exports = new Editor()
},{"./../filesystem/filesystem":7,"events":15,"inherits":1}],5:[function(require,module,exports){
var util = require('./util')
var mustache = require('mustache')

function Directory (path) {
  var self = this
  if (!(self instanceof Directory)) return new Directory()
  
  self.name = util.getFilename(path)
  self.path = path
  self.children = []
  self.isDir = true
}
  
module.exports = Directory
},{"./util":8,"mustache":2}],6:[function(require,module,exports){
var util = require('./util')
var mustache = require('mustache')

function File (path) {
  var self = this
  if (!(self instanceof File)) return new File()

  self.name = util.getFilename(path)
  self.path = path
  self.content = null
  self.isDir = false
  self.viewMapping = util.getViewMapping(path)
}


  
module.exports = File
},{"./util":8,"mustache":2}],7:[function(require,module,exports){
/* globals JSZip, JSZipUtils, CodeMirror */

var File = require('./file')
var Directory = require('./directory')
var util = require('./util')
var Interface = require('./../interface/interface')

var ignoredFilenames = ['__MACOSX', '.DS_Store']

function FileSystem () {
  var self = this
  if (!(self instanceof FileSystem)) return new FileSystem()
  
  self._counter = 0
  self._tree = [
    new Directory('')
  ]
  self.currentFile = null
}

// Takes a zip file and loads the project
FileSystem.prototype.loadProject = function (file, cb) {
  var self = this
  self.unzip(file, function () {
    console.log('done')
    cb(self._tree[0].children)
  })
  
  // TODO: More input options
}

FileSystem.prototype.mkdir = function (path) {
  var self = this
  var self = this
  var parentPath = path.split('/')
  parentPath.splice(-1,1)
  parentPath = parentPath.join('/')
  
  self._buildPath(parentPath)
  self._getNode(parentPath).children.push(new Directory(path))
}

FileSystem.prototype.mkfile = function (path) {
  var self = this
  var parentPath = path.split('/')
  parentPath.splice(-1,1)
  parentPath = parentPath.join('/')

  self._buildPath(parentPath)
  self._getNode(parentPath).children.push(new File(path))
}

// Ensures all directories have been build along path
FileSystem.prototype._buildPath = function (path) {
  var split = path.split('/')
  for (var i=0; i<split; i++) {
    var check = split.slice(0,i).join('/')
    if (!self._getNode(check)) {
      self.mkdir(check)
    }
  }
}

// Recursive search
FileSystem.prototype._getNode = function (path, nodeList) {
  var self = this
  nodeList = nodeList || self._tree
  for (var i = 0; i < nodeList.length; i++) { 
      if (nodeList[i].path === path) {
          return nodeList[i]
      } else if (nodeList[i].children) {
          var recur = self._getNode(path, nodeList[i].children) 
          if (recur) return recur
      }
  }
  return undefined
}

FileSystem.prototype.get = function (path) {
  var self = this
  
  var parentPath = path.split('/')
  parentPath.splice(-1,1)
  parentPath = parentPath.join('/')
  
  self._buildPath(parentPath)
  return self._getNode(path)
}

FileSystem.prototype.getFile = function (path) {
  var self = this
  
  var parentPath = path.split('/')
  parentPath.splice(-1,1)
  parentPath = parentPath.join('/')
  
  self._buildPath(parentPath)
  return self._getNode(path) || (function () {
    self.mkfile(path)
    self._getNode(path).content = new CodeMirror.Doc('', util.pathToMode(path))
    Interface.treeview.render(self._tree[0].children)
    console.log(self._tree)
    return self._getNode(path)
  }())
}

FileSystem.prototype.delete = function (path) {
  var self = this
  var parentPath = relativePath.split('/')
  parentPath.splice(-1,1)
  parentPath = parentPath.join('/')
  self._getNode(parentPath).children = self._getNode(parentPath).children.filter(function (e) {
    if (e.path === path) {
      return false
    }
    return true
  })
}

// Takes a zip file and writes to the directory
FileSystem.prototype.unzip = function (file, cb) {
  var self = this
  
  JSZip.loadAsync(file).then(function (zip) {
    
    var awaiting = Object.keys(zip.files).length
    var first = true
    
    zip.forEach(function (relativePath, zipEntry) {  
      if (first) {
        first = false
        awaiting--
        return
      }

      // Filter out ignored files
      for (var i=0; i<ignoredFilenames.length; i++) {
        if (relativePath.indexOf(ignoredFilenames[i]) !== -1) {
          if (--awaiting <= 0) cb() 
          return
        }
      } 
      
      relativePath = relativePath.split('/')
      relativePath.splice(0,1)
      relativePath = relativePath.join('/')
      relativePath='/'+relativePath
      
      if (zipEntry.dir) {
        relativePath = relativePath.slice(0, -1)
      }
      
      var parentPath = relativePath.split('/')
      parentPath.splice(-1,1)
      parentPath = parentPath.join('/')
      
      if (zipEntry.dir) {
        self.mkdir(relativePath)
        if (--awaiting <= 0) cb() 
      } else {
        self.mkfile(relativePath)
        var viewMapping = util.getViewMapping(relativePath)
        switch (viewMapping) {
          case 'image':
            zipEntry.async('base64').then(function (content) {  
              self.get(relativePath).content = content
              if (--awaiting <= 0) cb() 
            })
            break
          default:
            // Load as text
            zipEntry.async('string').then(function (content) {  
              self.get(relativePath).content = new CodeMirror.Doc(content, util.pathToMode(relativePath))
              if (--awaiting <= 0) cb() 
            })
            break
        }
      }   
    })
  })
}
    
module.exports = new FileSystem()
},{"./../interface/interface":10,"./directory":5,"./file":6,"./util":8}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
var FileSystem = require('./filesystem/filesystem')
var Interface = require('./interface/interface')
var Editor = require('./editor/editor')
var Remote = require('./network/remote')

var config = require('./config.json')

function Multihack () {
  var self = this
  if (!(self instanceof Multihack)) return new Multihack()
  
  Interface.on('openFile', function (path) {
    Editor.open(path)
  })
  
  // Initialize project and room
  self.roomID = Math.random().toString(36).substr(2, 20)
    
  Interface.removeOverlay()
  Interface.getProject(function (project) {
    if (!project){
      self._initRemote()
    } else {
      Interface.showOverlay()
      FileSystem.loadProject(project, function (tree) {
        Interface.treeview.render(tree)
        self._initRemote()
      })
    }
  })
}

Multihack.prototype._initRemote = function () {
  Interface.getRoom(self.roomID, function (roomID) {
    self.roomID = roomID
    self._remote = new Remote(config.hostname, roomID)
    
    self._remote.on('change', function (data) {
      if (Editor.change(data.filePath, data.change)) {
        Interface.treeview.render(tree)
      }
    })
    self._remote.on('deleteFile', function (data) {
      FileSystem.delete(data.filePath)
      Interface.treeview.render(tree)
    })
    Editor.on('change', function (data) {
      self._remote.change(data.filePath, data.change)
    })
  })
}
    
module.exports = Multihack
},{"./config.json":3,"./editor/editor":4,"./filesystem/filesystem":7,"./interface/interface":10,"./network/remote":14}],10:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var Modal = require('./modal')
var TreeView = require('./treeview')

inherits(Interface, EventEmitter)

function Interface () {
  var self = this
  if (!(self instanceof Interface)) return new Interface()
  
  self.treeview = new TreeView()
  
  self.treeview.on('open', function (path) {
    self.emit('openFile', path)
  })
  
  // Setup sidebar
  var sidebar = document.getElementById('sidebar')
  var collapsed = false
  document.getElementById('collapsesidebar').addEventListener('click', function (){
    collapsed = !collapsed
    if (collapsed) {
      sidebar.className = sidebar.className + ' collapsed'
    } else {
      sidebar.className = sidebar.className.replace('collapsed', '')
    }
  })
  
  var contrast = false
  document.getElementById('image-contrast').addEventListener('click', function () {
    contrast = !contrast
    document.querySelector('.image-wrapper').style.backgroundColor = contrast ? 'white' : 'black'
    document.querySelector('#image-contrast > img').src = contrast ? 'static/img/contrast-black.png' : 'static/img/contrast-white.png'
  })
}

Interface.prototype.getProject = function (cb) {
  var self = this
  
  var projectModal = new Modal('file', {
    title: 'Load Project',
    message: 'Upload a zip file containing a project.'
  })
  projectModal.on('done', function (inputs) {
    projectModal.close()
    if (cb) cb(inputs[0].files[0])
  })
  projectModal.on('cancel', function () {
    projectModal.close()
    if (cb) cb(null)
  })
  projectModal.open()
}

Interface.prototype.getRoom = function (roomID, cb) {
  var self = this
  
  var roomModal = new Modal('input', {
    roomID: roomID,
    title: 'Join Room',
    message: 'Enter the ID of the room you want to join.',
    placeholder: 'RoomID',
    default: roomID
  })
  roomModal.on('done', function (inputs) {
    roomModal.close()
    if (cb) cb(inputs[0].value)
  })
  roomModal.on('cancel', function () {
    roomModal.close()
    self.alert('Offline Mode', 'You are now in offline mode.<br>Refresh to join a room.')
  })
  roomModal.open()
}

Interface.prototype.alert = function (title, message, cb) {
  var alertModal = new Modal('alert', {
    title: title,
    message: message
  })
  alertModal.on('done', function (inputs) {
    alertModal.close()
    if (cb) cb()
  })
  alertModal.open()
}

Interface.prototype.removeOverlay = function (msg, cb) {
  document.getElementById('overlay').style.display = 'none'
}

Interface.prototype.showOverlay = function (msg, cb) {
  document.getElementById('overlay').style.display = ''
}
  
module.exports = new Interface()
},{"./modal":11,"./treeview":13,"events":15,"inherits":1}],11:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var mustache = require('mustache')
var templates = require('./templates')

inherits(Modal, EventEmitter)

function Modal (name, data) {
    var self = this
    if (!(self instanceof Modal)) return new Modal()

    self._html = mustache.render(templates[name], data)
    self.el = document.getElementById('modal')
    self.overlay = document.getElementById('overlay')
}

Modal.prototype.open = function () {
    var self = this
    
    self.el.style.display = ''
    self.overlay.style.display = ''
    self.el.innerHTML = self._html
    
    function done() {
        self.emit('done', self.el.querySelectorAll('input'))
    }
    
    function cancel() {
      self.emit('cancel')
    }
    
    var go = self.el.querySelector('.go-button')
    if (go) {
      if (go.tagName === 'BUTTON') {
          go.addEventListener('click', done)
      } else {
          go.addEventListener('change', done)
      }
    }
    
    var no = self.el.querySelector('.no-button')
    if (no) {
      if (no.tagName === 'BUTTON') {
          no.addEventListener('click', cancel)
      } else {
          no.addEventListener('change', cancel)
      }
    }
}

Modal.prototype.close = function () {
    var self = this
    
    self.el.style.display = 'none'
    self.overlay.style.display = 'none'
    self.el.innerHTML = ''
}

    
module.exports = Modal
},{"./templates":12,"events":15,"inherits":1,"mustache":2}],12:[function(require,module,exports){
var dict = {}

dict['file'] = 
    '<h1>{{title}}</h1><br>'+
    '<p>{{{message}}}</p>'+
    '<input class="go-button modal-input" type="file">'+
    '<button class="no-button">Cancel</button>'

dict['input'] = 
    '<h1>{{title}}</h1>'+
    '<p>{{{message}}}</p>'+
    '<input class="modal-input" placeholder="{{placeholder}}" value="{{default}}" type="text">'+
    '<button class="go-button">Join</button>'+
    '<button class="no-button">Cancel</button>'

dict['alert'] = 
    '<h1>{{title}}</h1>'+
    '<p>{{{message}}}</p>'+
    '<button class="go-button">Ok</button>'


module.exports = dict
},{}],13:[function(require,module,exports){
var mustache = require('mustache')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(TreeView, EventEmitter)

function TreeView () {
  var self = this
  if (!(self instanceof TreeView)) return new TreeView()

}

TreeView.prototype.render = function (nodeList, parentElement) {
  var self = this
  
  parentElement = parentElement || document.querySelector('#tree')
    
  for (var i = 0; i < nodeList.length; i++) { 
      if (!nodeList[i].isDir) {
        // Render file
        var el = document.createElement('li')
        el.className = 'file'
        
        var a = document.createElement('a')
        a.className = 'filelink'
        a.id = nodeList[i].path
        a.innerHTML = nodeList[i].name
        a.addEventListener('click', self._handleFileClick.bind(self))
        
        el.appendChild(a)
        parentElement.appendChild(el)
      } else {
        //Render dir
        var el = document.createElement('li')
        
        var label = document.createElement('label')
        label.setAttribute('for', nodeList[i].path)
        label.innerHTML = nodeList[i].name
        label.addEventListener('click', self._handleFolderClick.bind(self))
        
        var input = document.createElement('input')
        input.id = nodeList[i].path
        input.type = 'checkbox'
        
        var ol = document.createElement('ol')
        self.render(nodeList[i].children, ol)
        
        el.appendChild(label)
        el.appendChild(input)
        el.appendChild(ol)
        parentElement.appendChild(el)
      }
  }
}

TreeView.prototype._handleFileClick = function (e) {
  var self = this
  self.emit('open', e.target.id)
}

TreeView.prototype._handleFolderClick = function (e) {
  var self = this
  console.log(e.target.getAttribute('for'))
  
}

TreeView.prototype.remove = function (file) {
  var self = this
  
}

TreeView.prototype.add = function (parent, file) {
  var self = this
  
}
    
module.exports = TreeView
},{"events":15,"inherits":1,"mustache":2}],14:[function(require,module,exports){
/* globals io */

// TODO: Replace socket forwarding with WebRTC

function RemoteManager (hostname, room) {
  var self = this

  self.room = room

  self._handlers = {}
  self._socket = new io(hostname)

  self._socket.emit('join', {room: room})

  self._socket.on('forward', function (data) {
    console.log(data)
    self._emit(data.event, data)
  })  
}

RemoteManager.prototype.deleteFile = function (filePath) {
  var self = this

  self._socket.emit('forward', {
    event: 'deleteFile',
    filePath: filePath
  })
}

RemoteManager.prototype.change = function (filePath, change) {
  var self = this

  console.log(filePath)
  self._socket.emit('forward', {
    event: 'change',
    filePath: filePath,
    change: change
  })
}

RemoteManager.prototype.destroy = function () {
  var self = this

  self.room = null
  self.peers = null
  self._handlers = null
  self._socket.disconnect()
  self._socket = null
}

RemoteManager.prototype._emit = function (event, data) {
  var self = this
  var fns = self._handlers[event] || []
  var fn
  var i

  for (i = 0; i < fns.length; i++) {
    fn = fns[i]
    if (fn && typeof (fn) === 'function') {
      fn(data)
    }
  }
}

RemoteManager.prototype.on = function (event, handler) {
  var self = this

  if (!self._handlers[event]) {
    self._handlers[event] = []
  }

  self._handlers[event].push(handler)
}

module.exports = RemoteManager

},{}],15:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[9])(9)
});