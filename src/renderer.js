const canvas = document.querySelector('#canvas');
const ctx = canvas.getContext('2d');
const input = document.querySelector('#text');
let tool = 'pen', color = '#ff526c', width = 5, whiteboard = false;
let drawings = [], redo = [], current = null, pointer = { x: 0, y: 0 }, lasers = [], textOrigin = null;
function resize() {
  canvas.width = Math.round(innerWidth * devicePixelRatio);
  canvas.height = Math.round(innerHeight * devicePixelRatio);
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  render();
}
function paint(item) {
  if (item.tool === 'clear') { ctx.clearRect(0, 0, innerWidth, innerHeight); return; }
  const a = item.points[0], b = item.points.at(-1);
  ctx.save();
  ctx.strokeStyle = item.color; ctx.fillStyle = item.color; ctx.lineWidth = item.width;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (item.tool === 'eraser') ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  if (['pen', 'eraser', 'laser'].includes(item.tool)) {
    ctx.moveTo(a.x, a.y);
    if (item.points.length === 1) ctx.lineTo(a.x + .01, a.y);
    for (const p of item.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  } else if (item.tool === 'rectangle') ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  else if (item.tool === 'ellipse') {
    ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2); ctx.stroke();
  } else if (item.tool === 'text') {
    ctx.font = `${Math.max(20, item.width * 5)}px system-ui`; ctx.fillText(item.text, a.x, a.y);
  } else {
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    if (item.tool === 'arrow') {
      const angle = Math.atan2(b.y - a.y, b.x - a.x), head = Math.max(15, item.width * 4);
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - head * Math.cos(angle - .45), b.y - head * Math.sin(angle - .45));
      ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - head * Math.cos(angle + .45), b.y - head * Math.sin(angle + .45)); ctx.stroke();
    }
  }
  ctx.restore();
}
function render(exporting = false) {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  drawings.forEach(paint);
  if (current) paint(current);
  if (whiteboard) {
    ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#f7f7fa'; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.restore();
  }
  if (exporting) return;
  if (tool === 'spotlight') {
    ctx.save(); ctx.fillStyle = '#080b15b8'; ctx.beginPath(); ctx.rect(0, 0, innerWidth, innerHeight); ctx.arc(pointer.x, pointer.y, 110, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore();
  }
  const now = performance.now();
  lasers = lasers.filter(item => now - item.time < 850);
  for (const item of lasers) { ctx.save(); ctx.globalAlpha = 1 - (now - item.time) / 850; ctx.shadowBlur = 12; ctx.shadowColor = item.color; paint(item); ctx.restore(); }
}
function commit(item) { drawings.push(item); redo = []; }
canvas.onpointerdown = event => {
  if (event.button !== 0) return;
  pointer = { x: event.clientX, y: event.clientY };
  if (tool === 'spotlight') return;
  if (tool === 'text') {
    textOrigin = { ...pointer };
    input.style.left = Math.min(pointer.x, innerWidth - 220) + 'px'; input.style.top = Math.min(pointer.y, innerHeight - 60) + 'px';
    input.style.display = 'block'; input.value = ''; input.focus(); return;
  }
  canvas.setPointerCapture(event.pointerId);
  current = { tool, color, width: tool === 'eraser' ? width * 5 : width, points: [pointer] };
};
canvas.onpointermove = event => {
  pointer = { x: event.clientX, y: event.clientY };
  if (current) {
    if (['pen', 'eraser', 'laser'].includes(current.tool)) current.points.push(pointer);
    else current.points[1] = pointer;
    if (current.tool === 'laser') {
      lasers.push({ ...current, points: current.points.slice(-2), time: performance.now() });
      current.points = [pointer];
    }
  }
  render();
};
function finish() {
  if (!current) return;
  if (current.tool !== 'laser') commit(current);
  current = null; render();
}
canvas.onpointerup = finish;
canvas.onpointercancel = () => { current = null; render(); };
input.onkeydown = event => {
  event.stopPropagation();
  if (event.key === 'Enter' && input.value.trim()) {
    commit({ tool: 'text', color, width, text: input.value, points: [textOrigin] });
    input.style.display = 'none'; render();
  } else if (event.key === 'Escape') input.style.display = 'none';
};
function command(value) {
  finish();
  if (value.tool) { tool = value.tool; input.style.display = 'none'; }
  if (value.color) color = value.color;
  if (value.width) width = value.width;
  if (value.action === 'undo' && drawings.length) redo.push(drawings.pop());
  if (value.action === 'redo' && redo.length) drawings.push(redo.pop());
  if (value.action === 'clear') {
    if (drawings.length && drawings.at(-1).tool !== 'clear') commit({ tool: 'clear' });
    lasers = [];
  }
  if (value.action === 'whiteboard') whiteboard = !whiteboard;
  render();
  if (value.action === 'save') {
    render(true);
    window.desktop.save(canvas.toDataURL('image/png')).catch(error => alert('Export failed: ' + error.message));
    render();
  }
}
window.desktop.onCommand(command);
window.onresize = resize;
resize();
setInterval(() => { if (lasers.length) render(); }, 30);
