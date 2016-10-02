var Tethys = (function (my, Modal, FileSystem) {
    var username = "Guest";
    var users = {};

    var roomListElement = document.querySelector('.roomlist > .panel');
    var onlineListElement = document.querySelector('.onlinelist > .panel');

    function User(name, id, status, isMe) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.inRoom = false;
        this.isMe = isMe;
        this.profilePic = Math.floor(Math.random() * 16);
        this.template = `<img class="user-img" data-user="{{id}}" src="img/avatars/avatar-{{profilePic}}.png"><label>{{name}}</label>`;
        this.element = document.createElement('div');
        this.element.className = "square";
        this.element.innerHTML = MicroMustache.template(this.template, this);
        onlineListElement.appendChild(this.element);

        this.moveUser = function (group) {
            document.removeChild(this.element);
            if (group === "room") {
                roomListElement.appendChild(this.element);
            } else {
                onlineListElement.appendChild(this.element);
            }
        }
        users[this.id] = this; //Add to user dictionary
    }


    document.querySelector('#roomlist').addEventListener('click', function (event) {
        if (event.target.className.indexOf('user-img') !== -1) {
            var userID = event.target.dataset.user;
            var user = users[userID];
            if (user.isMe) return;

        }
    });

    document.querySelector('#onlinelist').addEventListener('click', function (event) {
        if (event.target.className.indexOf('user-img') !== -1) {
            var userID = event.target.dataset.user;
            var user = users[userID];
            if (user.isMe) return;
            Modal.onsubmit["requestInvite"] = function () {
                requestInvite(user);
            }
            Modal.open('requestInvite', {
                name: user.name
            });
        }
    });

    document.querySelector('#tree').addEventListener('click', function (event) {
        if (event.target.className.indexOf('file') !== -1) {
            var id = event.target.dataset.id;
            if (id === 'new') {
                var parentId = event.target.dataset.parent;
                Modal.onsubmit["createFile"] = function (button, input) {
                    var newName = input[0];
                    if (newName.length <= 0) newName = "New " + button;
                    if (button === 'file') {
                        FileSystem.mkfile(parentId, newName);
                    } else {
                        FileSystem.mkdir(parentId, newName);
                    }
                    Modal.close();
                }
                Modal.open('createFile');
            } else {
                FileSystem.open(id);
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

    Modal.onsubmit['intro'] = function (button, input) {
        if (!input[0] || input[0].length <= 0) {
            Modal.open('intro', {
                flash: "<span class='red'>You need a username!</span>"
            });
            return;
        } else if (!input[0] || input[0].length <= 1) {
            Modal.open('intro', {
                flash: "<span class='red'>It has to be more than just one letter!</span>"
            });
            return;
        }
        username = input[0];
        new User(username, Math.random(), "", true);
        Modal.open('welcome');
    }

    for (var i = 0; i < 10; i++) {
        new User(Math.random(), Math.random(), "", false);
    }

    FileSystem.init();
    FileSystem.open("startScript");
    Modal.open('intro');
}({}, Modal, FileSystem))