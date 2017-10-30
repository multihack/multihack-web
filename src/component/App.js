import React from 'react';

import Workspace from './Workspace/Workspace';
import Topbar from './Topbar/Topbar';
import Gutter from './Gutter/Gutter'

class App extends React.Component {
    render() {
        return (
            <div className="app">
                <Topbar/>
                <Workspace/>
                <Gutter/>
            </div>
        );
    }
}
export default App;