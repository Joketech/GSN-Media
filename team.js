'use strict';
/* Team: sign-in, workspaces and roles. A workspace is one person's or team's own space with its own designs,
   review queue, Postiz account, live switches and agent keys. Until accounts are switched on, the studio is single-owner. */
const Team=(()=>{
 const {$,$$,esc,api,toast}=App;
 const T={enabled:false,signedIn:false,me:null,workspaces:[],users:[],active:'',role:null,newKey:null};
 const ROLE={manager:'Manager',editor:'Editor'};
 const isAdmin=()=>!!T.me?.admin;
 const active=()=>T.workspaces.find(w=>w.id===T.active)||T.workspaces[0]||null;
 const canManage=()=>isAdmin()||active()?.role==='manager';

 /* ---------- start-up and sign-in ---------- */
 async function boot(){
  let st;try{st=await api('/accounts/status')}catch{return true}
  T.enabled=st.enabled;T.signedIn=st.signed_in;
  if(!T.enabled)return true;
  if(!T.signedIn){showLogin();return false}
  await loadMe();return true;
 }
 async function loadMe(){
  const r=await api('/accounts/me');T.me=r.user;T.workspaces=r.workspaces;T.role=r.role;
  let saved='';try{saved=localStorage.getItem('gsn_ws')||''}catch{}
  T.active=T.workspaces.some(w=>w.id===saved)?saved:r.active||T.workspaces[0]?.id||'';
  App.setWorkspace(T.active);document.body.dataset.role=T.role||'';
 }
 function needLogin(){if(T.enabled&&T.signedIn){T.signedIn=false;showLogin()}}
 function showLogin(message=''){
  document.body.classList.remove('portal-open');
  let root=$('#loginRoot');if(!root){root=document.createElement('div');root.id='loginRoot';root.className='login-root';document.body.append(root)}
  root.hidden=false;
  root.innerHTML=`<form class="login-card glass-strong" id="loginForm"><span class="brand-mark">g.</span><h1>Sign in</h1><p class="hint">Use the username and password your studio administrator gave you.</p>
   <label class="field">Username<input name="username" autocomplete="username" required autofocus></label>
   <label class="field">Password<input name="password" type="password" autocomplete="current-password" required></label>
   <p class="hint login-msg" id="loginMsg" role="alert">${esc(message)}</p><button class="btn-maroon" type="submit">Sign in</button></form>`;
  $('#loginForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),b=e.submitter;b.disabled=true;
   try{await api('/accounts/login',{method:'POST',body:{username:f.get('username'),password:f.get('password')}});location.reload()}
   catch(err){$('#loginMsg').textContent=err.message;b.disabled=false}};
 }
 async function signOut(){try{await api('/accounts/logout',{method:'POST',body:{}})}catch{}location.reload()}

 /* ---------- account menu pieces ---------- */
 const initial=()=>esc((T.me?.name||'g').trim().charAt(0).toLowerCase()||'g');
 function menuHtml(){
  if(!T.enabled)return '';
  return `<p class="pop-title">${esc(T.me?.name||'')}${T.me?.admin?' · administrator':''}</p>`+T.workspaces.map(w=>`<button data-ws="${esc(w.id)}" class="${w.id===T.active?'on':''}">${w.id===T.active?'✓ ':''}${esc(w.name)}<small> ${esc(ROLE[w.role]||'')}</small></button>`).join('')+'<hr>';
 }
 const signOutHtml=()=>T.enabled?'<hr><button data-team="signout">Sign out</button>':'';

 /* ---------- Team page ---------- */
 async function load(){
  if(!T.enabled){T.workspaces=[];return}
  await loadMe();
  const r=await api('/accounts/workspaces');T.workspaces=r.workspaces;
  T.users=isAdmin()?(await api('/accounts/users')).users:[];
 }
 function html(){
  if(!T.enabled)return setupCard();
  const w=active();if(!w)return `<div class="team glass"><h2>No workspace yet</h2><p class="lead">An administrator needs to add you to a workspace.</p></div>`;
  return `<div class="team">
   <div class="team-head"><div><h1>${esc(w.name)}</h1><p class="lead">You are ${w.role==='manager'?'a manager':'an editor'} here. ${w.role==='manager'?'Managers approve and post, and manage this workspace.':'Editors create and edit; a manager approves before anything is posted.'}</p></div>
    ${T.workspaces.length>1?`<label class="field">Workspace<select data-team-switch>${T.workspaces.map(x=>`<option value="${esc(x.id)}" ${x.id===w.id?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label>`:''}</div>
   ${canManage()?postizCard(w)+membersCard(w)+keysCard(w):''}
   ${isAdmin()?workspacesCard()+peopleCard():''}
   ${passwordCard()}</div>`;
 }
 const setupCard=()=>`<div class="team"><div class="team-card glass"><h2>Let other people use this studio</h2>
  <p class="lead">Right now the studio has one owner. Turn on accounts to give each person or team their own sign-in and workspace. Every workspace gets its own designs, review queue, Postiz account and live switches. You become the administrator.</p>
  <form data-team-form="setup"><label class="field">Your username<input name="username" autocomplete="username" required minlength="3"></label><label class="field">Your name<input name="name" required></label>
  <label class="field">Password (10 or more characters)<input name="password" type="password" autocomplete="new-password" required minlength="10"></label>
  <p class="hint">Your current designs and schedule stay in the Main workspace. The shared agent key keeps working for Main only.</p><button class="btn-maroon" type="submit">Turn on accounts</button></form></div></div>`;
 function postizCard(w){return `<div class="team-card glass"><h2>Postiz connection</h2>
  <p class="lead">${w.postiz_configured?'This workspace posts through its own Postiz account.':'Connect this workspace to a Postiz account so approved posts can be sent. Each workspace can use a different Postiz account and different social profiles.'}</p>
  <form data-team-form="postiz"><label class="field">Postiz API address<input name="url" placeholder="https://postiz.example.com/api/public/v1" value="${esc(w.postiz_url||'')}" required></label>
  <label class="field">Postiz API key<input name="key" type="password" autocomplete="off" placeholder="${w.postiz_configured?'Saved. Leave blank to keep it.':'Paste the key from Postiz settings'}"></label>
  <div class="team-row"><button class="btn-maroon" type="submit">Save connection</button>${w.postiz_configured?'<button class="btn-light" type="button" data-team="postiz-test">Test connection</button><button class="btn-light" type="button" data-team="postiz-remove">Disconnect</button>':''}</div></form></div>`}
 function membersCard(w){return `<div class="team-card glass"><h2>People in this workspace</h2>
  <div class="team-list">${(w.members||[]).map(m=>`<div class="team-item"><div><b>${esc(m.name||m.username)}</b><small>${esc(m.username||'')} · ${esc(ROLE[m.role]||m.role)}</small></div><button class="btn-light" data-team="member-remove" data-user="${esc(m.user_id)}">Remove</button></div>`).join('')||'<p class="hint">Nobody yet.</p>'}</div>
  <form data-team-form="member" class="team-row"><label class="field">Username<input name="username" required placeholder="an existing account"></label><label class="field">Role<select name="role"><option value="editor">Editor</option><option value="manager">Manager</option></select></label><button class="btn-light" type="submit">Add</button></form>
  <p class="hint">Accounts are created by an administrator. Editors prepare work; managers approve and post.</p></div>`}
 function keysCard(w){return `<div class="team-card glass"><h2>Agent keys</h2>
  <p class="lead">Give each agent its own key. A key works only inside this workspace: agents can research, create and queue posts for review, but never approve or switch posting on.</p>
  ${T.newKey?`<div class="team-key"><b>New key for ${esc(T.newKey.name)}</b><code>${esc(T.newKey.token)}</code><small>Copy it now. It is shown once and cannot be recovered. Send it to the agent as <code>Authorization: Bearer …</code>.</small><button class="btn-light" data-team="copy-key">Copy</button></div>`:''}
  <div class="team-list">${(w.tokens||[]).map(t=>`<div class="team-item"><div><b>${esc(t.name)}</b><small>Created ${esc(new Date(t.created_at).toLocaleDateString())} · ${t.last_used?'last used '+esc(new Date(t.last_used).toLocaleString()):'not used yet'}</small></div><button class="btn-light" data-team="key-revoke" data-id="${esc(t.id)}">Revoke</button></div>`).join('')||'<p class="hint">No keys yet.</p>'}</div>
  <form data-team-form="key" class="team-row"><label class="field">Agent name<input name="name" required placeholder="Hermes" maxlength="60"></label><button class="btn-light" type="submit">Create key</button></form></div>`}
 const workspacesCard=()=>`<div class="team-card glass"><h2>All workspaces</h2><div class="team-list">${T.workspaces.map(w=>`<div class="team-item"><div><b>${esc(w.name)}</b><small>${esc(w.id)} · Postiz ${w.postiz_configured?'connected':'not connected'}</small></div>${w.id!=='main'?`<button class="btn-light" data-team="ws-delete" data-id="${esc(w.id)}">Delete</button>`:''}</div>`).join('')}</div>
  <form data-team-form="workspace" class="team-row"><label class="field">New workspace<input name="name" required maxlength="60" placeholder="Client or team name"></label><button class="btn-light" type="submit">Create</button></form></div>`;
 const peopleCard=()=>`<div class="team-card glass"><h2>Accounts</h2><div class="team-list">${T.users.map(u=>`<div class="team-item"><div><b>${esc(u.name)}${u.admin?' · administrator':''}${u.disabled?' · disabled':''}</b><small>${esc(u.username)} · ${u.memberships.map(m=>esc((T.workspaces.find(w=>w.id===m.ws)?.name||m.ws)+' ('+(ROLE[m.role]||m.role)+')')).join(', ')||'no workspace'}</small></div>
  <div class="team-row"><button class="btn-light" data-team="user-reset" data-id="${esc(u.id)}">New password</button>${u.id!==T.me.id?`<button class="btn-light" data-team="user-toggle" data-id="${esc(u.id)}" data-disabled="${u.disabled?'0':'1'}">${u.disabled?'Enable':'Disable'}</button>`:''}</div></div>`).join('')}</div>
  <form data-team-form="user"><div class="team-row"><label class="field">Username<input name="username" required minlength="3" autocomplete="off"></label><label class="field">Name<input name="name" required></label></div>
  <div class="team-row"><label class="field">Password (10+)<input name="password" type="text" required minlength="10" autocomplete="off"></label><label class="field">Workspace<select name="workspace"><option value="">None yet</option>${T.workspaces.map(w=>`<option value="${esc(w.id)}">${esc(w.name)}</option>`).join('')}</select></label><label class="field">Role<select name="role"><option value="editor">Editor</option><option value="manager">Manager</option></select></label></div>
  <button class="btn-light" type="submit">Create account</button><p class="hint">Share the password privately. They can change it themselves below.</p></form></div>`;
 const passwordCard=()=>`<div class="team-card glass"><h2>Your password</h2><form data-team-form="password" class="team-row"><label class="field">Current<input name="current" type="password" autocomplete="current-password" required></label><label class="field">New (10+)<input name="password" type="password" autocomplete="new-password" required minlength="10"></label><button class="btn-light" type="submit">Change</button></form></div>`;

 /* ---------- actions ---------- */
 async function refresh(){await load();if($('#view'))$('#view').innerHTML=html()}
 async function submit(kind,f){
  const v=Object.fromEntries(new FormData(f)),w=active();
  if(kind==='setup'){await api('/accounts/setup',{method:'POST',body:v});toast('Accounts are on. Signing you in…');setTimeout(()=>location.reload(),700);return}
  if(kind==='postiz'){await api(`/accounts/workspaces/${w.id}/postiz`,{method:'PUT',body:v});toast('Postiz connection saved.')}
  else if(kind==='member'){await api(`/accounts/workspaces/${w.id}/members`,{method:'POST',body:v});toast('Added.')}
  else if(kind==='key'){T.newKey=await api(`/accounts/workspaces/${w.id}/tokens`,{method:'POST',body:v})}
  else if(kind==='workspace'){await api('/accounts/workspaces',{method:'POST',body:v});toast('Workspace created.')}
  else if(kind==='user'){await api('/accounts/users',{method:'POST',body:v});toast('Account created.')}
  else if(kind==='password'){await api('/accounts/password',{method:'POST',body:v});toast('Password changed.')}
  f.reset();await refresh();
 }
 async function click(t){
  const a=t.dataset.team,w=active();
  if(a==='signout')return signOut();
  if(a==='copy-key'){try{await navigator.clipboard.writeText(T.newKey.token);toast('Key copied.')}catch{toast('Select the key and copy it.')}return}
  if(a==='postiz-test'){const r=await api(`/publish/test`,{method:'POST',body:{}});toast(r.message,5000);return}
  if(a==='postiz-remove'){if(!confirm('Disconnect Postiz from this workspace? Scheduled posts will stay but cannot send.'))return;await api(`/accounts/workspaces/${w.id}/postiz`,{method:'DELETE'})}
  else if(a==='member-remove'){await api(`/accounts/workspaces/${w.id}/members/${t.dataset.user}`,{method:'DELETE'})}
  else if(a==='key-revoke'){if(!confirm('Revoke this key? The agent using it stops working immediately.'))return;await api(`/accounts/workspaces/${w.id}/tokens/${t.dataset.id}`,{method:'DELETE'});T.newKey=null}
  else if(a==='ws-delete'){if(!confirm('Delete this workspace and its people and keys? Its designs and posts stay on the server but are no longer reachable.'))return;await api(`/accounts/workspaces/${t.dataset.id}`,{method:'DELETE'})}
  else if(a==='user-toggle'){await api(`/accounts/users/${t.dataset.id}`,{method:'PATCH',body:{disabled:t.dataset.disabled==='1'}})}
  else if(a==='user-reset'){const pw=prompt('New password for this person (10 or more characters):');if(!pw)return;await api(`/accounts/users/${t.dataset.id}`,{method:'PATCH',body:{password:pw}});toast('Password changed. They are signed out everywhere.');return}
  else return;
  await refresh();
 }
 function wire(root){
  document.addEventListener('submit',e=>{const f=e.target.closest('[data-team-form]');if(!f)return;e.preventDefault();submit(f.dataset.teamForm,f).catch(err=>toast(err.message,6000))});
  document.addEventListener('change',e=>{const s=e.target.closest('[data-team-switch]');if(s){App.setWorkspace(s.value);location.reload()}});
  document.addEventListener('click',e=>{
   const sw=e.target.closest('[data-ws]');if(sw){App.setWorkspace(sw.dataset.ws);location.reload();return}
   const t=e.target.closest('[data-team]');if(t)click(t).catch(err=>toast(err.message,6000));
  });
 }
 return {boot,needLogin,load,html,wire,menuHtml,signOutHtml,initial,get enabled(){return T.enabled},get active(){return T.active},get role(){return active()?.role||(T.enabled?null:'manager')},get workspaceName(){return active()?.name||''}};
})();
