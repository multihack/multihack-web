/* Module to handle files */
var FileSystem = (function (Sockets, Microstache, JSZip, JSZipUtils, Config) {
    'use strict';

    var my = {

        /* Initializes the editor and tree */
        init: function (isFirstInitialization) {
            if (isFirstInitialization) {
                getLocalStorage();
            }

            var textArea = document.getElementById("editor"),
                options = {
                    mode: "javascript",
                    lineNumbers: true,
                    theme: currentTheme || "atom",
                    tabSize: 4,
                    indentUnit: 4,
                    lineWrapping: !!(window.innerWidth < 480),
                    styleActiveLine: true
                };
            my.editor = CodeMirror.fromTextArea(textArea, options);


            my.editor.on('change', function (cm, change) {
                if (editorMutexLock) {
                    return;
                }
                my.workingFile.content = cm.getValue();
                Sockets.changeFile(my.workingFile.fileId, change, my.workingFile.content);
            });

            renderFullTree(rootTreeElement, fileTree, 'root', null);

            openAny();
        },


        /* Saves the file tree to localstorage */
        saveLocal: function () {
            setLocalStorage();
        },


        /* The CodeMirror instance */
        editor: null,

        /* The currently open file */
        workingFile: null,

        /* Gets a file with the specified id */
        getFile: function (fileId) {
            return getNode(fileId, fileTree);
        },


        /* Gets the file tree */
        getFileTree: function () {
            return fileTree;
        },


        /* Deletes the working file */
        delCurrent: function () {
            my.delFile(my.workingFile.fileId);
        },


        /* Deletes a file */
        delFile: function (fileId) {
            deleteNode(getNode(fileId, fileTree));
            Sockets.deleteFile(fileId);
            openAny(); //TODO only open new if working file was inside
        },


        /* Makes a new directory in the a specific folder (fileId is optional) */
        mkdir: function (parentId, name, originalFileId) {
            var fileId = originalFileId || getUniqueId(),
                file = {
                    name: name,
                    fileId: fileId,
                    nodes: []
                }

            var li = document.createElement('li');
            li.innerHTML = Microstache.template(templates.labelElement, {
                fileId : file.fileId,
                name: file.name
            });
            var ol = document.createElement('ol');
            li.appendChild(ol);
            var plusEl = document.createElement('li');
            if (file.fileId !== 'root') {
                plusEl.innerHTML = Microstache.template(templates.plusMinus, {
                    fileId: file.fileId, 
                    name: file.name
                });
            } else {
                plusEl.innerHTML = Microstache.template(templates.plusElement, {
                    fileId: file.fileId, 
                    name: file.name
                });
            }
            ol.insertBefore(plusEl, ol.firstChild);
            file.plusElement = plusEl;
            file.el = ol;
            file.realEl = li;


            if (parentId === 'root') {
                addChild(fileTree, file, li);
            } else {
                addChild(getNode(parentId, fileTree), file, li);
            }

            if (!originalFileId) {
                Sockets.addFile({
                    parentId: parentId,
                    name: file.name,
                    fileId: file.fileId,
                    type: 'folder'
                });
            }

            return fileId;
        },

        
        /* 
        Makes a new file in a specific folder 
        (originalFileId is an optional pref-defined id to assign to the new file) 
        */
        mkfile : function (parentId, name, originalFileId) {
            var fileId = originalFileId || getUniqueId();
            var file = {
                name: name,
                fileId: fileId,
                content: ""
            }

            var li = document.createElement('li');
            li.className = "file";
            li.innerHTML = Microstache.template(templates.fileElement, {
                    fileId: file.fileId, 
                    name: file.name
                });
            file.el = li;
            file.realEl = li;

            if (parentId === 'root') {
                addChild(fileTree, file, li);
            } else {
                addChild(getNode(parentId, fileTree), file, li);
            }

            if (!originalFileId) {
                Sockets.addFile({
                    parentId: parentId,
                    name: file.name,
                    fileId: file.fileId,
                    type: 'file'
                });
            }

            return fileId;
        },
        
        
        /* Fetches a Github Repo and imports it as a folder */
        fetchRepo : function (parentId, baseUrl, branch) {
            var zipUrl = "https://cors-anywhere.herokuapp.com/" + baseUrl + "/zipball/" + branch;
            JSZipUtils.getBinaryContent(zipUrl, function (err, data) {
                if (err) {
                    Modal.open("general-alert", {
                        msg: "Failed to get repo: <br>" + err.message
                    });
                    return;
                }

                unzipTree(data, parentId, branch);
            });
        },
        
        
        
        /* Creates a file from a string */
        openString : function (content, type) {
            if (content) {
                if (!type) {
                    type = "js";
                }
                var fileId = my.mkfile("root", "code." + type);
                getNode(fileId, fileTree).content = content;
                Sockets.changeFile(fileId, null, content);
                my.open(fileId);
            }
        },
        
        
        
        /* Creates a file from an HTML5 File object */
        loadFile : function (fileObject, parentId) {
            var ext = fileObject.name.split(".");
            ext = ext[ext.length - 1];
            var isImage = IMAGE_EXTENSIONS.indexOf(ext) !== -1;

            if (ext === "zip") {
                unzipTree(fileObject, parentId, fileObject.name.slice(0, -4));
                return;
            }

            var reader = new FileReader();
            reader.addEventListener('loadend', function () {
                var fileId = my.mkfile(parentId, fileObject.name);
                getNode(fileId, fileTree).content = reader.result;
                my.open(fileId);
                Sockets.changeFile(fileId, null, reader.result); //Signal new content
            });

            if (isImage) {
                reader.readAsDataURL(fileObject);
            } else {
                reader.readAsText(fileObject);
            }
        },
    }

    /* Gets a unique file identifier */
    function getUniqueId() {
        return Math.random().toString()+Math.random().toString(); 
    }
    
    /* Stores file tree to local storage */
    function setLocalStorage() {
        try {
            localStorage.setItem('fileTree', JSON.stringify(fileTree));
            Modal.open("save-confirm");
        } catch (err) {
            Modal.open("save-fail");
        }
    }

    /* Retrieves file tree from local storage */
    function getLocalStorage() {
        try {
            if (localStorage) {
                var store = localStorage.getItem('fileTree');
                if (!!store) {
                    fileTree = JSON.parse(store);
                    my.init();
                }
            }
        } catch (err) {
            //Localstorage error
            try {
                localStorage.setItem('fileTree', ""); //Purge bad data
            } catch (err) {

            }
        }
    }


    var fileTree = Config.initialContent;

    Sockets.on('codeserve', function (newFileTree) {
        fileTree = newFileTree;
        my.init();
    });
    
    Sockets.on('codeget', function(userId){
        Sockets.provideAllCode(userId, fileTree);
    });

    var rootTreeElement = document.getElementById('tree');
    var rootPlusElement;

    var editorMutexLock = false;


    var IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", , "jpeg2000", "tif", "tiff", "gif", "bmp", "ico"];

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
                li.innerHTML = Microstache.template(templates.labelElement, {
                    fileId: file.fileId,
                    name: file.name
                });

                var ol = document.createElement('ol');
                file.el = ol;
                file.realEl = li;
                renderFullTree(ol, file.nodes, file.fileId, file); //Recursive call
                li.appendChild(ol);
            } else {
                li.className = "file";
                li.innerHTML = Microstache.template(templates.fileElement, {
                    fileId : file.fileId,
                    name : file.name
                });
                file.el = li;
                file.realEl = li;
            }
            treeElement.appendChild(li);
        }
        var plusEl = document.createElement('li');

        if (parentId !== 'root') {
            plusEl.innerHTML = plusEl.innerHTML = Microstache.template(templates.plusMinus, {
                fileId : parentId,
                name: file.name
            });
        } else {
            plusEl.innerHTML = Microstache.template(templates.plusElement, {
                fileId : parentId
            });
        }
        if (parent) {
            parent.plusElement = plusEl;
        } else {
            rootPlusElement = plusEl;
        }
        treeElement.insertBefore(plusEl, treeElement.firstChild);
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
        //TODO: Garbage collection
    }
    
    
    /* Fires when a file is changed by a peer */
    Sockets.on('remotechange', function (fileId, change, full) {
        if (fileId == my.workingFile.fileId) {
            applyWorkspaceChange(change, full);
        } else {
            getNode(fileId, fileTree).content = full;
            document.getElementById(fileId).style.color = "red";
        }
    });

    /* Fires when a file is added by a peer */
    Sockets.on('remoteadd', function (parentId, name, fileId, type) {
        if (type === 'file') {
            my.mkfile(parentId, name, fileId);
        } else if (type === 'folder') {
            my.mkdir(parentId, name, fileId);
        }
    });

    /* Fires when a file is deleted by a peer */
    Sockets.on('remotedelete', function (fileId) {
        deleteNode(getNode(fileId, fileTree));
        if (fileId == my.workingFile.fileId) {
            openAny();
        }
    });

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

    /* Sets the contents of the CodeMirror instance */
    function setWorkspaceContent(fileNode) {
        var ext = fileNode.name.split(".");
        ext = ext[ext.length - 1];

        if (IMAGE_EXTENSIONS.indexOf(ext) !== -1) {
            document.querySelector(".image-wrapper").style.display = "";
            document.querySelector(".image-wrapper > img").src = fileNode.content;
        } else {
            document.querySelector(".image-wrapper").style.display = "none";
            editorMutexLock = true;
            my.editor.getDoc().setValue(fileNode.content || "");
            my.editor.setOption("mode", syntaxMapping(fileNode.name));
            editorMutexLock = false;
        }
        my.editor.clearHistory()
    }

    /* Applys a remote change to the CodeMirror instanse and working file */
    function applyWorkspaceChange(change, full) {
        editorMutexLock = true;
        my.editor.replaceRange(change.text, change.from, change.to);
        my.workingFile.content = full;
        editorMutexLock = false;
    }


    /* Adds a child to another node in the tree's DOM */
    function addChild(parent, child, childElement) {
        (parent.nodes || parent).push(child);
        (parent.el || rootTreeElement).appendChild(childElement);
        child.parentElement = (parent.el || rootTreeElement);
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


    /* Creates a zip from the tree and attempts to download it */
    my.saveAsZip = function () {
        try {
            var isFileSaverSupported = !!new Blob;

            var zip = new JSZip();
            zipTree(zip, "myProject", fileTree);

            zip.generateAsync({
                type: "blob"
            }).then(function (content) {
                saveAs(content, "myProject.zip");
            });
        } catch (e) {
            Modal.open("general-alert", {
                msg: "Your browser does not support this!"
            });
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

    /* Create a subTree from zip file data */
    function unzipTree(fileObject, rootId, name) {
        JSZip.loadAsync(fileObject).then(function (zip) {
            //Make the root directory

            // Ignore the root folder
            var pathToId = {}; //Maps paths in the zip archive to their fileIds
            var firstFile = true;

            zip.forEach(function (relativePath, zipEntry) {
                if (firstFile){ //Ignore the base folder as well as the root
                    firstFile=false;
                    return;
                }
                if (zipEntry.dir) {
                    relativePath = relativePath.slice(0, -1);
                }
                var parentPath;
                parentPath = relativePath.split("/");
                var name = parentPath[parentPath.length - 1];

                if (relativePath.indexOf("__MACOSX") !== -1 || name === ".DS_Store") return; //Ignore mac stuff


                parentPath.splice(-1, 1);
                parentPath = parentPath.join("/");
                var parentId = pathToId[parentPath] || rootId;

                if (zipEntry.dir) {
                    pathToId[relativePath] = my.mkdir(parentId, name);
                } else {
                    pathToId[relativePath] = my.mkfile(parentId, name);
                    var ext = zipEntry.name.split(".");
                    ext = ext[ext.length - 1];
                    var isImage = IMAGE_EXTENSIONS.indexOf(ext) !== -1;

                    var type;
                    if (isImage) {
                        type = "base64";
                    } else {
                        type = "string";
                    }

                    zipEntry.async(type).then(function success(content) {
                        if (type === "base64") content = 'data:text/javascript;base64,' + content;
                        getNode(pathToId[relativePath], fileTree).content = content;
                        Sockets.changeFile(pathToId[relativePath], null, content); //Signal new content
                    });
                }
            });

        });
    }
    
    
    var templates = {
        fileElement : '<a data-fileid="{{fileId}}" href="#" class="filelink" id="{{fileId}}">{{name}}</a>',
        plusElement : '<a data-fileid="new" data-parent="{{ fileId }}" href="#" class="filelink plus">+</a>',
        minusElement: '<a data-fileid="delete" data-name="{{ name }}" data-parent="{{ fileId }}" href="#" class="filelink minus plus red">-</a>',
        labelElement: '<label for="{{fileId}}">{{name}}</label><input type="checkbox" id="{{fileId}}" />',
        plusMinus : '<a data-fileid="new" data-parent="{{ fileId }}" href="#" class="filelink plus">+</a><a data-fileid="delete" data-name="{{ name }}" data-parent="{{ fileId }}" href="#" class="filelink minus plus red">-</a>'
    }

    return my;
}(Sockets, Microstache, JSZip, JSZipUtils, Config.FileSystem));