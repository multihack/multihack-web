var dict = {}

dict['file'] =
    '<h1>{{title}}</h1><br>' +
    '<p>{{{message}}}</p>' +
    '<input style="display:none" type="file">' +
    '<button id="file-button" class="go-button">Upload</button>' +
    '<button class="no-button">Skip</button>'

dict['input'] =
    '<h1>{{title}}</h1>' +
    '<p>{{{message}}}</p>' +
    '<input class="modal-input" placeholder="{{placeholder}}" value="{{default}}" type="text">' +
    '<button class="go-button">Join</button>' +
    '<button class="no-button">Skip</button>'

dict['force-input'] =
    '<h1>{{title}}</h1>' +
    '<p>{{{message}}}</p>' +
    '<input class="modal-input" placeholder="{{placeholder}}" value="{{default}}" type="text">' +
    '<button class="go-button">Join</button>'

dict['alert'] =
    '<h1>{{title}}</h1>' +
    '<p>{{{message}}}</p>' +
    '<button class="go-button">Continue</button>'

dict['newFile'] =
    '<h1>{{title}}</h1>' +
    '<input type="text" placeholder="Name"></input><br>' +
    '<button class="go-button" data-type="file">File</button>' +
    '<button class="go-button" data-type="dir">Folder</button>' +
    '<button class="no-button">Cancel</button>'

dict['network'] = 
    '<h1>Room <b>{{room}}</b></h1>' +
    '<div id="network-graph"></div>'+
    '<button class="no-button">Close</button>'

module.exports = dict
