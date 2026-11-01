/* Mirage: редактор дизайна. Хранение в localStorage, шеринг ссылкой #theme=... */
(function(){
  const DEF={bg:"#0b1220",panel:"#111a2e",line:"#243247",txt:"#e5e7eb",mut:"#94a3b8",acc:"#10b981",radius:"12",font:"15"};
  const K=Object.keys(DEF);
  const $=s=>document.querySelector(s);
  function apply(t){const r=document.documentElement.style;
    r.setProperty("--bg",t.bg);r.setProperty("--panel",t.panel);r.setProperty("--line",t.line);
    r.setProperty("--txt",t.txt);r.setProperty("--mut",t.mut);r.setProperty("--acc",t.acc);
    r.setProperty("--radius",(t.radius||12)+"px");r.setProperty("--font",(t.font||15)+"px");
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
    K.forEach(k=>{const el=$("#th-"+k);if(el)el.addEventListener("input",function(){t=read();apply(t);save(t);});});
    $("#design-btn").onclick=function(){const p=$("#design-panel");p.hidden=!p.hidden;};
    $("#th-copy").onclick=function(){copyText(enc(read()),"Код настроек скопирован — кидай пацанам");};
    $("#th-share").onclick=function(){copyText(location.href.split("#")[0]+"#theme="+enc(read()),"Ссылка с темой скопирована");};
    $("#th-paste").onclick=function(){const s=prompt("Вставь код настроек:");if(!s)return;
      try{t=Object.assign({},DEF,JSON.parse(atob(s.trim())));apply(t);save(t);}catch(e){alert("Не распознал код");}};
    $("#th-reset").onclick=function(){t=DEF;apply(t);save(t);};
  });
})();