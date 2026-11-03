(() => {
  'use strict';
  const id = 'tfc-network-status';
  let hideTimer = null;
  function mount() {
    let bar = document.getElementById(id);
    if (bar) return bar;
    const style = document.createElement('style');
    style.textContent = `
      #${id}{position:sticky;top:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:9px;padding:10px 12px;font:600 13px/1.45 system-ui,sans-serif;text-align:center;background:#fff0cf;color:#704400;border-bottom:1px solid #f0d89b}
      #${id}[data-state="online"]{background:#e6f8eb;color:#14532d;border-color:#b8e5c4}
      #${id}[data-state="error"]{background:#fff0cf;color:#704400}
      #${id} button{border:0;border-radius:999px;padding:6px 12px;font:inherit;background:rgba(0,0,0,.09);color:inherit;cursor:pointer}
      #${id}[hidden]{display:none}
    `;
    document.head.appendChild(style);
    bar = document.createElement('div');
    bar.id = id; bar.setAttribute('role','status'); bar.setAttribute('aria-live','polite');
    bar.hidden = true; document.body.prepend(bar);
    return bar;
  }
  function show(state, message, action) {
    const bar=mount(); clearTimeout(hideTimer);
    bar.dataset.state=state; bar.replaceChildren(document.createTextNode(message));
    if(action){const btn=document.createElement('button');btn.type='button';btn.textContent=action.label;btn.addEventListener('click',action.run);bar.appendChild(btn);}
    bar.hidden=false;
  }
  function update() {
    if(!navigator.onLine){
      show('offline','You’re offline. Posts, Friends, Profile, likes and messages need internet. Saved content remains available on this device.');
      return;
    }
    show('online','✓ Internet connection restored. Reconnecting server features…',{label:'Retry now',run:()=>window.dispatchEvent(new Event('tfc:retry-api'))});
    hideTimer=setTimeout(()=>{const bar=mount();if(bar.dataset.state==='online')bar.hidden=true;},6500);
  }
  window.addEventListener('online',update);
  window.addEventListener('offline',update);
  window.addEventListener('pageshow',update);
  window.addEventListener('tfc:api-offline',()=>show('error','Server features are temporarily unavailable. Check your internet, then retry.',{label:'Retry',run:()=>window.dispatchEvent(new Event('tfc:retry-api'))}));
  window.addEventListener('tfc:api-timeout',()=>show('error','The server took too long to respond. Loading was stopped; please retry.',{label:'Retry',run:()=>window.dispatchEvent(new Event('tfc:retry-api'))}));
  window.addEventListener('DOMContentLoaded',update);
  update();
})();
