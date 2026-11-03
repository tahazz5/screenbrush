document.querySelectorAll('[data-tool]').forEach(button => button.onclick = () => {
  document.querySelectorAll('[data-tool]').forEach(item => item.classList.toggle('active', item === button));
  window.desktop.command({ tool: button.dataset.tool });
});
document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => window.desktop.command({ action: button.dataset.action }));
document.querySelectorAll('[data-color]').forEach(button => button.onclick = () => {
  document.querySelector('#color').value = button.dataset.color;
  window.desktop.command({ color: button.dataset.color });
});
document.querySelector('#color').oninput = event => window.desktop.command({ color: event.target.value });
document.querySelector('#width').oninput = event => window.desktop.command({ width: Number(event.target.value) });
window.desktop.onGhost(value => document.querySelector('#ghost').classList.toggle('active', value));
window.desktop.onCommand(value => {
  if (value.tool) document.querySelectorAll('[data-tool]').forEach(button => button.classList.toggle('active', button.dataset.tool === value.tool));
  if (value.action === 'whiteboard') document.querySelector('[data-action="whiteboard"]').classList.toggle('active');
});
