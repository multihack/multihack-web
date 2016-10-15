/* Module to handle files */
var FileSystem = (function (my, SocketAPI, HyperHost) {
    'use strict';

    function getUniqueId() {
        return Math.random().toString();
    }


    var fileTree = [
        {
            name: "index.html",
            fileId: "welcome",
            content: "Welcome to TETHYS!\n\n-Collaborate in real-time.\n-Syntax highlighting for every web language.\n-Voice chat with up to 10 people! (WebRTC only)\n-Instantly deploy your website via HyperHost (WebRTC only)\n-Save your project for working offline.\n-TETHYS is the ONLY multi-file, multi-user code editor on the web."
        }
    ];

    SocketAPI.onAllCode = function (newFileTree) {
        fileTree = newFileTree;
        my.init();
    }

    var rootTreeElement = document.getElementById('tree');
    var rootPlusElement;

    my.editor = null;
    my.workingFile = null;

    function renderFullTree(treeElement, nodeList, parentId, parent) {
        while (treeElement.firstChild) { //Empty the tree
            treeElement.removeChild(treeElement.firstChild);
        }
        for (var i = 0; i < nodeList.length; i++) { //Iterate childre
            var file = nodeList[i];
            if (file.isRemoved) continue;
            file.fileId = file.fileId || getUniqueId();
            file.parentElement = (parent && parent.el) || rootTreeElement;

            var li = document.createElement('li');

            if (file.nodes) {
                li.innerHTML = '<label for="' + file.fileId + '">' + file.name + '</label><input checked type="checkbox" id="' + file.fileId + '" />'

                var ol = document.createElement('ol');
                file.el = ol;
                file.realEl = li;
                renderFullTree(ol, file.nodes, file.fileId, file); //Recursive call
                li.appendChild(ol);
            } else {
                li.className = "file";
                li.innerHTML = '<a data-fileid="' + file.fileId + '" href="#" class="filelink" id="' + file.fileId + '">' + file.name + '</a>';
                file.el = li;
                file.realEl = li;
            }
            treeElement.appendChild(li);
        }
        var plusEl = document.createElement('li');

        if (parentId !== 'root') {
            plusEl.innerHTML = '<a data-fileid="new" data-parent="' + parentId + '" href="#" class="filelink plus">+</a><a data-fileid="delete" data-parent="' + parentId + '" href="#" class="filelink minus plus red">-</a>';
        } else {
            plusEl.innerHTML = '<a data-fileid="new" data-parent="' + parentId + '" href="#" class="filelink plus">+</a>';
        }
        if (parent) {
            parent.plusElement = plusEl;
        } else {
            rootPlusElement = plusEl;
        }
        treeElement.appendChild(plusEl);
    }

    function getNode(fileId, nodeList) {
        for (var i = 0; i < nodeList.length; i++) { //Iterate children
            if (nodeList[i].isRemoved) continue;
            if (nodeList[i].fileId == fileId || (fileId == "*" && !nodeList[i].nodes)) {
                return nodeList[i];
            }
            if (nodeList[i].nodes) {
                var recursiveResult = getNode(fileId, nodeList[i].nodes);
                if (recursiveResult) {
                    return recursiveResult;
                }
            }
        }
        return undefined;
    }

    function deleteNode(child) {
        child.parentElement.removeChild(child.realEl);
        child.isRemoved = true;
    }

    function openAny() {
        my.workingFile = getNode("*", fileTree);
        if (!my.workingFile) {
            my.mkfile('root', 'index.html');
        }
        my.workingFile = getNode("*", fileTree);
        document.getElementById("workingFile").innerHTML = my.workingFile.name;
        my.editor.getDoc().setValue(my.workingFile.content || "");
        my.editor.setOption("mode", syntaxMapping(my.workingFile.name));
        document.getElementById(my.workingFile.fileId).style.color = "";
    }

    my.getFile = function (fileId) {
        return getNode(fileId, fileTree);
    }

    my.getFileTree = function () {
        return fileTree;
    }

    my.delCurrent = function () {
        deleteNode(getNode(my.workingFile.fileId, fileTree));
        SocketAPI.deleteFile(my.workingFile.fileId);
        openAny();
    }

    my.del = function (fileId) {
        deleteNode(getNode(fileId, fileTree));
        SocketAPI.deleteFile(fileId);
        openAny(); //TODO only open new if working file was inside
    }

    function addChild(parent, child, childElement) {
        (parent.nodes || parent).push(child);
        (parent.el || rootTreeElement).appendChild(childElement);
        var plusEl = (parent.el || rootTreeElement).removeChild((parent.plusElement || rootPlusElement));
        (parent.el || rootTreeElement).appendChild(plusEl);
        child.parentElement = (parent.el || rootTreeElement);
    }

    my.mkdir = function (parentId, name, fileId) {
        fileId = fileId || getUniqueId();
        var file = {
            name: name,
            fileId: fileId,
            nodes: []
        }

        var li = document.createElement('li');
        li.innerHTML = '<label for="' + file.fileId + '">' + file.name + '</label><input checked type="checkbox" id="' + file.fileId + '" />';
        var ol = document.createElement('ol');
        li.appendChild(ol);
        var plusEl = document.createElement('li');
        if (file.fileId !== 'root') {
            plusEl.innerHTML = '<a data-fileid="new" data-parent="' + file.fileId + '" href="#" class="filelink plus">+</a><a data-fileid="delete" data-parent="' + file.fileId + '" href="#" class="filelink minus plus red">-</a>';
        } else {
            plusEl.innerHTML = '<a data-fileid="new" data-parent="' + file.fileId + '" href="#" class="filelink plus">+</a>';
        }
        ol.appendChild(plusEl);
        file.plusElement = plusEl;
        file.el = ol;
        file.realEl = li;


        if (parentId === 'root') {
            addChild(fileTree, file, li);
        } else {
            addChild(getNode(parentId, fileTree), file, li);
        }

        if (!fileId) {
            SocketAPI.addFile({
                parentId: parentId,
                name: file.name,
                fileId: file.fileId,
                type: 'folder'
            });
        }
        
        return fileId;
    }

    my.mkfile = function (parentId, name, fileId) {
        fileId = fileId || getUniqueId();
        var file = {
            name: name,
            fileId: fileId,
            content: ""
        }

        var li = document.createElement('li');
        li.className = "file";
        li.innerHTML = '<a data-fileid="' + file.fileId + '" href="#" id="' + file.fileId + '" class="filelink">' + file.name + '</a>';
        file.el = li;
        file.realEl = li;

        if (parentId === 'root') {
            addChild(fileTree, file, li);
        } else {
            addChild(getNode(parentId, fileTree), file, li);
        }

        if (!fileId) {
            SocketAPI.addFile({
                parentId: parentId,
                name: file.name,
                fileId: file.fileId,
                type: 'file'
            });
        }
        
        return fileId;
    }

    my.open = function (fileId) {
        my.workingFile = getNode(fileId, fileTree);
        document.getElementById("workingFile").innerHTML = my.workingFile.name;
        my.editor.getDoc().setValue(my.workingFile.content || "");
        my.editor.setOption("mode", syntaxMapping(my.workingFile.name));
        document.getElementById(fileId).style.color = "";
    }

    my.getTree = function () {
        return fileTree;
    }
    
    my.setTheme = function(themeName){
        document.querySelector('html').className = "theme-"+themeName;
        my.editor.setOption("theme", themeName);
    }

    function syntaxMapping(fileName) {
        var ext = fileName.split(".");
        ext = ext[ext.length - 1];
        var mapping = {
            "js": "javascript",
            "ts": "javascript",
            "css": "css",
            "sass": "css",
            "less": "css",
            "html": "htmlmixed",
            "xml": "xml"
        }
        return mapping[ext] || null;
    }


    my.softUpdateFile = function (fileId, change) {
        //TODO: Only update difference
        alert("not implemented softUpdateFile");
    }

    my.init = function () {
        var textArea = document.getElementById("editor");
        var options = {
            mode: "javascript",
            lineNumbers: true,
            theme: "material",
            tabSize: 4,
            indentUnit: 4,
            lineWrapping: true,
            styleActiveLine: true
        };
        my.editor = CodeMirror.fromTextArea(textArea, options);


        var computerActions = ["setValue", "replaceRange", "+move"];

        var lastCursor;
        my.editor.on('beforeChange', function (cm, change) {
            if (computerActions.indexOf(change.origin) !== -1) { //If user is not the one changing
                lastCursor = my.editor.getCursor();
            } else {
                lastCursor = undefined;
            }
        });

        my.editor.on('change', function (cm, change) {
            if (computerActions.indexOf(change.origin) === -1) { //Make sure change is from user input
                my.workingFile.content = cm.getValue();
                SocketAPI.changeFile(my.workingFile.fileId, my.workingFile.content); //TODO: Only send changes
            } else if (lastCursor) {
                my.editor.setCursor(lastCursor);
            }
        });

        renderFullTree(rootTreeElement, fileTree, 'root', null);

        openAny();
    }


    my.saveAsZip = function () {
        try {
            var isFileSaverSupported = !!new Blob;

            var zip = new JSZip();
            zipTree(zip, "tethysProject", fileTree);

            zip.generateAsync({
                type: "blob"
            }).then(function (content) {
                saveAs(content, "tethysProject.zip");
            });
        } catch (e) {
            Modal.open("general-alert",{msg:"Your browser does not support this!"});
        }
    }

    function zipTree(zip, path, nodeList) {
        for (var i = 0; i < nodeList.length; i++) { //Iterate children
            if (nodeList[i].isRemoved) continue;

            if (nodeList[i].nodes) {
                zipTree(zip, path + "/" + nodeList[i].name, nodeList[i].nodes);
            } else {
                zip.file(path + "/" + nodeList[i].name, nodeList[i].content);
            }
        }
        return undefined;
    }

    SocketAPI.onChangeFile = function (fileId, change) {
        if (fileId == my.workingFile.fileId) {
            my.workingFile.content = change;
            my.editor.getDoc().setValue(my.workingFile.content || ""); //TODO: Only send/receive changes
        } else {
            getNode(fileId, fileTree).content = change; //TODO: Only send/receive changes
            document.getElementById(fileId).style.color = "red";
        }
    }

    SocketAPI.onAddFile = function (parentId, name, fileId, type) {
        if (type === 'file') {
            my.mkfile(parentId, name, fileId);
        } else if (type === 'folder') {
            my.mkdir(parentId, name, fileId);
        }
    }

    SocketAPI.onDeleteFile = function (fileId) {
        deleteNode(getNode(fileId, fileTree));
        if (fileId == my.workingFile.fileId) {
            openAny();
        }
    }

    document.querySelector("#deploy").addEventListener('click', function (e) {
        HyperHost.handleTethys(fileTree);
    });

    
    my.openString= function(code, type){
        if (code){
            if (!type) type = "js"
            var fileId = my.mkfile("root", "code."+type);
            my.open(fileId);
            workingFile.content = code;
            my.editor.getDoc().setValue(code);
        }
    }


    return my;
}({}, SocketAPI, HyperHost));