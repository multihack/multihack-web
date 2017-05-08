var dict = {}
var lang = require('./lang/lang')
var lg = lang.get.bind(lang)

dict['file'] =
    '<h1>{{title}}</h1>' +
    '<p>{{message}}</p>' +
    '<input style="display:none" type="file">' +
    '<button id="file-button" class="go-button">'+lg('upload')+'</button>' +
    '<button class="no-button">'+lg('skip')+'</button>'

dict['input'] =
    '<h1>{{title}}</h1>' +
    '<p>{{message}}</p>' +
    '<input class="modal-input" placeholder="{{placeholder}}" value="{{default}}" type="text"><br>' +
    '<button class="go-button">'+lg('join')+'</button>' 

dict['confirm-delete'] =
    '<h1>{{title}}</h1>' +
    '<p>Are you sure you want to delete "{{fileName}}"?</p>' +
    '<button class="go-button">'+lg('delete')+'</button>' +
    '<button class="no-button">'+lg('cancel')+'</button>'

dict['force-input'] =
    '<h1>{{title}}</h1>' +
    '<p>{{message}}</p>' +
    '<input class="modal-input" placeholder="{{placeholder}}" value="{{default}}" type="text"><br>' +
    '<button class="go-button">'+lg('join')+'</button>'

dict['alert'] =
    '<h1>{{title}}</h1>' +
    '<p>{{message}}</p>' +
    '<button class="go-button">'+lg('continue')+'</button>'

dict['alert-html'] =
    '<h1>{{title}}</h1>' +
    '<p>{{{message}}}</p>' +
    '<button class="go-button">'+lg('continue')+'</button>'

dict['newFile'] =
    '<h1>{{title}}</h1>' +
    '<input type="text" placeholder="'+lg('name')+'"></input><br>' +
    '<button class="go-button" data-type="file">'+lg('file')+'</button>' +
    '<button class="go-button" data-type="dir">'+lg('folder')+'</button>' +
    '<button class="no-button">'+lg('cancel')+'</button>'

dict['network'] = 
    '<h1>Room <b>{{room}}</b></h1>' +
    '<div id="network-graph"></div>'+
    '<button class="no-button">'+lg('close')+'</button>'

module.exports = dict