/* The First Crush — online likes, comments, notifications and friend messaging */
(() => {
  const $ = (s, r=document) => r.querySelector(s);
  const db = () => typeof sb !== 'undefined' ? sb : null;
  const me = () => typeof user !== 'undefined' ? user : null;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = m => typeof window.toast === 'function' ? window.toast(m) : alert(m);
  let activePost = null, activeChat = null;
  const style = document.createElement('style');
  style.textContent = `
    .tfc-social-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .tfc-social-actions button,.tfc-panel button{border:0;border-radius:12px;padding:9px 12px;background:#f3effa;color:#6949a4;font-weight:750;font-size:12px}
    .tfc-social-actions button.liked{background:#ffe8f1;color:#d52d7e}
    .tfc-panel{position:fixed;z-index:40;inset:0;background:#17102188;display:grid;place-items:center;padding:14px}
    .tfc-panel[hidden]{display:none}.tfc-panel-box{background:#fff;color:#29223a;width:min(100%,520px);max-height:82vh;overflow:auto;border-radius:20px;padding:18px;box-shadow:0 20px 80px #0004}
    .tfc-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}
    .tfc-panel-head h3{margin:0;font-size:19px}.tfc-close{font-size:20px!important}
    .tfc-list-item{padding:12px 4px;border-bottom:1px solid #eee;display:flex;gap:10px;align-items:center}
    .tfc-list-item .tfc-grow{flex:1;min-width:0}.tfc-list-item small{display:block;color:#777;margin-top:3px}
    .tfc-message-list{display:grid;gap:8px;max-height:48vh;overflow:auto;padding:8px 0}
    .tfc-bubble{max-width:85%;padding:10px 13px;border-radius:15px;background:#f1edf7;justify-self:start;overflow-wrap:anywhere}
    .tfc-bubble.mine{justify-self:end;background:#fce5f1}
    .tfc-compose{display:flex;gap:8px;margin-top:10px}.tfc-compose input{flex:1;min-width:0;padding:11px;border:1px solid #ddd;border-radius:12px}
    .tfc-comment{padding:10px 0;border-bottom:1px solid #eee;overflow-wrap:anywhere}.tfc-comment small{color:#777}
    .tfc-unread{background:#ed3994;color:white;border-radius:20px;padding:2px 7px;font-size:10px;margin-left:4px}
    @media(prefers-color-scheme:dark){.tfc-panel-box{background:#241e30;color:#fff}.tfc-list-item,.tfc-comment{border-color:#40364e}.tfc-bubble{background:#393047}.tfc-bubble.mine{background:#59304b}}
  `;
  document.head.appendChild(style);
  function panel(id,title,body=''){
    let el=$('#'+id);
    if(!el){el=document.createElement('div');el.id=id;el.className='tfc-panel';el.hidden=true;el.innerHTML='<div class="tfc-panel-box"><div class="tfc-panel-head"><h3></h3><button class="tfc-close" type="button">×</button></div><div class="tfc-panel-body"></div></div>';document.body.appendChild(el);
      el.addEventListener('click',e=>{if(e.target===el||e.target.closest('.tfc-close'))el.hidden=true;});
    }
    el.querySelector('h3').textContent=title;
    if(body)el.querySelector('.tfc-panel-body').innerHTML=body;
    return el;
  }
  async function decoratePosts(){
    const client=db(), meUser=me();
    for(const card of document.querySelectorAll('.community-card[data-post-id]:not([data-social-ready])')){
      card.dataset.socialReady='1';
      const id=card.dataset.postId;
      const actions=document.createElement('div');actions.className='tfc-social-actions';actions.innerHTML='<button data-social="like">♡ Like</button><button data-social="comments">💬 Comments</button>';
      card.appendChild(actions);
      if(!client||!meUser)continue;
      const [likes,mine,comments]=await Promise.all([
        client.from('likes').select('user_id',{count:'exact',head:true}).eq('post_id',id),
        client.from('likes').select('post_id').eq('post_id',id).eq('user_id',meUser.id).maybeSingle(),
        client.from('comments').select('id',{count:'exact',head:true}).eq('post_id',id)
      ]);
      actions.querySelector('[data-social="like"]').textContent=(mine.data?'♥':'♡')+' Like · '+(likes.count||0);
      actions.querySelector('[data-social="like"]').classList.toggle('liked',!!mine.data);
      actions.querySelector('[data-social="comments"]').textContent='💬 Comments · '+(comments.count||0);
    }
  }
  async function toggleLike(card){
    const client=db(),meUser=me();if(!meUser){toast('Like गर्न login गर्नुहोस्।');return}
    const id=card.dataset.postId,btn=card.querySelector('[data-social="like"]');
    const {data,error}=await client.from('likes').select('post_id').eq('post_id',id).eq('user_id',meUser.id).maybeSingle();
    if(error){toast(error.message);return}
    if(data){const r=await client.from('likes').delete().eq('post_id',id).eq('user_id',meUser.id);if(r.error){toast(r.error.message);return}}
    else {const r=await client.from('likes').insert({post_id:id,user_id:meUser.id});if(r.error){toast(r.error.message);return}}
    card.removeAttribute('data-social-ready');await decoratePosts();
  }
  async function openComments(id){
    const client=db();if(!me()){toast('Comments हेर्न login गर्नुहोस्।');return}
    activePost=id;
    const dlg=panel('tfcComments','Comments','<div class="tfc-comments"></div><form class="tfc-compose" id="tfcCommentForm"><input id="tfcCommentInput" maxlength="1000" placeholder="Write a kind comment…" required><button type="submit">Send</button></form>');
    dlg.hidden=false;
    const list=dlg.querySelector('.tfc-comments');list.textContent='Loading comments…';
    const {data,error}=await client.from('comments').select('id,user_id,body,created_at').eq('post_id',id).order('created_at',{ascending:true}).limit(100);
    if(error){list.textContent=error.message;return}
    const ids=[...new Set((data||[]).map(x=>x.user_id))];
    const people=ids.length?await client.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
    const names=Object.fromEntries((people.data||[]).map(p=>[p.id,p.display_name||p.username||'Member']));
    list.innerHTML=(data||[]).map(c=>'<div class="tfc-comment"><strong>'+esc(names[c.user_id]||'Member')+'</strong><p>'+esc(c.body)+'</p><small>'+new Date(c.created_at).toLocaleString()+'</small></div>').join('')||'<p class="muted">No comments yet. Start kindly 💗</p>';
    dlg.querySelector('#tfcCommentForm').onsubmit=async e=>{e.preventDefault();const body=dlg.querySelector('#tfcCommentInput').value.trim();if(!body)return;const r=await client.from('comments').insert({post_id:activePost,user_id:me().id,body});if(r.error){toast(r.error.message);return}dlg.querySelector('#tfcCommentInput').value='';await openComments(activePost);toast('Comment added 💗')};
  }
  async function openNotifications(){
    const client=db(),meUser=me();if(!meUser){toast('Notifications हेर्न login गर्नुहोस्।');return}
    const dlg=panel('tfcNotifications','Notifications','<div class="tfc-notification-list">Loading…</div>');dlg.hidden=false;
    const {data,error}=await client.from('notifications').select('*').eq('user_id',meUser.id).order('created_at',{ascending:false}).limit(40);
    const list=dlg.querySelector('.tfc-notification-list');
    if(error){list.textContent=error.message;return}
    const ids=[...new Set((data||[]).map(n=>n.actor_id).filter(Boolean))];
    const p=ids.length?await client.from('profiles').select('id,display_name,username').in('id',ids):{data:[]};
    const names=Object.fromEntries((p.data||[]).map(x=>[x.id,x.display_name||x.username||'Someone']));
    const label={like:'liked your post',comment:'commented on your post',friend_request:'sent you a friend request'};
    list.innerHTML=(data||[]).map(n=>'<div class="tfc-list-item"><div class="tfc-grow"><strong>'+esc(names[n.actor_id]||'Someone')+'</strong> '+esc(label[n.kind]||'interacted with you')+'<small>'+new Date(n.created_at).toLocaleString()+'</small></div>'+(n.is_read?'':'<span class="tfc-unread">NEW</span>')+'</div>').join('')||'<p class="muted">No notifications yet. You are all caught up 💗</p>';
    const unread=(data||[]).filter(n=>!n.is_read).map(n=>n.id);
    if(unread.length){const r=await client.from('notifications').update({is_read:true}).in('id',unread).eq('user_id',meUser.id);if(r.error)console.warn(r.error)}
    const btn=$('#notificationsBtn');if(btn)btn.querySelector('.tfc-unread')?.remove();
  }
  async function openMessages(friendId=null,friendName='Messages'){
    const client=db(),meUser=me();if(!meUser){toast('Messages का लागि login गर्नुहोस्।');return}
    const dlg=panel('tfcMessages','Messages','<div class="tfc-friends">Loading friends…</div>');dlg.hidden=false;
    const {data:rels,error}=await client.from('friend_requests').select('sender_id,receiver_id').eq('status','accepted').or('sender_id.eq.'+meUser.id+',receiver_id.eq.'+meUser.id);
    const box=dlg.querySelector('.tfc-friends');
    if(error){box.textContent=error.message;return}
    const ids=[...new Set((rels||[]).map(r=>r.sender_id===meUser.id?r.receiver_id:r.sender_id))];
    if(!ids.length){box.innerHTML='<p class="muted">Message गर्न पहिले friend बन्नुहोस्।</p>';return}
    const people=await client.from('profiles').select('id,display_name,username').in('id',ids);
    const users=people.data||[];
    if(!friendId){box.innerHTML=users.map(p=>'<div class="tfc-list-item"><div class="tfc-grow"><strong>'+esc(p.display_name||p.username||'Friend')+'</strong></div><button data-chat-id="'+esc(p.id)+'">Message</button></div>').join('');box.querySelectorAll('[data-chat-id]').forEach(b=>b.onclick=()=>openMessages(b.dataset.chatId,users.find(p=>p.id===b.dataset.chatId)?.display_name||'Chat'));return}
    if(!ids.includes(friendId)){box.textContent='You can message accepted friends only.';return}
    activeChat=friendId;
    dlg.querySelector('h3').textContent=friendName;
    box.innerHTML='<div class="tfc-message-list">Loading messages…</div><form class="tfc-compose" id="tfcMessageForm"><input id="tfcMessageInput" maxlength="2000" placeholder="Write a message…" required><button type="submit">Send</button></form><button type="button" id="tfcBackMessages">← All friends</button>';
    const messages=box.querySelector('.tfc-message-list');
    const load=async()=>{const r=await client.from('messages').select('id,sender_id,receiver_id,body,created_at').or('and(sender_id.eq.'+meUser.id+',receiver_id.eq.'+friendId+'),and(sender_id.eq.'+friendId+',receiver_id.eq.'+meUser.id+')').order('created_at',{ascending:true}).limit(100);if(r.error){messages.textContent=r.error.message;return}messages.innerHTML=(r.data||[]).map(m=>'<div class="tfc-bubble '+(m.sender_id===meUser.id?'mine':'')+'">'+esc(m.body)+'<small> · '+new Date(m.created_at).toLocaleTimeString()+'</small></div>').join('')||'<p class="muted">Say hello 👋</p>';messages.scrollTop=messages.scrollHeight};
    await load();
    box.querySelector('#tfcBackMessages').onclick=()=>openMessages();
    box.querySelector('#tfcMessageForm').onsubmit=async e=>{e.preventDefault();const body=box.querySelector('#tfcMessageInput').value.trim();if(!body)return;const r=await client.from('messages').insert({sender_id:meUser.id,receiver_id:friendId,body});if(r.error){toast(r.error.message);return}box.querySelector('#tfcMessageInput').value='';await load()};
  }
  const nav=$('.bottom-nav');
  if(nav&&!$('#tfcMessagesNav')){const b=document.createElement('button');b.id='tfcMessagesNav';b.type='button';b.innerHTML='<span class="nav-symbol">✉</span><span>Messages</span>';nav.insertBefore(b,nav.querySelector('.nav-add'));b.onclick=()=>openMessages()}
  $('#notificationsBtn')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();openNotifications()},true);
  document.addEventListener('click',e=>{
    const card=e.target.closest('.community-card[data-post-id]');
    if(card&&e.target.closest('[data-social="like"]'))toggleLike(card);
    if(card&&e.target.closest('[data-social="comments"]'))openComments(card.dataset.postId);
  });
  const observer=new MutationObserver(()=>decoratePosts());
  const feed=$('#communityFeed');if(feed){observer.observe(feed,{childList:true,subtree:true});decoratePosts()}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)decoratePosts()});
  window.addEventListener('tfc:open-messages',e=>openMessages(e.detail?.id,e.detail?.name));
})();