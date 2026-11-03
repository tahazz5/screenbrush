window.addEventListener('keydown', event => {
  if (event.target instanceof HTMLInputElement && event.target.type !== 'range' && event.target.type !== 'color') return;
  const key = event.key.toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;
  let value;
  if (modifier && key === 'z') value = { action: event.shiftKey ? 'redo' : 'undo' };
  else if (modifier && key === 's') value = { action: 'save' };
  else if (event.key === 'Escape') value = { action: 'ghost' };
  else if (!modifier && !event.altKey) {
    const tools = { b: 'pen', l: 'line', a: 'arrow', r: 'rectangle', o: 'ellipse', t: 'text', e: 'eraser', p: 'laser', s: 'spotlight' };
    if (tools[key]) value = { tool: tools[key] };
    if (key === 'w') value = { action: 'whiteboard' };
  }
  if (value) { event.preventDefault(); window.desktop.command(value); }
});
