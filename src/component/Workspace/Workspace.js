import React from 'react';

import Sidebar from './Sidebar/Sidebar';
import Editor from './Editor/Editor';
import ExtensionBar from './Extensionbar/Extensionbar';
import Splitter from './Splitter'

class Workspace extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            splitPosition: '200px'
        }

        this.handleSplitResize = this.handleSplitResize.bind(this);
    }

    render() {
        return (
            <div className="workspace">
                <Sidebar style={{ width: this.state.splitPosition }}/>
                <Splitter style={{ left: this.state.splitPosition }} onResize={this.handleSplitResize}/>
                <Editor style={{ left: this.state.splitPosition }}/>
                <ExtensionBar/>
            </div>
        );
    }

    handleSplitResize(x) {
        var newSplitPos = Math.max(Math.min(x, window.innerWidth - 200), 200) // todo: collapse when small

        this.setState({
            splitPosition: newSplitPos + 'px'
        })
    }
}
export default Workspace;