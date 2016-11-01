var Config = (function(){
    "use strict";
        
    /* -------- DO NOT BEAUTIFY ---------*/
    var initialContent = [
        {
            name: "index.html",
            fileId: "welcome",
            content: `<html>
<head>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Welcome to MultiHack!</h1>

    <ul>
        <li>Collaborate in real-time.</li>
    	<li>Syntax highlighting for every web language.</li>
    	<li>Voice chat with up to 10 people! (WebRTC only)</li>
    	<li>Instantly deploy your website via HyperHost (WebRTC only)</li>
        <li>Import files, ZIP archives and GitHub repos.</li>
    	<li>Save your project for working offline.</li>
    	<li>MultiHack is the ONLY multi-file, multi-user code editor on the web.</li>
        
        <!-- Try deploying this file! -->

        <a href="http://github.com/RationalCoding/multihack" target="_blank">Source Code</a>
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
        },
        {
            name: "script.js",
            fileId: "welcome3",
            content: `var a = 1;
for (var i=0; i < 10; i++){
    //A meaningless loop!
}`
        }
    ];
    /*-------------------------------*/
    
    return {
        FileSystem : {
            initialContent : initialContent
        },
        UI : {
            
        },
        Sockets : {
            HOSTNAME : "/", //Points at a Multihack server
            PeerJS : {
                host: "/", //Points at a slightly modified PeerJS server 
                port: 443,
                path: "/server",
                secure: true
            }
        },
    }
}());