const CATEGORIES=[['Romantic','💗','Sweet words for a special someone'],['Flirty','😉','A little spark and confidence'],['Funny','😂','Make them smile first'],['Sad','🥺','For the feelings you cannot hide'],['Cute','🥰','Soft, wholesome and adorable'],['Nepali','🇳🇵','नेपालीमा मनका कुरा'],['Hindi','🇮🇳','दिल से निकली बातें'],['English','✨','Classic English lines'],['Pickup Lines','💘','Clever openers for your crush']];
const LINES=[
['Romantic','English','Are you the moon? Because even my darkest nights look beautiful with you.'],['Romantic','English','If my heart had a home screen, your smile would be the wallpaper.'],['Romantic','English','I was looking for a sign, then you smiled at me.'],['Flirty','English','Is your name Wi-Fi? Because I feel a connection.'],['Flirty','English','Are you a camera? Every time I see you, I smile.'],['Flirty','English','Do you believe in love at first sight, or should I walk by again?'],['Funny','English','Are you a keyboard? You are just my type.'],['Funny','English','Are you a bank loan? You have my interest.'],['Funny','English','I am not a photographer, but I can picture us together.'],['Sad','English','Some people become a beautiful memory before they become ours.'],['Sad','English','I still smile at the memories my heart cries over.'],['Cute','English','You are my favorite notification.'],['Cute','English','If hugs were stars, I would give you the whole galaxy.'],['Nepali','Nepali','तिमी मुस्कुराउँदा, मेरो दिन आफैँ राम्रो हुन्छ। ❤️'],['Nepali','Nepali','तिमी चिया जस्तै हौ, दिनको सुरुवात तिम्रै यादबाट हुन्छ। ☕'],['Nepali','Nepali','मनले रोजेको मान्छे तिमी, अनि हरेक प्रार्थनाको मिठो उत्तर पनि तिमी।'],['Hindi','Hindi','तुम मेरी पसंद नहीं, मेरी सबसे प्यारी आदत हो। ❤️'],['Hindi','Hindi','तुम्हारी मुस्कान में कुछ तो बात है, मेरा दिल हर बार हार जाता है।'],['Hindi','Hindi','अगर सुकून का कोई चेहरा होता, तो वो तुम्हारा होता।'],['Romantic','English','I do not need a perfect day; I just need a little time with you.'],['Cute','English','You make ordinary moments feel like my favorite movie.'],['Flirty','English','Are you a magician? Whenever you are here, everyone else disappears.'],['Funny','English','Are you a charger? Because my energy comes back around you.'],['Nepali','Nepali','तिमीलाई हेर्दा घडी पनि छिटो चल्छ, अनि भेट्न नपाउँदा समय नै रोकिन्छ।'],
['Pickup Lines','English','Are you a sunrise? Because you make every day feel worth waking up for.'],
['Pickup Lines','English','I had a clever pickup line ready, but your smile made me forget it.'],
['Pickup Lines','English','Is your name Google? Because you have everything I have been searching for.'],
['Pickup Lines','Nepali','तिमी Wi-Fi हौ? किनकि तिमीसँग हुँदा मन आफैँ connect हुन्छ।'],
['Pickup Lines','Nepali','तिमीलाई देखेपछि मेरो मुटुले पनि नयाँ notification पायो। ❤️'],
['Pickup Lines','Hindi','क्या तुम Google हो? क्योंकि जो ढूँढ रहा था, वो तुममें मिल गया।'],
['Pickup Lines','Hindi','तुमसे बात करने का बहाना नहीं चाहिए, बस मौका चाहिए।']
];

const $=s=>document.querySelector(s);

