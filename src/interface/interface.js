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
  
  // Setup contrast toggle
  var contrast = false
  document.getElementById('image-contrast').addEventListener('click', function () {
    contrast = !contrast
    document.querySelector('.image-wrapper').style.backgroundColor = contrast ? 'white' : 'black'
    document.querySelector('#image-contrast > img').src = contrast ? 'static/img/contrast-black.png' : 'static/img/contrast-white.png'
  })
  
  // Setup save button
  document.getElementById('save').addEventListener('click', function () {
    self.emit('saveAs', 'zip')
  })
  
  // Setup voice button
  document.getElementById('voice').addEventListener('click', function () {
    self.emit('voiceToggle')
  })
  
  // Setup deploy button
  document.getElementById('deploy').addEventListener('click', function () {
    self.emit('deploy')
  })
}

Interface.prototype.getProject = function (cb) {
  var self = this
  
  var projectModal = new Modal('file', {
    title: 'Load Project',
    message: 'Upload a zip file containing a project.'
  })
  projectModal.on('done', function (e) {
    projectModal.close()
    if (cb) cb(e.inputs[0].files[0])
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
  roomModal.on('done', function (e) {
    roomModal.close()
    if (cb) cb(e.inputs[0].value)
  })
  roomModal.on('cancel', function () {
    roomModal.close()
    self.alert('Offline Mode', 'You are now in offline mode.<br>Save and refresh to join a room.')
  })
  roomModal.open()
}

Interface.prototype.alert = function (title, message, cb) {
  var alertModal = new Modal('alert', {
    title: title,
    message: message
  })
  alertModal.on('done', function (e) {
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