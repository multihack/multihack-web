var EventEmitter = require('events').EventEmitter
var inherits = require('inherits')
var Modal = require('./modal')
var TreeView = require('./treeview')
var PeerGraph = require('p2p-graph')
var cuid = require('cuid')
var lang = require('./lang/lang')
var lg = lang.get.bind(lang)

inherits(Interface, EventEmitter)

function Interface () {
  var self = this
  if (!(self instanceof Interface)) return new Interface()

  self.treeview = new TreeView()

  self.treeview.on('open', function (e) {
    self.emit('openFile', e)
  })

  self.treeview.on('remove', function (e) {
    self.emit('removeDir', e)
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
  self.collapsed = false
  document.getElementById('collapsesidebar').addEventListener('click', function () {
    self.collapsed = !self.collapsed
    if (self.collapsed) {
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
}

Interface.prototype.newFileDialog = function (path, cb) {
  var self = this

  var modal = new Modal('newFile', {
    title: lg('create_title'),
    path: path
  })

  modal.on('done', function (e) {
    modal.close()
    var name = e.inputs[0].value
    var type = e.target.dataset['type']
    if (!name) {
      name = (type === 'dir' ? lg('new_folder') : lg('new_file')) + '-' + cuid().slice(-7,-1)
    }
    if (cb) cb(name, type)
  })
  modal.on('cancel', function () {
    modal.close()
  })
  modal.open()
}

Interface.prototype.confirmDelete = function(fileName, cb) {
  var modal = new Modal('confirm-delete', {
    fileName: fileName
  })

  modal.on('done', function (e) {
    modal.close()
    if (cb) cb(true)
  })
  modal.on('cancel', function () {
    modal.close()
  })
  modal.open()
}

Interface.prototype.getProject = function (cb) {
  // var self = this

  var projectModal = new Modal('file', {
    title: lg('load_title'),
    message: lg('load_prompt')
  })
  projectModal.on('cancel', function () {
    projectModal.close()
    if (cb) cb(null)
  })
  projectModal.open()
  
  var input = projectModal.el.querySelector('input[type="file"]')
  projectModal.el.querySelector('#file-button').addEventListener('click', function () {
    input.click()
  })
  input.addEventListener('change', function () {
    projectModal.close()
    cb(input.files[0])
  })
}

Interface.prototype.getRoom = function (roomID, cb) {
  var self = this

  var roomModal = new Modal('input', {
    title: lg('choose_room_title'),
    message: lg('choose_room_prompt'),
    placeholder: lg('room_placeholder'),
    default: roomID
  })
  roomModal.on('done', function (e) {
    roomModal.close()
    self.getNickname(e.inputs[0].value, cb)
  })
  roomModal.on('cancel', function () {
    roomModal.close()
    self.alertHTML(lg('offline_title'), lg('offline_alert'))
  })
  roomModal.open()
}

Interface.prototype.getNickname = function (room, cb) {
  var self = this

  var modal = new Modal('force-input', {
    title: lg('nickname_prompt_title'),
    message: lg('nickname_prompt'),
    placeholder: lg('nickname_placeholder'),
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

Interface.prototype.flashTooltip = function (id, message) {
  var tooltip = document.getElementById(id)
  var span = tooltip.querySelector('span')
  
  span.innerHTML = message
  tooltip.style.opacity = 1
  tooltip.style.display = ''
  
  setTimeout(function () {
    tooltip.style.opacity = 0
    setTimeout(function () {
      tooltip.style.display = ''
    }, 300)
  }, 3000)
}

Interface.prototype.alertHTML = function (title, message, cb) {
  var alertModal = new Modal('alert-html', {
    title: title,
    message: message
  })
  alertModal.on('done', function (e) {
    alertModal.close()
    if (cb) cb()
  })
  alertModal.open()
}

Interface.prototype.embedMode = function () {
  var self = this
  
  self.collapsed = true
  document.querySelector('body').className+=' embed'
  document.querySelector('#sidebar').className = 'sidebar theme-light collapsed'
}

Interface.prototype.setRoom = function (roomID) {
  document.querySelector('#room').innerHTML = roomID
}

Interface.prototype.showNetwork = function (peers, room, nop2p, mustForward) {

  var modal = new Modal('network', {
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
    name: lg('you')
  })

  var proxyID = nop2p ? 'Server' : 'Me'

  if (mustForward || nop2p) {
    graph.add({
      id: 'Server',
      me: false,
      name: lg('server')
    })
    graph.connect('Server', 'Me')
  }

  for (var i=0; i<peers.length;i++){
    graph.add({
      id: peers[i].id,
      me: false,
      name: peers[i].metadata.nickname
    })
    if (peers[i].nop2p) {
      graph.connect('Server', peers[i].id)
    } else {
      graph.connect(proxyID, peers[i].id)
    }
  }

  modal.on('done', function (e) {
    graph.destroy()
  })
}

Interface.prototype.hideOverlay = function (msg, cb) {
  document.getElementById('overlay').style.display = 'none'
  document.getElementById('modal').style.display = 'none'
}

Interface.prototype.showOverlay = function (msg, cb) {
  document.getElementById('overlay').style.display = ''
}

module.exports = new Interface()
