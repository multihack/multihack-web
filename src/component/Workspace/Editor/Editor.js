import React from 'react';

import Tabs from './Tabs';
import CodeArea from './CodeArea';

class Editor extends React.Component {
    render() {
        return (
            <div style={this.props.style} className="editor">
                <Tabs/>
                <CodeArea/>
            </div>
        );
    }
}
export default Editor;