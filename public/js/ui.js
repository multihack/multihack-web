/*

ui.js

This module controls all of the UI.
All DOM manipulation (aside from the editor and file tree, should go here)

*/

var UI = (function (FileSystem, Sockets, HyperHost, Modal, $, Microstache, Util, Config) {
    'use strict';

    $.event('#tree', 'click', function (event) {
        if (event.target.className.indexOf('file') !== -1) {
            var fileId = event.target.dataset.fileid,
                parentId = event.target.dataset.parent;

            switch (fileId) {

                /* Clicked a plus element */
            case 'new':
                Modal.next("createFile", function (button, input) {
                    var newName = input[0];
                    if (newName.length <= 0) {
                        newName = "New " + button;
                    }
                    if (button === 'file') {
                        FileSystem.mkfile(parentId, newName);
                        Modal.close();
                    } else if (button === 'folder') {
                        FileSystem.mkdir(parentId, newName);
                        Modal.close();
                    } else if (button === "github") {
                        Modal.next("github", function (button, input) {
                            FileSystem.fetchRepo(parentId, input[0], input[1]);
                            Modal.close();
                        });
                        Modal.open("github");
                    } else {
                        Modal.close();
                    }
                });
                Modal.open('createFile');
                $.event("#fileUpload", 'change', function (event) {
                    var files = event.target.files,
                        i;
                    for (i = 0; i < files.length; i += 1) {
                        FileSystem.loadFile(files[i], parentId);
                    }
                    Modal.close();
                });
                break;


                /* Click a minus element */
            case 'delete':
                var fileName = event.target.dataset.name;
                Modal.next("confirmFolderDelete", function (button, input) {
                    if (button === 'yes') {
                        FileSystem.delFile(parentId);
                    }
                    Modal.close();
                });
                Modal.open('confirmFolderDelete', {
                    name: fileName
                });
                break;


                /* Normal file open*/
            default:
                FileSystem.open(fileId);
            }
        }
    });

    $.event('#delete', 'click', function (event) {
        Modal.next("confirmDelete", function (button, input) {
            if (button === 'yes') {
                FileSystem.delCurrent();
            }
            Modal.close();
        });
        Modal.open('confirmDelete', FileSystem.workingFile);
    });
    
    var contrastToggle = false;
    $.event('#image-contrast', 'click', function(event){
        contrastToggle=!contrastToggle;
        $('.image-wrapper').style.backgroundColor = contrastToggle ? 'white' : 'black';
        $('.image-wrapper > .image-contrast > img').src = contrastToggle ? 'img/contrast-black.png' : 'img/contrast-white.png'
    });

    var toolbarCollapsed = false;
    $.event('#collapsetoolbar', 'click', function (event) {
        toolbarCollapsed = !toolbarCollapsed;
        if (toolbarCollapsed) {
            $('.toolbar').style.height = '30px';
            $('.workspace').style.bottom = '30px';
            $('.sidebar').style.bottom = '30px';
            $('.roomlist .panel-topbar').style.display = 'none';
            $('.onlinelist .panel-topbar').style.display = 'none';
            $('.onlinelist').style.border = '0';
        } else {
            $('.toolbar').style.height = '';
            $('.workspace').style.bottom = '';
            $('.sidebar').style.bottom = '';
            $('.roomlist .panel-topbar').style.display = '';
            $('.onlinelist .panel-topbar').style.display = '';
            $('.onlinelist').style.border = '';
        }
    });

    var sidebarCollapsed = false;
    $.event('#collapsesidebar', 'click', function (event) {
        sidebarCollapsed = !sidebarCollapsed;
        if (sidebarCollapsed) {
            $('.sidebar').style.width = '30px';
            $('.workspace').style.left = '30px';
            $('#tree').style.display = 'none';
            $('.sidebar .panel-topbar').style.display = 'none';
        } else {
            $('.sidebar').style.width = '';
            $('.workspace').style.left = '';
            $('#tree').style.display = '';
            $('.sidebar .panel-topbar').style.display = '';
        }
    });
    
    
    
    function handleSave(){
        Modal.next("save", function (button, input) {
            if (button === "zip") {
                FileSystem.saveAsZip();
            } else if (button === "local") {
                FileSystem.saveLocal();
            }
            Modal.close();
        });
        Modal.open('save');
    }
    
    $.event('#savezip', 'click', handleSave);
    
    document.addEventListener("keydown", function (e) {
        if (e.keyCode == 83 && (navigator.platform.match("Mac") ? e.metaKey : e.ctrlKey)) {
            e.preventDefault();
            handleSave();
        }
    }, false);

    /* Clicking the "deploy button" deploys the tree to HyperHost */
    var hh = new HyperHost();
    $.event("#deploy", 'click', function (e) {
        hh.io.contentTree = FileSystem.getFileTree();
        hh.launch();
        console.log(hh.clientURL);
        window.open(hh.clientURL, "_blank");
    });


    $.event('#settings', 'click', function (event) {
        Modal.next('themes', function (button, input) {
            FileSystem.setTheme(button);
        });
        Modal.open("themes");
    });

    $.event('#roomlist', 'click', function (event) {
        if (event.target.className.indexOf('square') !== -1) {
            var imgEl = event.target.getElementsByTagName('img')[0],
                userID = imgEl.dataset.userid,
                name = imgEl.dataset.name;
            if (userID === "me" || !Sockets.isMyRoom) {
                return;
            }
            Modal.next("confirmKick", function () {
                Sockets.kick(userID);
                Modal.close();
            });
            Modal.open('confirmKick', {
                name: name
            });
        }
    });

    $.event('#onlinelist', 'click', function (event) {
        if (event.target.className.indexOf('square') !== -1) {
            var imgEl = event.target.getElementsByTagName('img')[0],
                userID = imgEl.dataset.userid,
                name = imgEl.dataset.name;
            if (userID === "me") {
                return;
            }
            Modal.next("requestInvite", function () {
                Sockets.requestRoom(userID);
                Modal.close();
            });
            Modal.open('requestInvite', {
                name: name
            });
        }
    });

    var me,
        username,
        hash;
    Modal.next('intro', function (button, input) {
        if (!input[0] || input[0].length <= 1) {
            input[0] = "Guest";
        }
        username = input[0];
        var pic = Math.floor(Math.random() * 95);
        hash = Math.random();
        Sockets.joinOnline(username, pic, hash);

        me = {
            id: "me",
            name: "You",
            pic: pic,
            hash: hash
        };
        makeUser(me, "room", true);

        Modal.open('welcome');
    });


    var roomlistElement = $("#roomlist > .panel"),
        onlinelistElement = $("#onlinelist > .panel"),

        roomElements = {},
        onlineElements = {},
        cursors = {},
        userTemplate = '<img class="user-img" data-name="{{name}}" data-userid="{{id}}" src="img/miniman/avatar-{{pic}}.png"><label>{{name}}</label>';


    function makeCursor(user) {
        var img = document.createElement('img');
        img.src = "img/pointer.png";
        img.className = "cursor";
        img.displayed = false;
        img.style.display = 'none';
        cursors[user.id] = document.body.appendChild(img);
    }

    function getSidebarWidth() {
        if (sidebarCollapsed){
            return 30;
        }
        if (window.innerWidth >= 768) {
            return 340;
        } else {
            return 150;
        }
    }

    function getEditorWidth() {
        return window.innerWidth - getSidebarWidth() - 29; //29 is width of number column
    }
    
    function getEditorOffset(){
        return $.first('.CodeMirror-scroll').scrollTop;
    }

    function moveCursor(userId, coords) {
        
        var x = coords.x + getSidebarWidth() - 4,
            y = coords.y - getEditorOffset();

        cursors[userId].style.left = x + "px";
        cursors[userId].style.top = y + "px";
        if (coords.down){
            cursors[userId].style.border = "2px solid red";
        }else{
            cursors[userId].style.border = "";
        }
    }

    var cursorMoveMutex = false,
        lastCursor = {
            x: 0,
            y: 0
        };
    window.addEventListener('mousemove', function (e) {
        //TODO: Calculate cursor positions on editor
        if (window.innerWidth < 480) {
            return; //Mismatches on mobile get too extreme, cursor disabled
        }
        var sidebarWidth = getSidebarWidth()
        if (e.clientX < sidebarWidth){
            return; //Don't track on sidebar
        }

        lastCursor = {
            x: e.clientX - sidebarWidth, //Subtract sidebar width
            y: e.clientY + getEditorOffset(),
            down: mouseDown
        };

        if (cursorMoveMutex) {
            return;
        }
        cursorMoveMutex = true;
        setTimeout(function () {
            Sockets.moveCursor(lastCursor, FileSystem.workingFile.fileId);
            cursorMoveMutex = false;
        }, 100);

    });
    
    var mouseDown = false;
    window.addEventListener('mousedown', function (e) {
        mouseDown = true;
        lastCursor.down=true;
        Sockets.moveCursor(lastCursor, FileSystem.workingFile.fileId); //This doesn't need a throttle
    });
    window.addEventListener('mouseup', function (e) {
        mouseDown=false; 
        lastCursor.down=false;
        Sockets.moveCursor(lastCursor, FileSystem.workingFile.fileId);
    });


    window.addEventListener('mouseout', function (e) {
        e = e || window.event;
        var from = e.relatedTarget || e.toElement;
        if (!from || from.nodeName === "HTML") {
            setTimeout(function () {
                Sockets.moveCursor({
                    x: -50,
                    y: -50,
                    down: false
                }, FileSystem.workingFile.fileId);
            }, 500);
        }
    }, false);

    Sockets.on('remotemousemove', function (userId, fileId, coords) {
        //TODO: Calculate cursor positions on editor
        if (window.innerWidth < 480) {
            return; //Mismatches on mobile get too extreme, cursor disabled
        }
        if (fileId === FileSystem.workingFile.fileId) {
            if (!cursors[userId].displayed) {
                cursors[userId].displayed = true;
                cursors[userId].style.display = '';
            }
            moveCursor(userId, coords);
        } else {
            if (cursors[userId].displayed) {
                cursors[userId].displayed = false;
                cursors[userId].style.display = 'none';
            }
        }
    });


    function makeUser(user, group, isMe) {
        if (user.hash === hash && !isMe) {
            return; //Don't make self
        }
        var div = document.createElement('div');
        div.className = "square";
        div.innerHTML = Microstache.template(userTemplate, user);

        if (group === "online") {
            onlinelistElement.appendChild(div);
            onlineElements[user.id] = div;
        }
        if (group === 'room') {
            roomlistElement.appendChild(div);
            roomElements[user.id] = div;
        }
    }

    /* Removes the DOM node representing a user */
    function removeUser(user, group) {
        var re = roomElements[user.id],
            we = onlineElements[user.id];

        if (re && re.parentNode === roomlistElement) {
            roomlistElement.removeChild(roomElements[user.id]);
        }
        if (we && we.parentNode === onlinelistElement) {
            onlinelistElement.removeChild(onlineElements[user.id]);
        }
    }

    /* Removes all DOM nodes for users in the room */
    function clearRoom() {
        while (roomlistElement.firstChild) {
            roomlistElement.removeChild(roomlistElement.firstChild);
        }
        makeUser(me, 'room', true);
    }



    Sockets.on('onlinejoin', function (user) {
        removeUser(user);
        makeUser(user, 'online');
    });

    Sockets.on('onlineleave', function (user) {
        removeUser(user);
        if (cursors[user.id]) {
            cursors[user.id].parentNode.removeChild(cursors[user.id]); // Remove their cursor
        }
    });

    Sockets.on('roomjoin', function (user) {
        removeUser(user);
        makeUser(user, 'room');
        makeCursor(user); //Make a cursor
    });

    Sockets.on('roomleave', function (user) {
        removeUser(user, 'room');
        if (cursors[user.id]) {
            cursors[user.id].parentNode.removeChild(cursors[user.id]); // Remove their cursor
        }
    });

    Sockets.on('onlinewho', function (onlineList) {
        for (var i = 0; i < onlineList.length; i++) {
            removeUser(onlineList[i]);
            makeUser(onlineList[i], 'online');
        }
    });

    Sockets.on('roomrequest', function (user, orignalId) {
        Modal.next("request-join", function (button) {
            if (button === "accept") {
                Sockets.respondToRoomRequest(user.id, orignalId);
            }
            Modal.close();
        });
        Modal.open('request-join', user);
    });

    Sockets.on('roomresponse', function (roomOwner) {
        Modal.next('join-response', function () {});
        Modal.open('join-response', {
            name: roomOwner.name
        });
        $("#roomlist > .panel-topbar").innerHTML = roomOwner.name + "'s Room";
    });

    Sockets.on('roomwho', function (who) {
        clearRoom();
        for (var i = 0; i < who.length; i++) {
            removeUser(who[i]);
            makeUser(who[i], 'room');
            makeCursor(who[i]);
        }
    });

    Sockets.on('kick', function (onlineList) {
        clearRoom();
        for (var i = 0; i < onlineList.length; i++) {
            removeUser(onlineList[i]);
            makeUser(onlineList[i], 'online');
        }
        $("#roomlist > .panel-topbar").innerHTML = "Your Room";
        Modal.next('kick-alert', function () {});
        Modal.open('kick-alert');
    });

    FileSystem.init(true); //Initialize
    FileSystem.open("welcome"); //Open welcome file
    $("#blocking-overlay").style.background = "";
    $("#blocking-overlay").innerHTML = "";
    Modal.open('intro'); //Open introduction modal


    // Read options inside the URL
    var code = Util.getParameterByName("code"),
        ext = Util.getParameterByName("ext"),
        theme = Util.getParameterByName("theme");
    FileSystem.openString(code, ext);
    if (theme) FileSystem.setTheme(theme);

    console.log("%c Hack that console! If you're after the source: https://github.com/RationalCoding/MultiHack", "color:#263238; font-size: 15px;");

}(FileSystem, Sockets, HyperHost, Modal, $, Microstache, Util, Config.UI))