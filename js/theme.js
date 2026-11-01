/* Mirage: редактор дизайна v2. Панель управляется через style.display (fixed-bag с hidden). */
(function(){
  const DEF={bg:"#0b1220",panel:"#111a2e",line:"#243247",txt:"#e5e7eb",mut:"#94a3b8",acc:"#10b981",radius:"12",font:"15"};
  const PRESETS={
    dark:DEF,
    light:{bg:"#f5f7fa",panel:"#ffffff",line:"#d7dde6",txt:"#111827",mut:"#5b6472",acc:"#0e9f6e",radius:"12",font:"15"},
    neon:{bg:"#05010d",panel:"#120826",line:"#3b2a63",txt:"#e9e4ff",mut:"#9d8fd0",acc:"#00e5a0",radius:"16",font:"15"},
    paper:{bg:"#efe9df",panel:"#faf7f0",line:"#c9c0b0",txt:"#2b2620",mut:"#6d6455",acc:"#b4552d",radius:"8",font:"16"}
  };
  const K=Object.keys(DEF);
  const $=s=>document.querySelector(s);
  function apply(t){const r=document.documentElement.style;
    r.setProperty("--bg",t.bg);r.setProperty("--panel",t.panel);r.setProperty("--line",t.line);
    r.setProperty("--txt",t.txt);r.setProperty("--mut",t.mut);r.setProperty("--acc",t.acc);
    r.setProperty("--radius",(t.radius||12)+"px");r.setProperty("--font",(t.font||15)+"px");
    const bf=$("#bgfix"); if(bf) bf.style.background=t.bg;
    K.forEach(k=>{const el=$("#th-"+k);if(el&&document.activeElement!==el)el.value=t[k];});}
  function read(){const t={};K.forEach(k=>{const el=$("#th-"+k);t[k]=el?el.value:DEF[k];});return t;}
  function save(t){try{localStorage.setItem("mirage-theme",JSON.stringify(t));}catch(e){}}
  function load(){try{
      const h=location.hash.match(/theme=([A-Za-z0-9+/=]+)/);
      if(h) return Object.assign({},DEF,JSON.parse(atob(h[1])));
      const s=localStorage.getItem("mirage-theme");
      if(s) return Object.assign({},DEF,JSON.parse(s));
    }catch(e){}
    return DEF;}
  const enc=t=>btoa(JSON.stringify(t));
  function copyText(s,msg){
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s).then(()=>alert(msg),()=>prompt(msg+" (Ctrl+C, затем Enter):",s));}
    else prompt(msg+" (Ctrl+C, затем Enter):",s);}
  document.addEventListener("DOMContentLoaded",function(){
    let t=load(); apply(t);
    const panel=$("#design-panel");
    K.forEach(k=>{const el=$("#th-"+k);if(el)el.addEventListener("input",function(){t=read();apply(t);save(t);});});
    $("#design-btn").onclick=function(){panel.style.display=(panel.style.display==="grid")?"none":"grid";};
    $("#th-close").onclick=function(){panel.style.display="none";};
    document.querySelectorAll("#presets button").forEach(b=>b.onclick=function(){
      t=Object.assign({},PRESETS[b.dataset.preset]||DEF);apply(t);save(t);});
    $("#th-copy").onclick=function(){copyText(enc(read()),"Код настроек скопирован — кидай пацанам");};
    $("#th-share").onclick=function(){copyText(location.href.split("#")[0]+"#theme="+enc(read()),"Ссылка с темой скопирована");};
    $("#th-paste").onclick=function(){const s=prompt("Вставь код настроек:");if(!s)return;
      try{t=Object.assign({},DEF,JSON.parse(atob(s.trim())));apply(t);save(t);}catch(e){alert("Не распознал код");}};
    $("#th-reset").onclick=function(){t=DEF;apply(t);save(t);};
  });
})();