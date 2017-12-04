var mustache = require('mustache')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var util = require('./../filesystem/util')

var template = '<span>{{filename}}</span><div class="close">×</div>'

inherits(Tab, EventEmitter)

function Tab (filepath) {
  var self = this
  if (!(self instanceof Tab)) return new Tab()

  self.el = document.createElement('div')
  self.el.className = 'tab active'
  self.el.innerHTML = mustache.render(template, {filename: util.getFilename(filepath)})

  self.el.addEventListener('click', self._onclick.bind(self))
  self.el.querySelector('.close').addEventListener('click', self.close.bind(self))

  self.filepath = filepath
}

Tab.prototype._onclick = function (e) {
  var self = this
  if (e) e.stopPropagation()
  self.emit('click')
}

Tab.prototype.setActive = function () {
  var self = this
  self.el.className = 'active tab'
}

Tab.prototype.close = function (e) {
  var self = this
  if (e) e.stopPropagation()
  self.emit('close')
}

Tab.prototype.rename = function (newFilepath) {
  var self = this

  self.filepath = newFilepath

  self.el.innerHTML = mustache.render(template, {filename: util.getFilename(newFilepath)})
  self.el.querySelector('.close').addEventListener('click', self._onclose.bind(self))
}

module.exports = Tab
