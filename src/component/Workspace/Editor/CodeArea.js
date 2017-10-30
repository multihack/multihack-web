import React from 'react';

import CodeMirror from 'codemirror';

// CodeMirror modes
require('codemirror/mode/javascript/javascript.js');
require('codemirror/mode/css/css.js');
require('codemirror/mode/xml/xml.js');
require('codemirror/mode/htmlmixed/htmlmixed.js');
require('codemirror/mode/php/php.js');
  
// CodeMirror addons
require('codemirror/addon/fold/xml-fold.js');
require('codemirror/addon/edit/closebrackets.js');
require('codemirror/addon/edit/matchbrackets.js');
require('codemirror/addon/edit/closetag.js');
require('codemirror/addon/edit/matchtags.js');
require('codemirror/addon/hint/show-hint.js');
require('codemirror/addon/hint/xml-hint.js');
require('codemirror/addon/hint/javascript-hint.js');
require('codemirror/addon/hint/css-hint.js');
require('codemirror/addon/hint/xml-hint.js');
require('codemirror/addon/hint/html-hint.js');

const cmOptions = {
    mode: {name: 'htmlmixed', globalVars: true},
    extraKeys: {'tab': 'autocomplete'},
    lineNumbers: true,
    theme: 'material',
    tabSize: 4,
    indentWithTabs: true,
    indentUnit: 4,
    lineWrapping: !!(window.innerWidth < 480), // No wrap on mobile
    styleActiveLine: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    matchTags: {bothTags: true},
    autoCloseTags: true,
    maxHighlightLength: 2000,
    crudeMeasuringFrom: 2000
};

class CodeArea extends React.Component {
    componentDidMount() {
        this.cm = CodeMirror(this.el, cmOptions);
    }
    
    componentWillUnmount() {
        
    }

    render() {
        return <div className="codearea" ref={el => this.el = el}/>;
    }
}
export default CodeArea;