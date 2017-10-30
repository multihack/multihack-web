import React from 'react';

import CodeMirror from 'codemirror';
import 'codemirror/mode/javascript'

class CodeArea extends React.Component {
    componentDidMount() {
        this.cm = CodeMirror(this.el, {
            theme: 'material',
            mode: 'javascript'
        });
    }
    
    componentWillUnmount() {
        
    }

    render() {
        return <div className="codearea" ref={el => this.el = el}/>;
    }
}
export default CodeArea;