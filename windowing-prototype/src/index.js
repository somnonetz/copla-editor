import React from 'react';
import ReactDOM from 'react-dom';
import { FixedSizeList, shouldComponentUpdate } from 'react-window';

const width = 1200;
const height = 800;
const workers = [
  new Worker('./worker.js'),
  // new Worker('./worker.js'),
  // new Worker('./worker.js'),
  // new Worker('./worker.js'),
];

class Canvas extends React.Component {

  shouldComponentUpdate = shouldComponentUpdate.bind(this)

  // The canvas is drawn when the component is mounted.
  componentDidMount() {
    // if (!this.props.isScrolling) {
      this.drawCanvas();
    // }
  }

  componentDidUpdate() {
    // if (!this.props.isScrolling) {
      this.drawCanvas();
    // }
  }

  drawCanvas() {
    const { index } = this.props;
    console.log('drawCanvas', { index , didDraw: this.didDraw });

    if (this.didDraw) return;

    const canvas = this.myCanvas.transferControlToOffscreen();
    const worker = workers[index % workers.length];
    worker.postMessage({ canvas, index }, [canvas]);

    this.didDraw = true;
  }

  render() {
    const { style } = this.props;
    return (
      <canvas ref={canvas => this.myCanvas = canvas} width={width} height={height} style={style} />
    );
  }
}

const Example = () => (
  <FixedSizeList
    useIsScrolling
    className="list"
    direction="horizontal"
    height={height}
    itemCount={20}
    overscanCount={4}
    itemSize={width}
    width={width}
  >
    {Canvas}
  </FixedSizeList>
);

ReactDOM.render(<Example />, document.getElementById('root'));
