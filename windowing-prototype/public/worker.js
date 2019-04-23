const width = 1200;
const height = 800;
const numberOfRows = 16;

const lineHeight = height / numberOfRows;
const drift = () => Math.random() * lineHeight / 3;
const point = i => Math.abs(Math.sin(i / 10)) * lineHeight;
const range = i => [Math.max(point(i) - drift(), 0), Math.min(point(i) + drift(), lineHeight)];
const getData = offset => Array.from(new Array(width)).map((v, i) => range(i + offset));
const data1 = getData(0);
const data2 = getData(10);

onmessage = (evt) => {
  const { canvas, index } = evt.data;
  console.time(`worker ${index}`);
  const context = canvas.getContext('2d');
  const stepWidth = width / data1.length;

  context.clearRect(0, 0, width, height);
  context.font = '400px serif';
  context.fillStyle = index % 2 ? 'red' : 'blue';
  context.fillText(index, 30, 300);
  context.beginPath();

  for (let i = 0; i < numberOfRows; i++) {
    const data = Math.random() > 0.5 ? data1 : data2;
    data.forEach(([min, max], index) => {
      const x = index * stepWidth + 0.5; // https://diveintohtml5.info/canvas.html#pixel-madness
      const offset = i * lineHeight;
      context.moveTo(x, min + offset);
      context.lineTo(x, max + offset);
    });
  }

  context.stroke();
  console.timeEnd(`worker ${index}`);
};