// Network safety: fail fast offline, cap request time, and retry transient failures once.
(function installNetworkSafety(){
  if(window.__tfcSafeFetchInstalled || !window.fetch) return;
  window.__tfcSafeFetchInstalled = true;
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function(input, init={}) {
    const url = typeof input === 'string' ? input : input?.url || '';
    const isSupabase = /supabase\.co\/|supabase\.in\//i.test(url);
    if(isSupabase && !navigator.onLine) {
      window.dispatchEvent(new CustomEvent('tfc:api-offline'));
      throw new TypeError('You are offline. Posts, Friends and Profile need an internet connection.');
    }
    if(!isSupabase) return nativeFetch(input, init);
    let lastError;
    for(let attempt=0; attempt<2; attempt++) {
      if(!navigator.onLine) {
        window.dispatchEvent(new CustomEvent('tfc:api-offline'));
        throw new TypeError('You are offline. Reconnect to use server features.');
      }
      const controller = new AbortController();
      const timer = setTimeout(()=>controller.abort(), 12000);
      try {
        const options = {...init, signal:controller.signal};
        return await nativeFetch(input, options);
      } catch(error) {
        lastError = error;
        if(error?.name === 'AbortError') {
          window.dispatchEvent(new CustomEvent('tfc:api-timeout'));
          throw new Error('Server request timed out. Please check your connection and try again.');
        }
        if(attempt===0 && navigator.onLine) {
          await new Promise(resolve=>setTimeout(resolve,900));
          continue;
        }
        window.dispatchEvent(new CustomEvent('tfc:api-offline'));
        throw new Error('Could not reach the server. Check your internet connection and try again.');
      } finally { clearTimeout(timer); }
    }
    throw lastError;
  };
})();
\nconst store={get(k,f){try{return JSON.parse(localStorage.getItem('tfc_'+k))??f}catch{return f}},set(k,v){localStorage.setItem('tfc_'+k,JSON.stringify(v))}};
let selected='All',toastTimer,user=null,profile={display_name:'Love Explorer',bio:''},remotePosts=[],remoteFavorites=new Set(),otpSent=false,pendingSignupData=null;
const configured=window.TFC_SUPABASE_URL?.startsWith('https://') && !window.TFC_SUPABASE_URL.includes('PASTE_') && window.TFC_SUPABASE_ANON_KEY && !window.TFC_SUPABASE_ANON_KEY.includes('PASTE_');
const sb=configured&&window.supabase?window.supabase.createClient(window.TFC_SUPABASE_URL,window.TFC_SUPABASE_ANON_KEY):null;
console.log('TFC Debug:', {
  urlLoaded: !!window.TFC_SUPABASE_URL,
  keyLoaded: !!window.TFC_SUPABASE_ANON_KEY,
  keyFormat: window.TFC_SUPABASE_ANON_KEY?.startsWith('sb_publishable_'),
  libraryLoaded: !!window.supabase,
  clientCreated: !!sb
});
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2500)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function currentId(){return user?.id||'guest'}
function allLines(){return [...LINES.map((l,i)=>({id:'seed'+i,category:l[0],language:l[1],text:l[2],author:'The First Crush',seed:true})),...remotePosts]}
function isFav(id){return remoteFavorites.has(id)||store.get('favorites',[]).includes(id)}
async function toggleFav(id){if(user&&sb&&!id.startsWith('seed')){if(remoteFavorites.has(id)){await sb.from('favorites').delete().eq('post_id',id).eq('user_id',user.id);remoteFavorites.delete(id)}else{const {error}=await sb.from('favorites').insert({post_id:id,user_id:user.id});if(error){toast(error.message);return}remoteFavorites.add(id)}}else{let a=store.get('favorites',[]);a=a.includes(id)?a.filter(x=>x!==id):[...a,id];store.set('favorites',a)}render();toast(isFav(id)?'Added to favorites 💗':'Removed from favorites')}
function card(line){return `<article class="quote-card"><p class="quote-text">“${esc(line.text)}”</p><div class="quote-meta"><span>${esc(line.category)} · ${esc(line.language)}</span><span>♡ ${esc(line.author||'Community')}</span></div><div class="quote-actions"><button class="action-btn" data-action="copy" data-id="${esc(line.id)}">▢ Copy</button><button class="action-btn" data-action="share" data-id="${esc(line.id)}">↗ Share</button><button class="action-btn favorite ${isFav(line.id)?'on':''}" data-action="fav" data-id="${esc(line.id)}">${isFav(line.id)?'♥ Saved':'♡ Favorite'}</button></div></article>`}
function renderCategories(){$('#categoryGrid').innerHTML=CATEGORIES.map(([name,emoji,desc])=>`<button class="category ${selected===name?'active':''}" data-category="${name}"><span class="cat-emoji">${emoji}</span><strong>${name}</strong><small>${desc}</small></button>`).join('')+`<button class="category ${selected==='All'?'active':''}" data-category="All"><span class="cat-emoji">💞</span><strong>All lines</strong><small>Every mood together</small></button>`;$('#postCategory').innerHTML=CATEGORIES.map(c=>`<option>${c[0]}</option>`).join('')}
function render(){renderCategories();let lines=allLines();let visible=selected==='All'?lines:lines.filter(l=>l.category===selected||l.language===selected);$('#feedTitle').textContent=selected==='All'?'Popular lines':`${selected} lines`;$('#lineCount').textContent=`${lines.length} lines`;$('#quoteFeed').innerHTML=visible.slice().reverse().slice(0,8).map(card).join('')||'<p class="muted">No lines yet.</p>';let favs=lines.filter(l=>isFav(l.id));$('#favoriteCount').textContent=favs.length;$('#favoritesFeed').innerHTML=favs.map(card).join('')||'<p class="muted">Your saved lines appear here.</p>';$('#communityFeed').innerHTML=remotePosts.slice().reverse().map(p=>`<article class="community-card" data-post-id="${esc(p.id)}"><span class="pill">${esc(p.category)} · ${esc(p.language)}</span><p>“${esc(p.text)}”</p><div class="quote-meta"><span>By ${esc(p.author||'Community')}</span><span>${new Date(p.created_at).toLocaleDateString()}</span></div><div class="mini-actions">${user?.id===p.user_id?`<button data-action="edit" data-id="${p.id}">Edit</button><button data-action="delete" data-id="${p.id}">Delete</button>`:''}<button data-action="report" data-id="${p.id}">Report</button></div></article>`).join('')||'<p class="muted">Be the first to share a line ✨</p>';$('#profileName').textContent=profile.display_name||'Love Explorer';if(profile.avatar_url)document.querySelector('.account-card .avatar').innerHTML=`<img src="${esc(profile.avatar_url)}" alt="Profile photo" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;$('#profileStatus').textContent=user?(user.email||user.phone||'Verified account'):'Guest · sign in to sync your account';$('#authBadge').textContent=user?(user.email||user.phone||'Signed in'):'Guest';$('#authOpenBtn').textContent=user?'Account':'Login / Sign up';$('#signOutBtn').hidden=!user}
async function syncPendingPosts(){if(!sb||!user||!navigator.onLine)return;const queue=store.get('pendingPosts',[]);if(!queue.length)return;const remaining=[];for(const item of queue){try{const {queued_at,...post}=item;const {error}=await sb.from('posts').insert(post);if(error){remaining.push(item)} }catch(e){remaining.push(item)}}store.set('pendingPosts',remaining);if(queue.length>remaining.length){toast(`Synced ${queue.length-remaining.length} saved post(s). 💗`)}}
window.addEventListener('online',()=>{setTimeout(async()=>{await syncPendingPosts();await loadRemote()},1200)});
window.addEventListener('tfc:retry-api',async()=>{
  if(!navigator.onLine){toast('You are offline. Connect to the internet first.');return;}
  try{
    if(sb){const {data}=await sb.auth.getSession();user=data.session?.user||user;}
    await syncPendingPosts();
    await loadRemote();
    window.dispatchEvent(new Event('tfc:server-restored'));
    toast('Server connection checked. 💗');
  }catch(e){toast(e.message||'Could not reconnect. Please try again.');}
});
async function loadRemote(){remotePosts=store.get('cachedRemotePosts',[]);if(!sb){render();return}try{const {data,error}=await sb.from('posts').select('*').order('created_at',{ascending:false}).limit(100);if(!error){remotePosts=data||[];store.set('cachedRemotePosts',remotePosts)}}catch(e){console.warn('Posts unavailable; using cached posts',e)}if(user){await syncPendingPosts();try{const f=await sb.from('favorites').select('post_id').eq('user_id',user.id);if(!f.error)remoteFavorites=new Set((f.data||[]).map(x=>x.post_id));const p=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(p.data)profile=p.data;else if(!p.error){const name=user.user_metadata?.display_name||user.email?.split('@')[0]||'Love Explorer';await sb.from('profiles').upsert({id:user.id,display_name:name});profile={display_name:name,bio:''}}}catch(e){console.warn('Profile/favorites unavailable offline',e)}}render()}
function setAppAccess(allowed){document.body.classList.toggle('app-locked',!allowed);$('#welcomeGate').hidden=!!allowed;if(!allowed)window.scrollTo(0,0)}
async function refreshAuth(){if(!sb){setAppAccess(false);return}const {data}=await sb.auth.getSession();user=data.session?.user||null;setAppAccess(!!user);await loadRemote()}
let authMode='signup';
function setAuthMode(mode){authMode=mode;$('#signupFields').hidden=mode!=='signup';$('#loginFields').hidden=mode!=='login';$('#authTitle').textContent=mode==='signup'?'Create your account 💗':'Welcome back 💗';$('#authIntro').textContent=mode==='signup'?'Verify your email once. Then use your password whenever you return.':'Log in with your verified email and password.';$('#authMessage').textContent='';}
$('#showSignup').onclick=()=>setAuthMode('signup');$('#showLogin').onclick=()=>setAuthMode('login');
async function sendSignupOtp(){if(!sb){$('#authMessage').textContent='Supabase setup required.';return}const name=$('#signupName').value.trim(),dob=$('#signupDob').value,gender=$('#signupGender').value,phone=$('#signupPhone').value.trim(),email=$('#signupEmail').value.trim(),password=$('#signupPassword').value;if(!name||!dob||!email||password.length<8){$('#authMessage').textContent='Enter name, birth date, email and a password of at least 8 characters.';return}const {error}=await sb.auth.signInWithOtp({email,options:{shouldCreateUser:true,data:{display_name:name,birth_date:dob,gender,mobile:phone}}});if(error){$('#authMessage').textContent=error.message;return}pendingSignupData={name,dob,gender,phone,email,password};$('#signupOtpArea').hidden=false;$('#authMessage').textContent='6-digit verification code sent to your email. Check inbox and spam.'}
async function verifySignupOtp(){const d=pendingSignupData;if(!d){$('#authMessage').textContent='Please request a new OTP.';return}const token=$('#signupOtp').value.trim();if(token.length!==6){$('#authMessage').textContent='Enter the 6-digit code.';return}const {data,error}=await sb.auth.verifyOtp({email:d.email,token,type:'email'});if(error){$('#authMessage').textContent=error.message;return}const {error:pwError}=await sb.auth.updateUser({password:d.password,data:{display_name:d.name,birth_date:d.dob,gender:d.gender,mobile:d.phone}});if(pwError){$('#authMessage').textContent='Email verified, but password setup failed: '+pwError.message;return}user=data.user;await sb.from('profiles').upsert({id:user.id,display_name:d.name,bio:'',birth_date:d.dob,gender:d.gender,mobile:d.phone});pendingSignupData=null;$('#authDialog').close();setAppAccess(true);await loadRemote();toast('Account created successfully 💗')}
async function loginWithPassword(){const email=$('#loginEmail').value.trim(),password=$('#loginPassword').value;if(!email||!password){$('#authMessage').textContent='Enter your email and password.';return}const {data,error}=await sb.auth.signInWithPassword({email,password});if(error){$('#authMessage').textContent=error.message;return}user=data.user;$('#authDialog').close();setAppAccess(true);await loadRemote();toast('Welcome back 💗')}
$('#signupSendBtn').onclick=sendSignupOtp;$('#signupVerifyBtn').onclick=verifySignupOtp;$('#loginBtn').onclick=loginWithPassword;$('#forgotBtn').onclick=async()=>{const email=$('#loginEmail').value.trim();if(!email){$('#authMessage').textContent='Enter your email first.';return}const {error}=await sb.auth.resetPasswordForEmail(email);$('#authMessage').textContent=error?error.message:'Password reset email sent.'};
async function act(action,id){const line=allLines().find(l=>l.id===id);if(!line)return;if(action==='fav')return toggleFav(id);if(action==='copy'){try{await navigator.clipboard.writeText(line.text);toast('Copied ✨')}catch{toast(line.text)}}if(action==='share'){if(navigator.share){try{await navigator.share({title:'The First Crush ❤️',text:line.text})}catch{}}else toast(line.text)}if(action==='report'){if(!user){toast('Please login to report.');return}const {error}=await sb.from('reports').insert({post_id:id,reporter_id:user.id});toast(error?error.message:'Report submitted. Thank you.')}if(action==='delete'){if(!user)return;if(confirm('Delete your post?')){const {error}=await sb.from('posts').delete().eq('id',id).eq('user_id',user.id);if(error)toast(error.message);else{await loadRemote();toast('Post deleted')}}}if(action==='edit'){if(!user)return;const val=prompt('Edit your pickup line:',line.text);if(val?.trim()){const {error}=await sb.from('posts').update({text:val.trim()}).eq('id',id).eq('user_id',user.id);if(error)toast(error.message);else{await loadRemote();toast('Post updated')}}}}
document.addEventListener('click',e=>{const c=e.target.closest('[data-category]');if(c){selected=c.dataset.category;render();$('#quoteFeed').scrollIntoView({behavior:'smooth'});return}const a=e.target.closest('[data-action]');if(a)act(a.dataset.action,a.dataset.id)});
$('#postForm').addEventListener('submit',async e=>{e.preventDefault();if(!user){$('#authDialog').showModal();toast('Login first to share a post.');return}const text=$('#lineInput').value.trim();if(!text)return;const post={user_id:user.id,author_name:profile.display_name||'Love Explorer',text,category:$('#postCategory').value,language:$('#postLanguage').value};if(!navigator.onLine){const queue=store.get('pendingPosts',[]);queue.push({...post,queued_at:new Date().toISOString()});store.set('pendingPosts',queue);$('#lineInput').value='';toast('Saved on this device. It will sync when you reconnect. 💗');return}try{const {error}=await sb.from('posts').insert(post);if(error){toast(error.message);return}$('#lineInput').value='';await loadRemote();toast('Shared with everyone 💗')}catch(err){toast('Could not connect. Please try again when online.')}});
$('#welcomeLoginBtn').onclick=()=>{setAuthMode('login');$('#authDialog').showModal()};$('#welcomeSignupBtn').onclick=()=>{setAuthMode('signup');$('#authDialog').showModal()};$('#authOpenBtn').onclick=()=>{setAuthMode(user?'login':'signup');$('#authDialog').showModal()};$('#signOutBtn').onclick=async()=>{await sb?.auth.signOut();user=null;remoteFavorites.clear();remotePosts=[];profile={display_name:'Love Explorer',bio:''};setAppAccess(false);render();toast('Signed out')};
$('#profileBtn').onclick=()=>{if(!user){$('#authDialog').showModal();return}$('#nameInput').value=profile.display_name||'';$('#bioInput').value=profile.bio||'';$('#locationInput').value=profile.location||'';$('#profileDialog').showModal()};
$('#profileForm').addEventListener('submit',async e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();if(!user||!sb)return;profile={...profile,display_name:$('#nameInput').value.trim()||'Love Explorer',bio:$('#bioInput').value.trim(),location:$('#locationInput').value.trim()};const uploads=[['avatarInput','avatars','avatar_url'],['coverInput','profile-covers','cover_url']];for(const [inputId,bucket,field] of uploads){const file=$('#'+inputId).files[0];if(!file)continue;if(!file.type.startsWith('image/')){toast('Please choose an image file.');return}if(file.size>5*1024*1024){toast('Each profile image must be 5 MB or smaller.');return}const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase();const path=user.id+'/'+Date.now()+'-'+field+'.'+ext;const up=await sb.storage.from(bucket).upload(path,file,{upsert:true,contentType:file.type});if(up.error){toast(up.error.message);return}profile[field]=sb.storage.from(bucket).getPublicUrl(path).data.publicUrl}const {error}=await sb.from('profiles').upsert({id:user.id,display_name:profile.display_name,bio:profile.bio,location:profile.location,avatar_url:profile.avatar_url||null,cover_url:profile.cover_url||null});if(error)toast(error.message);else{$('#profileDialog').close();render();toast('Profile updated 💖')}});
$('#jumpCategories').onclick=()=>$('#categories').scrollIntoView({behavior:'smooth'});$('#refreshBtn').onclick=()=>{render();toast('Fresh lines ✨')};$('#surpriseBtn').onclick=()=>{let l=allLines()[Math.floor(Math.random()*allLines().length)];alert('💗 '+l.text)};$('#themeBtn').onclick=()=>document.body.classList.toggle('dark');$('#shareAppBtn').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'The First Crush ❤️',url:location.href})}catch{}}else toast('Share your app link')};
if(sb){sb.auth.onAuthStateChange((_event,session)=>{user=session?.user||null;setAppAccess(!!user);loadRemote()});refreshAuth()}else{setAppAccess(false);render();$('#authBadge').textContent='Setup needed';}
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});

// The First Crush: password recovery support
document.getElementById('forgotBtn').onclick = async () => {
  const email = document.getElementById('loginEmail').value.trim();
  const msg = document.getElementById('authMessage');

  if (!email) {
    msg.textContent = 'पहिले आफ्नो email address लेख्नुहोस्।';
    return;
  }

  if (!sb) {
    msg.textContent = 'Supabase configuration जाँच गर्नुहोस्।';
    return;
  }

  msg.textContent = 'Password reset email पठाउँदै...';

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname
  });

  msg.textContent = error
    ? error.message
    : 'Reset email अनुरोध भयो। Inbox र Spam जाँच गर्नुहोस्।';
};
// The First Crush - Password Recovery Form
if (sb) {
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') showPasswordRecoveryForm();
  });
}

function showPasswordRecoveryForm() {
  let box = document.getElementById('passwordRecoveryBox');

  if (!box) {
    box = document.createElement('div');
    box.id = 'passwordRecoveryBox';
    box.innerHTML = `
      <div style="position:fixed;inset:0;background:#000b;
        display:flex;align-items:center;justify-content:center;
        z-index:99999;padding:20px;">
        <div style="background:white;color:#222;padding:25px;
          border-radius:18px;width:100%;max-width:380px;">
          <h2>🔐 Reset Password</h2>
          <p>आफ्नो नयाँ Password राख्नुहोस्।</p>
          <input id="newPassword" type="password"
            placeholder="New Password"
            style="width:100%;padding:12px;margin:10px 0;">
          <input id="confirmNewPassword" type="password"
            placeholder="Confirm Password"
            style="width:100%;padding:12px;margin:10px 0;">
          <p id="recoveryMessage"></p>
          <button id="saveNewPassword"
            style="width:100%;padding:12px;background:#e84ca5;
            color:white;border:0;border-radius:10px;">
            Update Password
          </button>
        </div>
      </div>`;
    document.body.appendChild(box);

    document.getElementById('saveNewPassword').onclick =
      async () => {
        const password =
          document.getElementById('newPassword').value;
        const confirm =
          document.getElementById('confirmNewPassword').value;
        const msg = document.getElementById('recoveryMessage');

        if (password.length < 6) {
          msg.textContent = 'Password कम्तीमा 6 characters हुनुपर्छ।';
          return;
        }

        if (password !== confirm) {
          msg.textContent = 'दुवै Password मिलेनन्।';
          return;
        }

        msg.textContent = 'Updating Password...';

        const { error } = await sb.auth.updateUser({
          password: password
        });

        if (error) {
          msg.textContent = error.message;
          return;
        }

        msg.textContent = 'Password Successfully Updated!';
        setTimeout(() => location.reload(), 1500);
      };
  }
}
