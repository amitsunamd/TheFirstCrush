(() => {
  'use strict';
  const id = 'tfc-network-status';
  function mount() {
    if (document.getElementById(id)) return document.getElementById(id);
    const style = document.createElement('style');
    style.textContent = `
      #${id}{position:sticky;top:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:10px;padding:9px 12px;font:600 13px/1.4 system-ui,sans-serif;text-align:center;background:#fff0cf;color:#704400;border-bottom:1px solid #f0d89b}
      #${id}[data-state="online"]{background:#e6f8eb;color:#14532d;border-color:#b8e5c4}
      #${id} button{border:0;border-radius:999px;padding:5px 10px;font:inherit;background:rgba(0,0,0,.08);color:inherit;cursor:pointer}
      #${id}[hidden]{display:none}
    `;
    document.head.appendChild(style);
    const bar = document.createElement('div');
    bar.id = id;
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    bar.hidden = true;
    document.body.prepend(bar);
    return bar;
  }
  function update() {
    const bar = mount();
    if (navigator.onLine) {
      bar.dataset.state = 'online';
      bar.replaceChildren(document.createTextNode('✓ Internet connection restored.'));
      const reload = document.createElement('button');
      reload.type = 'button';
      reload.textContent = 'Refresh';
      reload.addEventListener('click', () => location.reload());
      bar.appendChild(reload);
      bar.hidden = false;
      clearTimeout(update.onlineTimer);
      update.onlineTimer = setTimeout(() => { bar.hidden = true; }, 5000);
    } else {
      bar.dataset.state = 'offline';
      bar.replaceChildren(document.createTextNode('You are offline. Showing content saved on this device where available.'));
      bar.hidden = false;
    }
  }
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  window.addEventListener('pageshow', update);
  document.addEventListener('DOMContentLoaded', update);
  update();
})();
