/* Custom modal plugin */
var Modal = (function (my, MicroMustache) {
    var modalElement = document.getElementById("modal");
    var blockingElement = document.getElementById("blocking-overlay");
    var state = 'closed';

    my.templates = {};
    my.onsubmit = {
        'closed': function () {}
    };

    //Opens a specific dialog
    my.open = function (templateName, data) {
            if (!data) data = {};
            if (!my.templates[templateName]) console.error("No template with name "+templateName);
            modalElement.innerHTML = MicroMustache.template(my.templates[templateName], data);
            modalElement.className = "modal text-center " + templateName;
            modalElement.style.display = 'block';
            blockingElement.style.display = 'block';
            state = templateName;
        }
        // Closes the dialog
    my.close = function () {
        modalElement.style.display = 'none';
        blockingElement.style.display = 'none';
        state = 'closed';
    }
    document.querySelector('#modal').addEventListener('click', function (event) {
        if (event.target.tagName.toLowerCase() === 'button') {
            var clicked = event.target.dataset.value;
            var input = Array.prototype.slice.call(document.querySelectorAll('.modal-input')).map(function (e) {
                return e.value
            });
            if (clicked === 'close') {
                Modal.close();
            }else{
                my.onsubmit[state](clicked, input);
            }    
        }
    });
    document.querySelector('body').addEventListener('keyup', function (event) {
        if (event.keyCode === 13 && state !== 'closed') {
            var input = Array.prototype.slice.call(document.querySelectorAll('.modal-input')).map(function (e) {
                return e.value
            });
            if (typeof my.onsubmit[state] === 'function') {
                my.onsubmit[state]('submit', input);
            } else {
                my.close();
            }
        }
    });
    return my;
}({}, MicroMustache));

/* Modal definitions */
Modal.templates['intro'] = `<h1>WELCOME TO TETHYS</h1>
    <h3>A P2P Social Programming Tool</h3>
    <p>First, choose a USERNAME.</p>
    <br>
    <input class="modal-input" type="text">
    <button data-value="submit" class="go-button">GO</button>
    <p>{{flash}}</p>
`;

Modal.templates['welcome'] = `<h1>WELCOME TO TETHYS</h1>
    <h3>Great!</h3>
    <p>You are now ready to use TETHYS.</p>
    <p>TETHYS uses social P2P technology to connect coders of all skill level, from around the world.</p>
    <br>
    <button data-value="submit" class="go-button">Tell Me More</button>
    <button data-value="close" class="no-button">I'll Figure It Out</button>`;

Modal.onsubmit['welcome'] = function (button, input) {
    Modal.open('welcome-2');
}

Modal.templates['welcome-2'] = `<h1>WELCOME TO TETHYS</h1>
    <h3>How To Collaborate</h3>
    <p>To join another coder, simply click their avatar in the "Online" panel (bottom left).</p>
    <p>You will be given the option to request to join their room. If they accept, you can join them on their project.</p>
    <br>
    <button data-value="submit" class="go-button">Tell Me More</button>
    <button data-value="close" class="no-button">I'll Figure It Out</button>`;

Modal.onsubmit['welcome-2'] = function (button, input) {
    Modal.open('welcome-3');
}

Modal.templates['welcome-3'] = `<h1>WELCOME TO TETHYS</h1>
    <h3>How To Build</h3>
    <p>TETHYS syncs the code of everyone in your room, letting you pair-program from anywhere.</p>
    <p>When you're all done, don't worry about saving! TETHYS will save all files automatically and you can keep working later, even offline!</p>
    <br>
    <button data-value="submit" class="go-button">Tell Me More</button>
    <button data-value="close" class="no-button">I'll Figure It Out</button>`;

Modal.onsubmit['welcome-3'] = function (button, input) {
    Modal.open('welcome-4');
}

Modal.templates['welcome-4'] = `<h1>WELCOME TO TETHYS</h1>
    <h3>How To Deploy</h3>
    <p>TETHYS was built with web developers in mind, so it has a virtual Node server built right in! Just click "Deploy" (top right) to instantly host the project from your browser.</p>
    <p>Everything will be served via an encrypted P2P channel. To learn how, check out <a href="https://github.com/RationalCoding/HyperHost" target="_blank">HyperHost</a>.</p>
    <br>
    <button data-value="submit" class="go-button">Tell Me More</button>
    <button data-value="close" class="no-button">I'll Figure It Out</button>`;

Modal.onsubmit['welcome-4'] = function (button, input) {
    Modal.open('welcome-5');
}

Modal.templates['welcome-5'] = `<h1>WELCOME TO TETHYS</h1>
    <h3>How To Connect</h3>
    <p>Sometimes code and a chatroom aren't enough to communicate. That's why TETHYS has live video chat built right in!</p>
    <p>Use the camera button at the top right to join your room's videochat.</p>
    <br>
    <button data-value="submit" class="go-button">Tell Me More</button>
    <button data-value="close" class="no-button">I'll Figure It Out</button>`;

Modal.onsubmit['welcome-5'] = function (button, input) {
    Modal.open('welcome-6');
}

Modal.templates['welcome-6'] = `<h1>WELCOME TO TETHYS</h1>
    <h3>How To Contribute</h3>
    <p>TETHYS is 100% open source! It gets better every day thanks to the help of developers like you. Check out the source on <a href="https://github.com/RationalCoding/TETHYS">Github</a>.</p>
    <p>PRs and Issues are always welcome, and an Atom extension is on it's way!</p>
    <br>
    <button data-value="submit" class="go-button">Tell Me More</button>
    <button data-value="close" class="no-button">I'll Figure It Out</button>`;

Modal.onsubmit['welcome-6'] = function (button, input) {
    Modal.open('welcome-7');
}

Modal.templates['welcome-7'] = `<h1>WELCOME TO TETHYS</h1>
    <h3>Build Something Awesome</h3>
    <p>That's it! Go out there and build something awesome!
    <br><br>
    <button data-value="submit" class="go-button">Start My Journey</button>`;

Modal.onsubmit['welcome-7'] = function (button, input) {
    Modal.close();
}


Modal.templates["requestInvite"] = `<h1>Request to Join {{name}}'s Room?</h1>
<p>You will get a notification if they accept.</p>
    <button data-value="submit" class="go-button">Request Invite</button>
    <button data-value="close" class="no-button">Nevermind</button>`;

Modal.templates["createFile"] = `<h1>Create New...</h1>
    <input class="modal-input" placeholder="Name" type="text">
    <br><br>
    <button data-value="file" class="go-button">File</button>
    <button data-value="folder" class="go-button">Folder</button>
<button data-value="close" class="no-button">Cancel</button>
<p>{{flash}}</p>`;


Modal.templates["confirmDelete"] = `<h1>Are you sure you want to delete \"{{name}}\"?</h1>
<p>It will be deleted for everyone in the room!</p>
<button data-value="yes" class="go-button">Delete</button>
<button data-value="no" class="no-button">Cancel</button>
`
