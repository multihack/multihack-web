var Tethys = (function (my) {
    
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
                        Modal.close();
                    } else if (button === 'folder'){
                        FileSystem.mkdir(parentId, newName);
                        Modal.close();
                    } else if (button === "github"){
                        Modal.onsubmit["github"] = function(button, input){
                            FileSystem.fetchRepo(parentId, input[0], input[1]);
                            Modal.close();
                        }
                        Modal.open("github");
                    }else{
                        Modal.close();
                    }     
                }
                Modal.open('createFile');
                document.querySelector("#fileUpload").addEventListener('change', function(event){
                    var files = event.target.files;
                    for (var i=0; i<files.length; i++){
                        FileSystem.loadFile(files[i], parentId);
                    }
                    Modal.close();
                });
            } else if (fileId === 'delete'){
                var parentId = event.target.dataset.parent;
                var fileName = event.target.dataset.name;
                Modal.onsubmit["confirmFolderDelete"] = function (button, input) {
                    if (button === 'yes') {
                        FileSystem.del(parentId);
                    }
                    Modal.close();
                }
                Modal.open('confirmFolderDelete',{name:fileName});
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
        Modal.onsubmit["save"] = function (button, input) {
            if (button === "zip"){
                FileSystem.saveAsZip();
            }else if (button === "local"){
                FileSystem.saveLocal();
            }
            Modal.close();
        }
        Modal.open('save');
    });
    
    
    document.querySelector('#settings').addEventListener('click', function (event) {
        Modal.onsubmit['themes'] = function(button, input){
            FileSystem.setTheme(button);
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
        var pic = Math.floor(Math.random() * 95);
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
    var userTemplate = `<img class="user-img" data-name="{{name}}" data-userid="{{id}}" src="img/miniman/avatar-{{pic}}.png"><label>{{name}}</label>`;
    
    
    my.roomEmpty = function(){
        return roomElements <= 1;
    }
    
    var cursors = {};
    
    function makeCursor(user){
        var img = document.createElement('img');
        img.src="img/pointer.png";
        img.className = "cursor";
        img.displayed=false;
        img.style.display='none';
        cursors[user.id]=document.body.appendChild(img);
    }
    
    function moveCursor(userId, coords){
        var x = coords.x+getSidebarWidth()-4;
        while (x > window.innerWidth){ //Deal with line wrapping (only large to small for now)
            x = x - getEditorWidth();
            coords.y = coords.y+19; //19 is height of line
        }
        
        cursors[userId].style.left = x+"px";
        cursors[userId].style.top = coords.y+"px";
    }
        
    function getEditorWidth(){
        return window.innerWidth - getSidebarWidth() - 29; //29 is width of number column
    }
    
    function getSidebarWidth(){
        if (window.innerWidth >= 768){
            return 340;
        }else{
            return 150;
        }
    }
    
    var cursorMoveMutex = false;
    var lastCursor = {x: 0, y:0};
    var sidebarWidth;
    window.addEventListener('mousemove', function(e){
        //TODO: Calculate cursor positions on editor
        if (window.innerWidth < 480) return; //Mismatches on mobile get too extreme
        if (my.roomEmpty()) return;
        //Subtract sidebar width
        lastCursor={x: e.clientX-getSidebarWidth(), y: e.clientY};
        
        if (cursorMoveMutex) return;  //Ratelimit
        cursorMoveMutex = true;
        setTimeout(function(){
            SocketAPI.moveCursor(lastCursor);
            cursorMoveMutex = false;
        },100);
        
    });
    
    
    window.addEventListener('mouseout', function(e){
        e = e ? e : window.event;
        var from = e.relatedTarget || e.toElement;
        if (!from || from.nodeName == "HTML") {
            setTimeout(function(){
                SocketAPI.moveCursor({x:-50, y:-50});
            },500);
        }
    },false);
    
    
    SocketAPI.onMoveCursor = function(userId, fileId, coords) {
        //TODO: Calculate cursor positions on editor
        if (window.innerWidth < 480) return; //Mismatches on mobile get too extreme
        if (fileId === FileSystem.workingFile.fileId){
            if (!cursors[userId].displayed){
                cursors[userId].displayed=true;
                cursors[userId].style.display = '';
            }
            moveCursor(userId, coords);
        }else{
            if (cursors[userId].displayed){
                cursors[userId].displayed=false;
                cursors[userId].style.display = 'none';
            }
        }
    }
    
    
    function makeUser(user, group, isMe){
        if (user.hash == hash && !isMe) return; //Don't make self
        var div = document.createElement('div');
        div.className = "square";
        div.innerHTML = Microstache.template(userTemplate, user);
        
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
        if (cursors[user.id]){
            cursors[user.id].parentNode.removeChild(cursors[user.id]); // Remove their cursor
        }  
    }
    SocketAPI.onOtherJoinRoom = function (user) {
        removeUser(user);
        makeUser(user, 'room');
        makeCursor(user); //Make a cursor
    }
    SocketAPI.onOtherLeftRoom = function (user) {
        removeUser(user, 'room');
        if (cursors[user.id]){
            cursors[user.id].parentNode.removeChild(cursors[user.id]); // Remove their cursor
        }
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
            makeCursor(who[i]);
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

    FileSystem.init(true);
    FileSystem.open("welcome");
    Modal.open('intro');
    
    var code = Util.getParameterByName("code");
    var ext= Util.getParameterByName("ext");
    var theme = Util.getParameterByName("theme");
    FileSystem.openString(code,ext);
    if (theme){
        FileSystem.setTheme(theme);
    }
    
    console.log("%c Rock that console! If you're after the source: https://github.com/RationalCoding/MultiHack", "color:#263238; font-size: 15px;");

    
    return my;
}({}))