/* Module to handle files */
var FileSystem = (function (my) {
    'use strict';
    var counter = 0;

    function getUniqueId() {
        return ++counter;
    }


    var fileTree = [
        {
            name: "Starter Folder",
            nodes: [{
                name: "index.html",
                id: "defaultHtml",
                content: "<html>\n\t<head>\n\n\t</head>\n\t<body>\n\n\t</body>\n</html>"
            }, {
                name: "script.js",
                id: "defaultScript",
                content: "var anAwesomeScript = \"here\";"
            }, {
                name: "style.css",
                id: "defaultCSS",
                content: "html {\n\n}"
            }]
        },
        {
            name: "start.js",
            id: "startScript",
            content: "var greeting = 'Welcome to TETHYS!'\n\n//Please direct bug reports and feature requests to https://github.com/RationalCoding/TETHYS/issues"
        }
    ];

    var rootTreeElement = document.getElementById('tree');
    var rootPlusElement;

    var editor;
    my.workingFile=null;

    function renderFullTree(treeElement, nodeList, parentId, parent) {
        while (treeElement.firstChild) { //Empty the tree
            treeElement.removeChild(treeElement.firstChild);
        }
        for (var i = 0; i < nodeList.length; i++) { //Iterate childre
            var file = nodeList[i];
            if (file.isRemoved) continue;
            file.id = file.id || getUniqueId();
            file.parentElement = file.parentElement || (parent && parent.el) || rootTreeElement;

            var li = document.createElement('li');

            if (file.nodes) {
                li.innerHTML = '<label for="' + file.id + '">' + file.name + '</label><input type="checkbox" id="' + file.id + '" />'

                var ol = document.createElement('ol');
                file.el = ol;
                renderFullTree(ol, file.nodes, file.id, file); //Recursive call
                li.appendChild(ol);
            } else {
                li.className = "file";
                li.innerHTML = '<a data-id="' + file.id + '" href="#" class="filelink">' + file.name + '</a></li>';
                file.el=li;
            }
            treeElement.appendChild(li);
        }
        var plusEl = document.createElement('li');
        plusEl.innerHTML = '<a data-id="new" data-parent="' + parentId + '" href="#" class="filelink plus">+</a></li>';
        if (parent){
            parent.plusElement = plusEl;
        }else{
            rootPlusElement = plusEl;
        }
        treeElement.appendChild(plusEl);
    }

    function getElement(id, nodeList) {
        for (var i = 0; i < nodeList.length; i++) { //Iterate children
            if (nodeList[i].isRemoved) continue;
            if (nodeList[i].id == id || (id==="*" && !nodeList[i].nodes)) {
                return nodeList[i];
            }
            if (nodeList[i].nodes) {
                var recursiveResult = getElement(id, nodeList[i].nodes);
                if (recursiveResult) {
                    return recursiveResult;
                }
            }
        }
        return false;
    }

    function addChild(parent, child, childElement) {
        (parent.nodes || parent).push(child);
        (parent.el || rootTreeElement).appendChild(childElement);
        var plusEl = (parent.el || rootTreeElement).removeChild((parent.plusElement || rootPlusElement));
        (parent.el || rootTreeElement).appendChild(plusEl);
        child.parentElement=(parent.el || rootTreeElement);
    }
    
    function deleteNode(child){
        child.parentElement.removeChild(child.el);
        child.isRemoved = true;
    }
    
    function openAny(){
        my.workingFile = getElement("*", fileTree);
        if (!my.workingFile){
            my.mkfile('root', 'start.js');
        }
        my.workingFile = getElement("*", fileTree);
        document.getElementById("workingFile").innerHTML = my.workingFile.name;
        editor.getDoc().setValue(my.workingFile.content || "");
    }
    
    my.delCurrent = function(id){
        deleteNode(getElement(my.workingFile.id, fileTree));
        openAny();
    }


    my.mkdir = function (parentID, name) {
        var file = {
            name: name,
            id: getUniqueId(),
            nodes: []
        }

        var li = document.createElement('li');
        li.innerHTML = '<label for="' + file.id + '">' + file.name + '</label><input type="checkbox" id="' + file.id + '" />';
        var ol = document.createElement('ol');
        li.appendChild(ol);
        var plusEl = document.createElement('li');
        plusEl.innerHTML = '<a data-id="new" data-parent="' + file.id + '" href="#" class="filelink plus">+</a></li>';
        ol.appendChild(plusEl);
        file.plusElement = plusEl;
        file.el = ol;


        if (parentID === 'root') {
            addChild(fileTree, file, li);
        } else {
            addChild(getElement(parentID, fileTree), file, li);
        }
    }

    my.mkfile = function (parentID, name) {
        var file = {
            name: name,
            id: getUniqueId(),
            content: ""
        }

        var li = document.createElement('li');
        li.className = "file";
        li.innerHTML = '<a data-id="' + file.id + '" href="#" class="filelink">' + file.name + '</a></li>';   
        file.el=li;

        if (parentID === 'root') {
            addChild(fileTree, file, li);
        } else {
            addChild(getElement(parentID, fileTree), file, li);
        }
    }

    my.open = function (fileID) {
        my.workingFile = getElement(fileID, fileTree);
        document.getElementById("workingFile").innerHTML = my.workingFile.name;
        editor.getDoc().setValue(my.workingFile.content || "");
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
        editor = CodeMirror.fromTextArea(textArea, options);

        editor.on('change', function (cm, change) {
            my.workingFile.content = cm.getValue();
            //StreamModule.sendChange(change) //TODO send this differencing to the stream
        });

        renderFullTree(rootTreeElement, fileTree, 'root', null);
    }

    return my;
}({}));