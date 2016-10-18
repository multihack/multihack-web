/* Module to handle files */
var FileSystem = (function (my, SocketAPI, HyperHost) {
    'use strict';

    function getUniqueId() {
        return Math.random().toString();
    }

    function setLocalStorage() {
        try {
            if (localStorage) {
                localStorage.setItem('tethysTree', JSON.stringify(fileTree.map(function(e){
                    return {content: e.content, name:e.name, isRemoved:e.isRemoved, fileId:e.fileId};
                })));
            }
        }catch(err){
            try { 
                localStorage.setItem('tethysTree', "");
            }catch(err){
                //Catch private mode
            }
        }
    }

    function getLocalStorage() {
        if (localStorage) {
            var store = localStorage.getItem('tethysTree');
            if (!!store){
                fileTree = JSON.parse(store);
                my.init();
            }       
        }
    }

    
    my.saveLocal = function(){
        setLocalStorage();
    }

    var fileTree = [
        {
            name: "index.html",
            fileId: "welcome",
            content: `<html>
<head>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to MULTIHACK!</h1>

    <ul>
        <li>Collaborate in real-time.</li>
    	<li>Syntax highlighting for every web language.</li>
    	<li>Voice chat with up to 10 people! (WebRTC only)</li>
    	<li>Instantly deploy your website via HyperHost (WebRTC only)</li>
    	<li>Save your project for working offline.</li>
    	<li>MULTIHACK is the ONLY multi-file, multi-user code editor on the web.</li>
        
        <!-- Try deploying this file! -->
    </ul>
</body> 
    
</html>`
        },
        {
            name: "style.css",
            fileId: "welcome2",
            content: `body {
    background: lightgray;
    font-family: Arial;
}

h1 {
    color: darkgreen;
}`
        }
    ];

    SocketAPI.onAllCode = function (newFileTree) {
        fileTree = newFileTree;
        setLocalStorage(); //Save to localstorage on joining a new room
        my.init();
    }

    var rootTreeElement = document.getElementById('tree');
    var rootPlusElement;

    my.editor = null;
    my.workingFile = null;
    var editorMutexLock = false;

    /* Renders the tree's DOM entirely (expensive) */
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

    /* Gets a node from the tree */
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

    /* Deletes a node from the tree */
    function deleteNode(child) {
        child.parentElement.removeChild(child.realEl);
        child.isRemoved = true;
        setLocalStorage();
    }

    /* Opens any file (first in tree traversal) */
    function openAny() {
        my.workingFile = getNode("*", fileTree);
        if (!my.workingFile) {
            my.mkfile('root', 'index.html');
        }
        my.workingFile = getNode("*", fileTree);
        document.getElementById("workingFile").innerHTML = my.workingFile.name;
        setWorkspaceContent(my.workingFile);
        document.getElementById(my.workingFile.fileId).style.color = "";
    }

    function setWorkspaceContent(fileNode) {
        var ext = fileNode.name.split(".");
        ext = ext[ext.length - 1];

        if (["png", "jpg", "jpeg", , "jpeg2000", "tif", "tiff", "gif", "bmp"].indexOf(ext) !== -1) {
            document.querySelector(".image-wrapper").style.display = "";
            document.querySelector(".image-wrapper img").src = fileNode.content;
        } else {
            document.querySelector(".image-wrapper").style.display = "none";
            editorMutexLock=true;
            my.editor.getDoc().setValue(fileNode.content || "");
            my.editor.setOption("mode", syntaxMapping(fileNode.name));
            editorMutexLock=false;
        }
    }
    
    function applyWorkspaceChange(change, full){
        editorMutexLock=true;
        my.editor.replaceRange(change.text, change.from, change.to);
        my.workingFile.content = full;
        editorMutexLock=false;
    }

    /* Gets a file with the specified id */
    my.getFile = function (fileId) {
        return getNode(fileId, fileTree);
    }

    /* Gets the file tree */
    my.getFileTree = function () {
        return fileTree;
    }

    /* Deletes the working file */
    my.delCurrent = function () {
        my.del(my.workingFile.fileId);
    }

    /* Deletes a file */
    my.del = function (fileId) {
        deleteNode(getNode(fileId, fileTree));
        SocketAPI.deleteFile(fileId);
        openAny(); //TODO only open new if working file was inside
    }

    /* Adds a child to another node in the tree's DOM */
    function addChild(parent, child, childElement) {
        (parent.nodes || parent).push(child);
        (parent.el || rootTreeElement).appendChild(childElement);
        var plusEl = (parent.el || rootTreeElement).removeChild((parent.plusElement || rootPlusElement));
        (parent.el || rootTreeElement).appendChild(plusEl);
        child.parentElement = (parent.el || rootTreeElement);
    }

    /* Makes a new directory in the a specific folder (fileId is optional) */
    my.mkdir = function (parentId, name, originalFileId) {
        var fileId = originalFileId || getUniqueId();
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

        if (!originalFileId) {
            SocketAPI.addFile({
                parentId: parentId,
                name: file.name,
                fileId: file.fileId,
                type: 'folder'
            });
        }
        setLocalStorage();

        return fileId;
    }

    /* Makes a new file in a specific folder (fileId is optional) */
    my.mkfile = function (parentId, name, originalFileId) {
        var fileId = originalFileId || getUniqueId();
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

        if (!originalFileId) {
            SocketAPI.addFile({
                parentId: parentId,
                name: file.name,
                fileId: file.fileId,
                type: 'file'
            });
        }
        setLocalStorage();

        return fileId;
    }

    /* Opens a file in the editor */
    my.open = function (fileId) {
        my.workingFile = getNode(fileId, fileTree);
        document.getElementById("workingFile").innerHTML = my.workingFile.name;
        setWorkspaceContent(my.workingFile);
        document.getElementById(fileId).style.color = "";
    }

    /* Sets the theme ('material', 'atom') */
    var currentTheme;
    my.setTheme = function (themeName) {
        document.querySelector('html').className = "theme-" + themeName;
        my.editor.setOption("theme", themeName);
        currentTheme = themeName;
    }

    /* Maps extensions to CodeMirror modes */
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
            "xml": "xml",
            "php": "application/x-httpd-php"
        }
        return mapping[ext] || null;
    }


    /* Initialize the editor and tree */
    my.init = function (firstTime) {
        if (firstTime) getLocalStorage();
        var textArea = document.getElementById("editor");
        var options = {
            mode: "javascript",
            lineNumbers: true,
            theme: currentTheme || "material",
            tabSize: 4,
            indentUnit: 4,
            lineWrapping: true,
            styleActiveLine: true
        };
        my.editor = CodeMirror.fromTextArea(textArea, options);


        my.editor.on('change', function (cm, change) {
            if (editorMutexLock) return;
            my.workingFile.content = cm.getValue();
            SocketAPI.changeFile(my.workingFile.fileId, change, my.workingFile.content);
        });

        renderFullTree(rootTreeElement, fileTree, 'root', null);

        openAny();
        
        setInterval(function(){
            setLocalStorage();
        }, 5000);
    }

    /* Creates a zip from the tree and attempts to download it */
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
            Modal.open("general-alert", {
                msg: "Your browser does not support this!"
            });
        }
    }

    /* Creates a file from an HTML5 File object */
    my.loadFile = function (fileObject, parentId) {
        var ext = fileObject.name.split(".");
        ext = ext[ext.length - 1];
        var isImage = ["png", "jpg", "jpeg", , "jpeg2000", "tif", "tiff", "gif", "bmp"].indexOf(ext) !== -1;

        var reader = new FileReader();
        reader.addEventListener('loadend', function () {
            var fileId = my.mkfile(parentId, fileObject.name);
            getNode(fileId, fileTree).content = reader.result;
            my.open(fileId);
            SocketAPI.changeFile(fileId, null, reader.result); //Signal new content
            setLocalStorage();
        });

        if (isImage) {
            reader.readAsDataURL(fileObject);
        } else {
            reader.readAsText(fileObject);
        }
    }

    /* Create a .zip file from the tree */
    function zipTree(zip, path, nodeList) {
        for (var i = 0; i < nodeList.length; i++) { //Iterate children
            if (nodeList[i].isRemoved) continue;

            if (nodeList[i].nodes) {
                zipTree(zip, path + "/" + nodeList[i].name, nodeList[i].nodes);
            } else {
                zip.file(path + "/" + nodeList[i].name, nodeList[i].content);
            }
        }
    }

    /* Fires when a file is changed by a peer */
    SocketAPI.onChangeFile = function (fileId, change, full) {
        if (fileId == my.workingFile.fileId) {
            applyWorkspaceChange(change, full);
        } else {
            getNode(fileId, fileTree).content = full;
            document.getElementById(fileId).style.color = "red";
        }
    }

    /* Fires when a file is added by a peer */
    SocketAPI.onAddFile = function (parentId, name, fileId, type) {
        if (type === 'file') {
            my.mkfile(parentId, name, fileId);
        } else if (type === 'folder') {
            my.mkdir(parentId, name, fileId);
        }
    }

    /* Fires when a file is deleted by a peer */
    SocketAPI.onDeleteFile = function (fileId) {
        deleteNode(getNode(fileId, fileTree));
        if (fileId == my.workingFile.fileId) {
            openAny();
        }
    }

    /* Deploys the tree to HyperHost */
    document.querySelector("#deploy").addEventListener('click', function (e) {
        HyperHost.handleTethys(fileTree);
    });

    /* Creates a file from a string */
    my.openString = function (code, type) {
        if (code) {
            if (!type) type = "js"
            var fileId = my.mkfile("root", "code." + type);
            getNode(fileId, fileTree).content = code;
            my.open(fileId);
        }
    }


    return my;
}({}, SocketAPI, HyperHost));