var translations = require('./translations')

var mustache = require('mustache')
var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')

inherits(Lang, EventEmitter)

function Lang () {
  var self = this
  if (!(self instanceof Lang)) return new Lang()

  var langLocale = navigator.languages
    ? navigator.languages[0]
    : (navigator.language || navigator.userLanguage)

  self.lang = langLocale.split('-')[0]
  self.locale = langLocale.split('-')[1] // TODO: locale support

  // translate the DOM
  document.querySelector('#save > span').innerHTML = self.get('save')
  document.querySelector('#deploy > span').innerHTML = self.get('deploy')
  document.querySelector('#voice > span').innerHTML = self.get('talk')
  document.querySelector('#save > span').innerHTML = self.get('save')
}

Lang.prototype.get = function (key, data) {
  var self = this

  data = data || {}

  console.log(key)

  var lookup = translations[self.lang] || translations['en']
  return mustache.render(lookup[key] || translations['en'][key], data)
}

module.exports = new Lang()
