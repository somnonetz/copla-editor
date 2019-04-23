const typeMap = {
  H: 'Hypopnoe',
  Z: 'Zentral Apnoe',
  G: 'Gemischte Apnoe',
  O: 'Obstruktive Apnoe',
};

// From https://stackoverflow.com/a/2117523
const uuidv4 = () => ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,
  c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)); // eslint-disable-line no-mixed-operators

export default class Band {
  constructor({ graph, id, start, end, type = '', note = '', isEditing = false, isEditable = true, silent = false }) {
    if (!graph) throw new Error('no graph given');

    this.graph = graph;
    this.id = id || uuidv4();
    this.start = start;
    this.end = end;
    this.type = type;
    this.note = note;
    this.isEditing = isEditing;
    this.isEditable = isEditable;

    if (this.graph.emit && !silent) {
      this.graph.emit('bandAdded', this);
    }
  }

  onSelect(position) {
    if (this.isDragging) return;

    if (position >= this.start && position <= this.end) {
      this.startEditing();
    }
    else {
      this.stopEditing();
    }
  }

  onDeselect() {
    if (this.isDragging) return;
    this.stopEditing();
  }

  onWillDraw(ctx) {
    const { graph, start, end, isEditing, type, note } = this;
    const [wl, wr] = graph.dateWindow_; // windowLeft, windowRight
    const isVisible = (start > wl && start < wr) || (end > wl && end < wr) || (start < wl && end > wr);

    if (!isVisible) return;

    const area = graph.getArea();
    const left = graph.toDomXCoord(start);
    const right = graph.toDomXCoord(end);

    // draw Area
    ctx.fillStyle = this.isEditable ? 'hsla(55, 100%, 50%, 0.4)' : 'hsla(200, 100%, 50%, 0.4)';
    ctx.fillRect(left, area.y, right - left, area.h);
    // draw Type
    ctx.font = '24px serif';
    ctx.fillStyle = 'black';
    ctx.fillText(typeMap[type] || type, left + 8, 24); // magic numbers, looks right
    // draw Note
    ctx.font = '14px serif';
    ctx.fillText(note, left + 8, area.h - 8);

    if (isEditing) this.startEditing();
  }

  startEditing() {
    if (!this.isEditable || this.editElement) return;

    const left = this.graph.toDomXCoord(this.start);
    const right = this.graph.toDomXCoord(this.end);
    const div = document.createElement('div');

    div.className = 'plotband';
    div.style.left = `${left}px`;
    div.style.width = `${right - left}px`;

    const input = this.addInputField(div);
    this.addHandles(div);
    this.addRemoveHandler(div);
    this.isEditing = true;
    this.editElement = div;
    this.graph.graphDiv.appendChild(div);
    input.focus();
  }

  stopEditing() {
    if (!this.isEditing) return;

    this.isEditing = false;
    this.editElement.remove();
    this.editElement = null;
    this.graph.draw(); // TODO check if type changes, otherwise don't re-render
  }

  addInputField(div) {
    const input = document.createElement('input');
    input.className = 'plotband-input';
    div.appendChild(input);

    input.onkeydown = (e) => {
      e.stopPropagation(); // so it does not interfer with e.g. the hypnogram
      this.type = String.fromCharCode(e.keyCode).trim().toUpperCase();
      if (this.graph.emit) this.graph.emit('bandChanged', this);
      input.onblur();
    };
    input.onblur = () => {
      input.onblur = null;
      if (this.isEditing) this.stopEditing();
    };

    return input;
  }

  addHandles(div) {
    const left = this.graph.toDomXCoord(this.start);
    const right = this.graph.toDomXCoord(this.end);
    const onEnd = () => {
      const newLeft = div.offsetLeft;
      const newRight = newLeft + div.offsetWidth;
      this.start = this.graph.toDataXCoord(newLeft);
      this.end = this.graph.toDataXCoord(newRight);
      this.stopEditing();
      if (this.graph.emit) this.graph.emit('bandChanged', this);
    };
    const add = (name, cb) => this.addHandle(left, right, name, cb, onEnd);

    const move = add('move', diff => div.style.left = `${left + diff}px`);
    const resizeRight = add('right', diff => div.style.width = `${right - left + diff}px`);
    const resizeLeft = add('left', (diff) => {
      div.style.left = `${left + diff}px`;
      div.style.width = `${right - left - diff}px`;
    });

    [resizeLeft, move, resizeRight].forEach(el => div.appendChild(el));
  }

  addHandle(left, right, name, onMove, onEnd) {
    const div = document.createElement('div');
    let startX;

    const mousemove = e => onMove(e.pageX - startX);
    const mouseup = (e) => {
      document.removeEventListener('mousemove', mousemove);
      document.removeEventListener('mouseup', mouseup);
      this.isDragging = false;
      onEnd(e.pageX - startX);
    };

    div.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.pageX;
      this.isDragging = true;
      document.addEventListener('mousemove', mousemove);
      document.addEventListener('mouseup', mouseup);
    });

    div.className = `plotband-${name}`;
    return div;
  }

  addRemoveHandler(div) {
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.destroy();
    });

    div.addEventListener('mousedown', (e) => {
      if (e.which === 3) e.preventDefault();
    });
  }

  destroy(silent = false) {
    this.graph.bands = this.graph.bands.filter(band => band !== this);
    this.stopEditing();
    if (this.graph.emit && !silent) this.graph.emit('bandRemoved', this);
  }

  toJSON() {
    const { id, start, end, type, note } = this;
    return { id, start, end, type, note };
  }

}
