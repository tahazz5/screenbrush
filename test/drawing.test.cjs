const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup() {
  let receive, saved;
  const operations = [];
  const ctx = new Proxy({}, { get: (target, key) => key in target ? target[key] : (...args) => operations.push([key, ...args]) });
  const canvas = { style: {}, getContext: () => ctx, setPointerCapture() {}, toDataURL: () => 'data:image/png;base64,AA==' };
  const input = { style: {}, focus() {}, value: '' };
  const scope = { document: { querySelector: selector => selector === '#canvas' ? canvas : input }, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 2, performance: { now: () => 0 }, setInterval() {}, alert() {}, window: { desktop: { onCommand: callback => receive = callback, command() {}, save: async png => saved = png } } };
  vm.createContext(scope);
  vm.runInContext(fs.readFileSync(require.resolve('../src/renderer.js'), 'utf8'), scope);
  return { canvas, input, operations, command: value => receive(value), value: expression => vm.runInContext(expression, scope), saved: () => saved };
}
function stroke(app, x = 20) {
  app.canvas.onpointerdown({ button: 0, clientX: x, clientY: 30, pointerId: 1 });
  app.canvas.onpointermove({ clientX: x + 40, clientY: 90 });
  app.canvas.onpointerup();
}
test('drawing, undo, redo and branching retain the correct history', () => {
  const app = setup(); stroke(app); stroke(app, 100);
  assert.equal(app.value('drawings.length'), 2);
  app.command({ action: 'undo' }); assert.equal(app.value('drawings.length'), 1);
  app.command({ action: 'redo' }); assert.equal(app.value('drawings.length'), 2);
  app.command({ action: 'undo' }); stroke(app, 200);
  assert.equal(app.value('redo.length'), 0);
});
test('clear is reversible and laser never enters permanent drawings', () => {
  const app = setup(); stroke(app);
  app.command({ action: 'clear' }); assert.equal(app.value('drawings.at(-1).tool'), 'clear');
  app.command({ action: 'undo' }); assert.equal(app.value('drawings.length'), 1);
  app.command({ tool: 'laser' }); stroke(app);
  assert.equal(app.value('drawings.length'), 1);
  assert.equal(app.value('lasers.length'), 1);
});
test('export sends PNG and text creates an undoable annotation', () => {
  const app = setup(); app.command({ tool: 'text' });
  app.canvas.onpointerdown({ button: 0, clientX: 20, clientY: 30 });
  app.canvas.onpointermove({ clientX: 500, clientY: 500 });
  app.input.value = 'Hello'; app.input.onkeydown({ key: 'Enter', stopPropagation() {} });
  assert.equal(app.value('drawings[0].text'), 'Hello');
  assert.equal(app.value('drawings[0].points[0].x'), 20);
  app.command({ action: 'save' }); assert.equal(app.saved(), 'data:image/png;base64,AA==');
  app.command({ action: 'undo' }); assert.equal(app.value('drawings.length'), 0);
});
test('HiDPI canvas and ellipse geometry use logical coordinates', () => {
  const app = setup(); assert.equal(app.canvas.width, 2400);
  app.command({ tool: 'ellipse' }); stroke(app);
  assert.ok(app.operations.some(op => op[0] === 'ellipse' && op[1] === 40 && op[2] === 60 && op[3] === 20 && op[4] === 30));
});
