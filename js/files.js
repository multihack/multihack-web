/* Module to handle files */
var FileSystem = (function (my, Modal, SocketAPI) {
    'use strict';

    function getUniqueId() {
        return Math.random().toString();
    }


    var fileTree = [
        {
            name: "Starter Folder",
            nodes: [{
                name: "index.html",
                fileId: "defaultHtml",
                content: "<html>\n\t<head>\n\n\t</head>\n\t<body>\n\n\t</body>\n</html>"
            }, {
                name: "script.js",
                fileId: "defaultScript",
                content: "var anAwesomeScript = \"here\";"
            }, {
                name: "style.css",
                fileId: "defaultCSS",
                content: "html {\n\n}"
            }]
        },
        {
            name: "start.js",
            fileId: "startScript",
            content: "var greeting = 'Welcome to TETHYS!'\n\n//Please direct bug reports and feature requests to https://github.com/RationalCoding/TETHYS/issues"
        }
    ];
    
    SocketAPI.onAllCode = function(newFileTree){
        fileTree=newFileTree;
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
                renderFullTree(ol, file.nodes, file.fileId, file); //Recursive call
                li.appendChild(ol);
            } else {
                li.className = "file";
                li.innerHTML = '<a data-fileid="' + file.fileId + '" href="#" class="filelink" id="'+file.fileId+'">' + file.name + '</a></li>';
                file.el = li;
            }
            treeElement.appendChild(li);
        }
        var plusEl = document.createElement('li');
        plusEl.innerHTML = '<a data-fileid="new" data-parent="' + parentId + '" href="#" class="filelink plus">+</a></li>';
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
        child.parentElement.removeChild(child.el);
        child.isRemoved = true;
    }

    function openAny() {
        my.workingFile = getNode("*", fileTree);
        if (!my.workingFile) {
            my.mkfile('root', 'start.js');
        }
        my.workingFile = getNode("*", fileTree);
        document.getElementById("workingFile").innerHTML = my.workingFile.name;
        my.editor.getDoc().setValue(my.workingFile.content || "");
        document.getElementById(my.workingFile.fileId).style.color = "";
    }
    
    my.getFile = function(fileId){
        return getNode(fileId, fileTree);
    }
    
    my.getFileTree = function(){
        return fileTree;
    }

    my.delCurrent = function () {
        deleteNode(getNode(my.workingFile.fileId, fileTree));
        SocketAPI.deleteFile(my.workingFile.fileId);
        openAny();
    }
    
    function addChild(parent, child, childElement) {
        (parent.nodes || parent).push(child);
        (parent.el || rootTreeElement).appendChild(childElement);
        var plusEl = (parent.el || rootTreeElement).removeChild((parent.plusElement || rootPlusElement));
        (parent.el || rootTreeElement).appendChild(plusEl);
        child.parentElement = (parent.el || rootTreeElement);
    }

    my.mkdir = function (parentId, name, fileId) {
        var file = {
            name: name,
            fileId: fileId || getUniqueId(),
            nodes: []
        }

        var li = document.createElement('li');
        li.innerHTML = '<label for="' + file.fileId + '">' + file.name + '</label><input checked type="checkbox" id="' + file.fileId + '" />';
        var ol = document.createElement('ol');
        li.appendChild(ol);
        var plusEl = document.createElement('li');
        plusEl.innerHTML = '<a data-fileid="new" data-parent="' + file.fileId + '" href="#" class="filelink plus">+</a></li>';
        ol.appendChild(plusEl);
        file.plusElement = plusEl;
        file.el = ol;


        if (parentId === 'root') {
            addChild(fileTree, file, li);
        } else {
            addChild(getNode(parentId, fileTree), file, li);
        }
        
        if (!fileId){
            SocketAPI.addFile({parentId:parentId, name:file.name, fileId:file.fileId, type:'folder'});
        }
    }

    my.mkfile = function (parentId, name, fileId) {
        var file = {
            name: name,
            fileId: fileId || getUniqueId(),
            content: ""
        }

        var li = document.createElement('li');
        li.className = "file";
        li.innerHTML = '<a data-fileid="' + file.fileId + '" href="#" id="'+file.fileId+'" class="filelink">' + file.name + '</a></li>';
        file.el = li;

        if (parentId === 'root') {
            addChild(fileTree, file, li);
        } else {
            addChild(getNode(parentId, fileTree), file, li);
        }
        
        if (!fileId){
            SocketAPI.addFile({parentId:parentId, name:file.name, fileId:file.fileId, type:'file'});
        }
    }

    my.open = function (fileId) {
        my.workingFile = getNode(fileId, fileTree);
        document.getElementById("workingFile").innerHTML = my.workingFile.name;
        my.editor.getDoc().setValue(my.workingFile.content || "");
        document.getElementById(fileId).style.color = "";
    }

    my.getTree = function () {
        return fileTree;
    }

    // Set the content of a file to some string
    function hardUpdateFile (fileId, content) {
        function a(file) { //Pass through function to maintain reference
            file.content = content;

            if (file.fileId == my.workingFile.fileId) {
                my.editor.getDoc().setValue(my.workingFile.content || "");
            }
        }(getNode(fileId, fileTree));
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
        my.editor.on('beforeChange', function(cm, change){ 
            if (computerActions.indexOf(change.origin) !== -1){ //If user is not the one changing
                lastCursor=my.editor.getCursor();
            }else{
                lastCursor=undefined;
            }
        });

        my.editor.on('change', function (cm, change) {
            if (computerActions.indexOf(change.origin) === -1){ //Make sure change is from user input
                my.workingFile.content = cm.getValue();
                SocketAPI.changeFile(my.workingFile.fileId, my.workingFile.content); //TODO: Only send changes
            }else if (lastCursor){
                my.editor.setCursor(lastCursor);
            }
        });

        renderFullTree(rootTreeElement, fileTree, 'root', null);
        
        openAny();
    }
    
    SocketAPI.onChangeFile = function(fileId, change){
        if (fileId == my.workingFile.fileId){
            my.workingFile.content = change;
            my.editor.getDoc().setValue(my.workingFile.content || ""); //TODO: Only send/receive changes
        }else{
            getNode(fileId, fileTree).content=change;//TODO: Only send/receive changes
            document.getElementById(fileId).style.color = "red";
        }
    }
    
    SocketAPI.onAddFile = function(parentId, name, fileId, type){
        if (type === 'file'){
            my.mkfile(parentId, name, fileId);
        }else if (type === 'folder'){
            my.mkdir(parentId, name, fileId);
        }
    }
    
    SocketAPI.onDeleteFile = function(fileId){
        deleteNode(getNode(fileId, fileTree));
        if (fileId == my.workingFile.fileId){
            openAny();
        }
    }
    

    return my;
}({}, Modal, SocketAPI));