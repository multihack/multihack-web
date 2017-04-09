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

  var inputs = self.el.querySelectorAll('input')
  if (inputs[0] && inputs[0].type === 'text') inputs[0].select()

  function done (e) {
    e.inputs = inputs
    self.emit('done', e)
  }

  function cancel () {
    self.emit('cancel')
  }

  var go = Array.prototype.slice.call(self.el.querySelectorAll('.go-button'))
  while (go[0]) {
    if (go[0].tagName === 'BUTTON') {
      go[0].addEventListener('click', done)
    } else {
      go[0].addEventListener('change', done)
    }
    go.shift()
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
