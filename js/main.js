var Tethys = (function () {
    
    document.querySelector('#tree').addEventListener('click', function (event) {
        if (event.target.className.indexOf('file') !== -1) {
            var fileId = event.target.dataset.fileid;
            if (fileId === 'new') {
                var parentId = event.target.dataset.parent;
                Modal.onsubmit["createFile"] = function (button, input) {
                    var newName = input[0];
                    if (newName.length <= 0) newName = "New " + button;
                    if (button === 'file') {
                        FileSystem.mkfile(parentId, newName);
                    } else if (button === 'folder'){
                        FileSystem.mkdir(parentId, newName);
                    }
                    Modal.close();
                }
                Modal.open('createFile');
            } else if (fileId === 'delete'){
                var parentId = event.target.dataset.parent;
                Modal.onsubmit["confirmFolderDelete"] = function (button, input) {
                    if (button === 'yes') {
                        FileSystem.del(parentId);
                    }
                    Modal.close();
                }
                Modal.open('confirmFolderDelete');
            }else {
                FileSystem.open(fileId);
            }

        }
    });

    document.querySelector('#delete').addEventListener('click', function (event) {
        Modal.onsubmit["confirmDelete"] = function (button, input) {
            if (button === 'yes') {
                FileSystem.delCurrent();
            }
            Modal.close();
        }
        Modal.open('confirmDelete', FileSystem.workingFile);
    });
    
    var toolbarCollapsed=false;
    document.querySelector('#collapsetoolbar').addEventListener('click', function (event) {
        toolbarCollapsed=!toolbarCollapsed;
        if (toolbarCollapsed){
            document.querySelector('.toolbar').style.height='30px';
            document.querySelector('.workspace').style.bottom='30px';
            document.querySelector('.sidebar').style.bottom='30px';
            document.querySelector('.roomlist .panel-topbar').style.display = 'none';
            document.querySelector('.onlinelist .panel-topbar').style.display = 'none';
            document.querySelector('.onlinelist').style.border = '0';
        }else{
            document.querySelector('.toolbar').style.height='';
            document.querySelector('.workspace').style.bottom='';
            document.querySelector('.sidebar').style.bottom='';
            document.querySelector('.roomlist .panel-topbar').style.display = '';
            document.querySelector('.onlinelist .panel-topbar').style.display = '';
            document.querySelector('.onlinelist').style.border = '';
        }
    });
    
    var sidebarCollapsed=false;
    document.querySelector('#collapsesidebar').addEventListener('click', function (event) {
        sidebarCollapsed=!sidebarCollapsed;
        if (sidebarCollapsed){
            document.querySelector('.sidebar').style.width='30px';
            document.querySelector('.workspace').style.left='30px';
            document.querySelector('#tree').style.display='none';
            document.querySelector('.sidebar .panel-topbar').style.display='none';
        }else{
            document.querySelector('.sidebar').style.width='';
            document.querySelector('.workspace').style.left='';
            document.querySelector('#tree').style.display='';
            document.querySelector('.sidebar .panel-topbar').style.display='';
        }
    });
    
    document.querySelector('#savezip').addEventListener('click', function (event) {
        FileSystem.saveAsZip();
    });
    
    
    document.querySelector('#settings').addEventListener('click', function (event) {
        Modal.onsubmit['themes'] = function(button, input){
            switch(button){
                case 'material':
                    FileSystem.setTheme('material');
                    break;
                case 'atom':
                    FileSystem.setTheme('atom');
                    break;
                default:
                    FileSystem.setTheme('material');
            }
            Modal.close();
        }
        Modal.open("themes");
    });


    document.querySelector('#roomlist').addEventListener('click', function (event) {
        if (event.target.className.indexOf('square') !== -1) {
            var imgEl = event.target.getElementsByTagName('img')[0];
            var userID = imgEl.dataset.userid;
            var name = imgEl.dataset.name;
            if (userID === "me" || !SocketAPI.isMyRoom) return;
            Modal.onsubmit["confirmKick"] = function () {
                SocketAPI.kick(userID);
                Modal.close();
            };
            Modal.open('confirmKick', {
                name: name
            });
        }
    });

    document.querySelector('#onlinelist').addEventListener('click', function (event) {
        if (event.target.className.indexOf('square') !== -1) {
            var imgEl = event.target.getElementsByTagName('img')[0];
            var userID = imgEl.dataset.userid;
            var name = imgEl.dataset.name;
            if (userID === "me") return;
            Modal.onsubmit["requestInvite"] = function () {
                SocketAPI.requestRoom(userID);
                Modal.close();
            };
            Modal.open('requestInvite', {
                name: name
            });
        }
    });

    var me;
    var username;
    var hash;
    Modal.onsubmit['intro'] = function (button, input) {
        if (!input[0] || input[0].length <= 1) {
            input[0]="Guest";
        }
        username = input[0];
        var pic = Math.floor(Math.random() * 15);
        hash = Math.random();
        SocketAPI.joinOnline(username, pic, hash);

        me = {
            id: "me",
            name: "You",
            pic: pic,
            hash : hash
        }
        makeUser(me, "room", true);

        Modal.open('welcome');
    }


    var roomlistElement = document.querySelector("#roomlist > .panel");
    var onlinelistElement = document.querySelector("#onlinelist > .panel");

    var roomElements = {};
    var onlineElements = {};
    var userTemplate = `<img class="user-img" data-name="{{name}}" data-userid="{{id}}" src="img/avatars/avatar-{{pic}}.png"><label>{{name}}</label>`;
    
    function makeUser(user, group, isMe){
        if (user.hash == hash && !isMe) return; //Don't make self
        var div = document.createElement('div');
        div.className = "square";
        div.innerHTML = MicroMustache.template(userTemplate, user);
        
        if (group === "online"){
            onlinelistElement.appendChild(div);
            onlineElements[user.id] = div;
        }
        if (group === 'room'){
            roomlistElement.appendChild(div);
            roomElements[user.id] = div;
        }
    }
    function removeUser(user, group){
        var re = roomElements[user.id];
        var we = onlineElements[user.id]
        if (re && re.parentNode == roomlistElement){
            roomlistElement.removeChild(roomElements[user.id]);
        }
        if (we && we.parentNode == onlinelistElement){
            onlinelistElement.removeChild(onlineElements[user.id]);
        }
    }
    function clearRoom(){
        while (roomlistElement.firstChild){
            roomlistElement.removeChild(roomlistElement.firstChild);
        }
        makeUser(me, 'room', true);
    }
    
    SocketAPI.onOtherJoinOnline = function (user) {
        removeUser(user);
        makeUser(user,'online');
    }
    SocketAPI.onOtherLeftOnline = function (user) {
        removeUser(user);
    }
    SocketAPI.onOtherJoinRoom = function (user) {
        removeUser(user);
        makeUser(user, 'room');
    }
    SocketAPI.onOtherLeftRoom = function (user) {
        removeUser(user, 'room');
    }
    SocketAPI.onWho = function(onlineList){
        for (var i=0; i<onlineList.length; i++){
            removeUser(onlineList[i]);
            makeUser(onlineList[i],'online');
        }
    }
    SocketAPI.onRequestRoom = function(user, orignalId){
        Modal.onsubmit["request-join"]=function(button){
            if (button==="accept"){
                SocketAPI.respondToRoomRequest(user.id, orignalId);
            }
            Modal.close();
        }
        Modal.open('request-join', user);
    }
    SocketAPI.onRoomRespond = function(roomOwner, who){
        Modal.onsubmit['join-response'] = function(){};
        Modal.open('join-response', {name:roomOwner.name});
        clearRoom();
        for (var i=0; i<who.length; i++){
            removeUser(who[i]);
            makeUser(who[i], 'room');
        }
        document.querySelector("#roomlist > .panel-topbar").innerHTML = roomOwner.name+"'s Room";
    }
    SocketAPI.onKick = function(onlineList){
        clearRoom();
        for (var i=0; i<onlineList.length; i++){
            removeUser(onlineList[i]);
            makeUser(onlineList[i],'online');
        }
        document.querySelector("#roomlist > .panel-topbar").innerHTML = "Your Room";
        Modal.onsubmit['kick-alert'] = function(){};
        Modal.open('kick-alert');
    }

    FileSystem.init();
    FileSystem.open("welcome");
    Modal.open('intro');
    
    var code = Util.getParameterByName("code");
    var ext= Util.getParameterByName("ext");
    FileSystem.openString(code,ext);
    
    
    console.log("%c Rock that console! If you're after the source: https://github.com/RationalCoding/TETHYS", "color:#263238; font-size: 15px;");

}())