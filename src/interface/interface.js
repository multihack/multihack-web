var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var Modal = require('./modal')
var TreeView = require('./treeview')
var PeerGraph = require('p2p-graph')

inherits(Interface, EventEmitter)

function Interface () {
  var self = this
  if (!(self instanceof Interface)) return new Interface()

  self.treeview = new TreeView()

  self.treeview.on('open', function (e) {
    self.emit('openFile', e)
  })

  self.treeview.on('remove', function (e) {
    self.emit('removeFile', e)
  })

  self.addCounter = 1
  self.treeview.on('add', function (e) {
    self.newFileDialog(e.path, function (name, type) {
      e.path = e.path + '/' + name
      if (type === 'dir') {
        self.emit('addDir', e)
      } else {
        self.emit('addFile', e)
      }
    })
  })

  // Setup sidebar
  var sidebar = document.getElementById('sidebar')
  var collapsed = false
  document.getElementById('collapsesidebar').addEventListener('click', function () {
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
  
  // Network button
  document.getElementById('network').addEventListener('click', function () {
    self.emit('showNetwork')
  })

  // Setup delete button
  document.getElementById('delete').addEventListener('click', function () {
    self.emit('deleteCurrent')
  })

  // Resync button
  document.getElementById('resync').addEventListener('click', function () {
    self.emit('resync')
  })
}

Interface.prototype.newFileDialog = function (path, cb) {
  var self = this

  var modal = new Modal('newFile', {
    title: 'Create File/Folder',
    path: path
  })

  modal.on('done', function (e) {
    modal.close()
    var name = e.inputs[0].value
    var type = e.target.dataset['type']
    if (!name) {
      name = (type === 'dir' ? 'New Folder' : 'New File') + self.addCounter++
    }
    if (cb) cb(name, type)
  })
  modal.on('cancel', function () {
    modal.close()
  })
  modal.open()
}

Interface.prototype.getProject = function (cb) {
  // var self = this

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
    title: 'Join Room',
    message: 'Enter the ID of the room you want to join.',
    placeholder: 'RoomID',
    default: roomID
  })
  roomModal.on('done', function (e) {
    roomModal.close()
    self.getNickname(e.inputs[0].value, cb)
  })
  roomModal.on('cancel', function () {
    roomModal.close()
    self.alert('Offline Mode', 'You are now in offline mode.<br>Save and refresh to join a room.')
  })
  roomModal.open()
}

Interface.prototype.getNickname = function (room, cb) {
  var self = this

  var modal = new Modal('force-input', {
    title: 'Choose Nickname',
    message: 'Enter any nickname so that your team can identify you.',
    placeholder: 'Nickname',
    default: ''
  })
  modal.on('done', function (e) {
    modal.close()
    if (cb) cb({
      room: room,
      nickname: e.inputs[0].value
    })
  })
  modal.open()
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

Interface.prototype.showNetwork = function (peers, room) {

  var modal = new Modal('network', {
    peers: peers,
    room: room
  })
  
  modal.on('cancel', function () {
    modal.close()
  })
  
  modal.open()
  
  var el = document.querySelector('#network-graph')
  el.style.overflow = 'hidden'
  var graph = new PeerGraph(el)
  
  graph.add({
    id: 'Me',
    me: true,
    name: 'You'
  })
  
  for (var i=0; i<peers.length;i++){
    graph.add({
      id: peers[i].id,
      me:false,
      name: peers[i].metadata.nickname
    })
    graph.connect('Me', peers[i].id)
  }
  
  modal.on('done', function (e) {
    graph.destroy()
  })
}

Interface.prototype.removeOverlay = function (msg, cb) {
  document.getElementById('overlay').style.display = 'none'
}

Interface.prototype.showOverlay = function (msg, cb) {
  document.getElementById('overlay').style.display = ''
}

module.exports = new Interface()
