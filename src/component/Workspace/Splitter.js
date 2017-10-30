import React from 'react';

class Splitter extends React.Component {
    constructor (props) {
        super(props);

        this.state = {
            isDragging: false
        }

        this.handleMouseDown = this.handleMouseDown.bind(this);
        window.addEventListener('mouseup', this.handleMouseUp.bind(this), false);
        window.addEventListener('mousemove', this.handleMouseMove.bind(this), false);
        window.addEventListener('resize', this.handleWindowResize.bind(this), false);
    }

    // uses an invisible bar to increase click size
    render() {
        return (
            <div style={this.props.style} className="splitter">
                <div
                onMouseDown={this.handleMouseDown}
                className="bar"/>
            </div>
        );
    }

    handleMouseDown() {
        this.isDragging = true
    }

    handleMouseUp() {
        this.isDragging = false
    }

    handleMouseMove(e) {
        if (!this.isDragging) return
        this.props.onResize(e.x)
    }

    handleWindowResize(e) {
        this.props.onResize(parseInt(this.props.style.left, 10))
    }
}
export default Splitter;