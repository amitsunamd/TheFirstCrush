/* The First Crush — Friends, requests, public profiles */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = msg => typeof window.toast === 'function' ? window.toast(msg) : alert(msg);
  const client = () => typeof sb !== 'undefined' ? sb : null;
  const current = () => typeof user !== 'undefined' ? user : null;
  let activeProfile = null, searchTimer = null;

  const section = document.createElement('section');
  section.id = 'friendsPage'; section.className = 'section friends-page'; section.hidden = true;
  section.innerHTML = `
    <div class="friends-heading"><div><span class="eyebrow">YOUR COMMUNITY</span><h2>Friends</h2></div><span class="pill" id="friendsCount">0 friends</span></div>
    <div class="friends-tabs" role="tablist"><button class="active" data-friends-tab="requests">Friend requests <b id="requestCount">0</b></button><button data-friends-tab="suggestions">Suggestions</button><button data-friends-tab="friends">Your friends</button></div>
    <label class="friends-search"><span>⌕</span><input id="peopleSearch" type="search" placeholder="Search people by name or username" autocomplete="off"></label>
    <div id="friendsNotice" class="muted friends-notice">Connect with people on The First Crush.</div>
    <div id="friendsList" class="friends-list"></div>
  `;
  const account = $('#account');
  if (account) account.after(section);
  const nav = $('.bottom-nav');
  if (nav && !$('#friendsNav')) {
    const a = document.createElement('a'); a.id='friendsNav'; a.href='#friendsPage'; a.innerHTML='<span class="nav-symbol">♧</span><span>Friends</span>'; nav.insertBefore(a, nav.querySelector('.nav-add'));
    a.addEventListener('click', e => { e.preventDefault(); showFriends(); });
  }
  if (nav) nav.querySelectorAll('a[href="#account"]').forEach(a => a.addEventListener('click', () => setTimeout(showAccount,0)));
  if (nav) nav.querySelectorAll('a[href="#home"],a[href="#discover"]').forEach(a => a.addEventListener('click', () => { section.hidden=true; if(account)account.hidden=false; }));
  function showFriends(){ if(!current()){ $('#authOpenBtn')?.click(); toast('Please log in to view friends.'); return; } if(account)account.hidden=true; section.hidden=false; location.hash='friendsPage'; loadRequests(); }
  function showAccount(){section.hidden=true;if(account)account.hidden=false;}
  $('#friendsNav')?.addEventListener('click', showFriends);

  function avatar(p){return p?.avatar_url ? `<img src="${esc(p.avatar_url)}" alt="" loading="lazy">` : '<span class="default-avatar">👤</span>';}
  function personCard(p, action, label, extra=''){
    const name=p.display_name||p.full_name||p.username||'The First Crush member';
    return `<article class="person-card"><button class="person-main" data-open-profile="${esc(p.id)}">${avatar(p)}<span class="person-info"><strong>${esc(name)}</strong><small>${p.username?'@'+esc(p.username):esc(p.bio||'New to The First Crush')}</small></span></button><div class="person-actions">${extra}<button class="friend-action ${action==='confirm'?'confirm':''}" data-friend-action="${action}" data-id="${esc(p.id)}">${label}</button></div></article>`;
  }
  async function profiles(ids){
    if(!ids.length)return [];
    const {data,error}=await client().from('profiles').select('*').in('id',ids);
    if(error){console.warn(error);return [];} return data||[];
  }
  async function loadRequests(){
    const db=client(), me=current(); if(!db||!me)return;
    $('#friendsNotice').textContent='Loading your friend requests…';
    const {data,error}=await db.from('friend_requests').select('*').or(`sender_id.eq.${me.id},receiver_id.eq.${me.id}`).order('created_at',{ascending:false});
    if(error){$('#friendsNotice').textContent='Friend requests could not load: '+error.message;return;}
    const rows=data||[], incoming=rows.filter(x=>x.receiver_id===me.id&&x.status==='pending'), outgoing=rows.filter(x=>x.sender_id===me.id&&x.status==='pending'), accepted=rows.filter(x=>x.status==='accepted');
    const ids=[...new Set(rows.map(x=>x.sender_id===me.id?x.receiver_id:x.sender_id))];
    const people=await profiles(ids), byId=Object.fromEntries(people.map(p=>[p.id,p]));
    $('#requestCount').textContent=incoming.length;
    $('#friendsCount').textContent=accepted.length+' friends';
    const tab=section.dataset.tab||'requests'; renderTab(tab,{incoming,outgoing,accepted,byId,rows});
  }
  function renderTab(tab,d){
    section.dataset.tab=tab;
    section.querySelectorAll('[data-friends-tab]').forEach(b=>b.classList.toggle('active',b.dataset.friendsTab===tab));
    const list=$('#friendsList'); let html='';
    if(tab==='requests'){
      html=d.incoming.map(r=>personCard(d.byId[r.sender_id]||{id:r.sender_id},'confirm','Confirm',`<button class="friend-muted" data-friend-action="reject" data-id="${r.id}">Delete</button>`)).join('');
      if(!html)html='<div class="friends-empty">💌<strong>No new friend requests</strong><span>When someone sends you a request, it will appear here.</span></div>';
    } else if(tab==='friends'){
      html=d.accepted.map(r=>{const id=r.sender_id===current().id?r.receiver_id:r.sender_id;return personCard(d.byId[id]||{id},'remove','Friends');}).join('');
      if(!html)html='<div class="friends-empty">💗<strong>Your friend list is waiting</strong><span>Find people and send your first friend request.</span></div>';
    } else {
      html=d.outgoing.map(r=>personCard(d.byId[r.receiver_id]||{id:r.receiver_id},'cancel','Requested')).join('');
      if(!html)html='<div class="friends-empty">✨<strong>People you may know</strong><span>Search for people below to start connecting.</span></div>';
      loadSuggestions(d.rows);
    }
    $('#friendsNotice').textContent=tab==='requests'?'People who want to connect with you':tab==='friends'?'Your connections on The First Crush':'Discover and connect with other members';
    list.innerHTML=html;
  }
  async function loadSuggestions(existing=[]){
    const me=current(),db=client();if(!me||!db)return;
    const excluded=[me.id,...existing.map(r=>r.sender_id===me.id?r.receiver_id:r.sender_id)];
    const {data,error}=await db.from('profiles').select('*').neq('id',me.id).limit(30);
    if(error){console.warn(error);return;}
    const suggestions=(data||[]).filter(p=>!excluded.includes(p.id)).slice(0,12);
    if(section.dataset.tab==='suggestions'){
      const list=$('#friendsList');
      const pending=$('#friendsList').innerHTML;
      list.innerHTML=pending+suggestions.map(p=>personCard(p,'add','Add friend')).join('');
      if(!list.innerHTML)list.innerHTML='<div class="friends-empty">No suggestions yet.</div>';
    }
  }
  async function changeFriend(action,id){
    const db=client(),me=current();if(!db||!me)return;
    let result;
    if(action==='confirm') result=await db.from('friend_requests').update({status:'accepted'}).eq('id',id).eq('receiver_id',me.id);
    if(action==='reject') result=await db.from('friend_requests').update({status:'rejected'}).eq('id',id).eq('receiver_id',me.id);
    if(action==='cancel') result=await db.from('friend_requests').delete().eq('sender_id',me.id).eq('receiver_id',id).eq('status','pending');
    if(action==='remove'){
      if(!confirm('Remove this friend?'))return;
      result=await db.from('friend_requests').delete().or(`and(sender_id.eq.${me.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${me.id})`).eq('status','accepted');
    }
    if(action==='add'){
      const {data:existing}=await db.from('friend_requests').select('id,status').or(`and(sender_id.eq.${me.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${me.id})`).maybeSingle();
      if(existing){
        if(existing.status==='accepted'){toast('You are already friends.');return;}
        if(existing.status==='rejected'){
          const retry=await db.from('friend_requests').update({status:'pending'}).eq('id',existing.id).eq('sender_id',me.id);
          if(retry.error){toast(retry.error.message);return;}
          toast('Friend request sent again!');loadRequests();return;
        }
        toast('A request already exists.');return;
      }
      result=await db.from('friend_requests').insert({sender_id:me.id,receiver_id:id,status:'pending'});
    }
    if(result?.error){toast(result.error.message);return;}
    toast(action==='confirm'?'Friend request accepted 💗':action==='add'?'Friend request sent!':action==='remove'?'Friend removed.':'Request updated.');
    loadRequests();
  }
  async function searchPeople(q){
    if(!q||!current())return;
    const db=client(),me=current();
    const safe=q.replace(/[,%()]/g,' ').trim();
    const {data,error}=await db.from('profiles').select('*').neq('id',me.id).or(`display_name.ilike.%${safe}%,full_name.ilike.%${safe}%,username.ilike.%${safe}%`).limit(15);
    if(error){$('#friendsNotice').textContent='Search error: '+error.message;return;}
    $('#friendsNotice').textContent=(data||[]).length?'Search results':'No people found.';
    $('#friendsList').innerHTML=(data||[]).map(p=>personCard(p,'add','Add friend')).join('');
  }
  async function openProfile(id){
    const db=client();if(!db)return;
    const {data:p,error}=await db.from('profiles').select('*').eq('id',id).maybeSingle();
    if(error||!p){toast('Could not load this profile.');return;}
    activeProfile=p;
    let rel=''; const me=current();
    if(me&&me.id!==id){
      const {data:r}=await db.from('friend_requests').select('*').or(`and(sender_id.eq.${me.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${me.id})`).maybeSingle();
      rel=r;
    }
    const {count:friends}=await db.from('friend_requests').select('*',{count:'exact',head:true}).eq('status','accepted').or(`sender_id.eq.${id},receiver_id.eq.${id}`);
    const {count:posts}=await db.from('posts').select('*',{count:'exact',head:true}).eq('user_id',id);
    let button='';
    if(me?.id===id)button='<span class="profile-self-label">Your profile</span>';
    else if(rel?.status==='accepted')button='<span class="profile-self-label">✓ Friends</span>';
    else if(rel?.status==='pending')button=rel.sender_id===me?.id?'<button class="friend-action" disabled>Requested</button>':'<button class="friend-action confirm" data-friend-action="confirm" data-id="'+esc(rel.id)+'">Confirm request</button>';
    else button='<button class="friend-action confirm" data-friend-action="add" data-id="'+esc(id)+'">Add friend</button>';
    const dlg=$('#publicProfileDialog')||document.createElement('dialog');
    dlg.id='publicProfileDialog';dlg.className='public-profile-dialog';
    dlg.innerHTML=`<button class="profile-close" type="button" data-close-profile>×</button><div class="public-cover"></div><div class="public-avatar">${avatar(p)}</div><div class="public-profile-content"><h2>${esc(p.display_name||p.full_name||p.username||'Member')}</h2><p class="public-username">${p.username?'@'+esc(p.username):''}</p><p>${esc(p.bio||'')}</p><div class="profile-stats"><span><b>${friends||0}</b> Friends</span><span><b>${posts||0}</b> Posts</span></div>${button}</div>`;
    if(!dlg.isConnected)document.body.appendChild(dlg);
    dlg.showModal();
  }
  document.addEventListener('click',e=>{
    const tab=e.target.closest('[data-friends-tab]');if(tab){const db=client(),me=current();if(!db||!me)return;section.dataset.tab=tab.dataset.friendsTab;loadRequests();return;}
    const action=e.target.closest('[data-friend-action]');if(action){changeFriend(action.dataset.friendAction,action.dataset.id);return;}
    const profile=e.target.closest('[data-open-profile]');if(profile){openProfile(profile.dataset.openProfile);return;}
    if(e.target.closest('[data-close-profile]'))$('#publicProfileDialog')?.close();
  });
  $('#peopleSearch')?.addEventListener('input',e=>{clearTimeout(searchTimer);const q=e.target.value.trim();searchTimer=setTimeout(()=>q?searchPeople(q):loadRequests(),300);});
  const observer=new MutationObserver(()=>{if(!section.hidden&&current()&&section.dataset.loaded!=='yes'){section.dataset.loaded='yes';loadRequests();}});
  observer.observe(section,{attributes:true,attributeFilter:['hidden']});
  // Password visibility controls for sign-up, login and recovery fields.
  ['signupPassword','loginPassword'].forEach(id=>{
    const input=$('#'+id);if(!input||input.dataset.visibilityReady)return;
    input.dataset.visibilityReady='yes';
    const btn=document.createElement('button');btn.type='button';btn.className='password-toggle';btn.textContent='Show';btn.setAttribute('aria-label','Show password');
    input.insertAdjacentElement('afterend',btn);
    btn.addEventListener('click',()=>{const show=input.type==='password';input.type=show?'text':'password';btn.textContent=show?'Hide':'Show';btn.setAttribute('aria-label',show?'Hide password':'Show password');});
  });
  window.addEventListener('hashchange',()=>{if(location.hash==='#friendsPage')showFriends();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!section.hidden)loadRequests();});
})();
