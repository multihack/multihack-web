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
    '<button class="go-button">Continue</button>'


module.exports = dict