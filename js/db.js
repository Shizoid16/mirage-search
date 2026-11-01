/* Mirage: аккаунты и история. Локально работает сразу; общая база — через CF Worker (DB_URL). */
window.MirageDB = (function(){
  const DB_URL = ""; // <-- сюда вставь URL воркера: "https://mirage-db.ТВОЙ-НИК.workers.dev"
  const LS_U="mirage-users", LS_S="mirage-session", LS_H="mirage-history";
  let session=null, mode="login";
  const $=s=>document.querySelector(s);
  const lsGet=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}};
  const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
  function dumb(s){let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))|0;return "d"+(h>>>0).toString(16);}
  function sha(s){ if(window.crypto&&crypto.subtle){return crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)).then(b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""));} return Promise.resolve(dumb(s)); }
  async function api(path,opts){ opts=opts||{}; opts.headers=Object.assign({"content-type":"application/json"},opts.headers||{});
    if(session&&session.token) opts.headers["authorization"]="Bearer "+session.token;
    const r=await fetch(DB_URL+path,opts); const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||("HTTP "+r.status)); return j; }
  const remote=()=>!!DB_URL;
  function who(){ return session? session.login : "guest"; }
  async function register(login,pass){
    login=(login||"").toLowerCase().trim();
    if(remote()){ await api("/register",{method:"POST",body:JSON.stringify({login,pass})}); return login_(login,pass); }
    const users=lsGet(LS_U,{});
    if(users[login]) throw new Error("Логин занят");
    if(!/^[a-z0-9_]{3,20}$/.test(login)) throw new Error("Логин: 3-20, латиница/цифры/_");
    if((pass||"").length<6) throw new Error("Пароль от 6 символов");
    const salt=Math.random().toString(36).slice(2);
    users[login]={salt:salt,hash:await sha(salt+pass)}; lsSet(LS_U,users);
    return login_(login,pass);
  }
  async function login_(login,pass){
    login=(login||"").toLowerCase().trim();
    if(remote()){ const j=await api("/login",{method:"POST",body:JSON.stringify({login,pass})});
      session={login:j.login,token:j.token}; }
    else{ const u=lsGet(LS_U,{})[login];
      if(!u||u.hash!==await sha(u.salt+pass)) throw new Error("Неверный логин или пароль");
      session={login:login,token:null}; }
    lsSet(LS_S,session); renderAuth(); return session;
  }
  function logout(){ session=null; localStorage.removeItem(LS_S); renderAuth(); $("#hist-panel").style.display="none"; }
  function log(q,top){
    const list=lsGet(LS_H,{}); const key=who();
    list[key]=list[key]||[]; list[key].unshift({ts:Date.now(),q:q.slice(0,300),top:top});
    list[key]=list[key].slice(0,100); lsSet(LS_H,list);
    if(remote()&&session&&session.token){ api("/history",{method:"POST",body:JSON.stringify({q:q,top:top})}).catch(()=>{}); }
  }
  async function history(){
    if(remote()&&session&&session.token){ try{ return await api("/history"); }catch(e){} }
    return (lsGet(LS_H,{})[who()]||[]);
  }
  function renderAuth(){
    const auth=$("#auth"), ub=$("#userbox");
    if(session){ auth.style.display="none"; ub.style.display="inline"; $("#uname").textContent=session.login; }
    else{ auth.style.display="inline"; ub.style.display="none"; }
  }
  async function renderHist(){
    const h=await history(); const box=$("#hist-list");
    box.innerHTML = h.length? h.map(e=>"<div class=\"hitem\" data-q=\""+e.q.replace(/"/g,"&quot;")+"\"><div class=\"d\">"+new Date(e.ts).toLocaleString()+" · "+e.top+"</div>"+e.q+"</div>").join("") : "<p class=\"hint\">История пуста. Разбери ситуацию — запрос появится здесь.</p>";
    box.querySelectorAll(".hitem").forEach(el=>el.onclick=function(){
      $("#hist-panel").style.display="none";
      if(window.MirageRun) MirageRun(el.dataset.q); });
  }
  document.addEventListener("DOMContentLoaded",function(){
    session=lsGet(LS_S,null); renderAuth();
    const modal=$("#modal");
    const open=m=>{ mode=m; $("#m-title").textContent=(m==="login"?"Вход":"Регистрация");
      $("#m-go").textContent=(m==="login"?"Войти":"Создать"); $("#m-err").textContent=""; modal.style.display="block"; };
    $("#btn-login").onclick=()=>open("login");
    $("#btn-reg").onclick=()=>open("reg");
    $("#m-switch").onclick=()=>open(mode==="login"?"reg":"login");
    $("#m-go").onclick=async function(){
      const l=$("#m-login").value, p=$("#m-pass").value;
      try{ if(mode==="reg") await register(l,p); else await login_(l,p); modal.style.display="none"; }
      catch(e){ $("#m-err").textContent=e.message; } };
    $("#btn-logout").onclick=logout;
    $("#btn-hist").onclick=async function(){ const p=$("#hist-panel");
      if(p.style.display==="block"){ p.style.display="none"; } else { await renderHist(); p.style.display="block"; } };
  });
  return {log:log, history:history, who:who};
})();