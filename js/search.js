/* Mirage: локальный разбор ситуаций по реальной базе кодексов. Без API, без денег. */
(function () {
  const DATA = window.MIRAGE_DATA || [];
  const CODE_NAME = {uk:"Уголовный кодекс",ak:"Административный кодекс",tk:"Трудовой кодекс",ek:"Этический кодекс",const:"Конституция SA",kk:"Дорожный кодекс",pk:"Процессуальный кодекс",sk:"Судебный кодекс"};
  const SEV = {1:"небольшой",2:"небольшой",3:"средней",4:"тяжкое",5:"особо тяжкое"};
  const SEV_MAX = {1:30,2:30,3:45,4:60,5:75};
  const SUGGEST = ["Что грозит за ограбление?","Штраф за оскорбление гражданского?","Можно ли выйти под залог за убийство?","Что будет за наркотики?","Максимальный рабочий день по ТК?","Что за неповиновение сотруднику?"];
  const STOP = new Set("и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой какие какая какое совсем ним здесь одном один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно нужно при наконец два об другой хоть после над больше тот через эти нас про всего них много разве три эту моя впрочем такую".split(/\s+/));
  const SYNONYMS = {
    убил:["убийство"], убила:["убийство"], замочил:["убийство"], застрелил:["убийство"],
    побил:["побои","избиение"], избил:["побои","избиение"], отметелил:["побои"],
    украл:["кража","хищение"], обокрал:["кража"], свистнул:["кража"],
    ограбил:["ограбление","разбой"], налёт:["разбой"], налет:["разбой"],
    угнал:["угон"], катался:["угон"],
    кинул:["мошенничество"], обманул:["мошенничество"],
    пьяный:["опьянение"], пьяным:["опьянение"], подшофе:["опьянение"],
    ствол:["оружие"], пушка:["оружие"], стволы:["оружие"], пушку:["оружие"],
    дури:["наркотики"], наркотой:["наркотики"], травка:["наркотики"],
    взяточка:["взятка"], откат:["взятка"], подкупил:["взятка"],
    мент:["сотрудник"], коп:["сотрудник"], полицай:["сотрудник"],
    сел:["управление"], гнал:["превышение"], лихачил:["превышение"],
    заложника:["заложник"], террорист:["террор"], взорвал:["террор"],
    банду:["объединение"], опг:["объединение"], группировка:["объединение"],
    форму:["форма"], жетон:["удостоверение"], выговор:["взыскание"],
    уволили:["увольнение"], сократили:["увольнение"], премию:["премия"]
  };
  const norm = s => (s||"").toLowerCase().replace(/ё/g,"е").replace(/[^a-zа-я0-9.\s]/gi," ").replace(/\s+/g," ").trim();
  const tokens = s => norm(s).split(" ").filter(t => t && !STOP.has(t));
  const expand = ts => { const out = new Set(ts); ts.forEach(t => (SYNONYMS[t]||[]).forEach(x => out.add(x))); return [...out]; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const money = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g," ");
  function lev(a,b){const m=a.length,n=b.length;if(Math.abs(m-n)>2)return 9;
    const d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);
    for(let j=0;j<=n;j++)d[0][j]=j;
    for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)
      d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    return d[m][n];}
  function fuzzy(t, vocab){ if(t.length<5) return null; let best=null,d=3;
    for(const w of vocab){ if(Math.abs(w.length-t.length)>2) continue; const dist=lev(t,w); if(dist<d){d=dist;best=w;} } return best; }
  const ART = DATA.map(a => {
    const titleT = tokens(a.title);
    const kwT = expand((a.keywords||[]).map(norm)).flatMap(k => k.split(" ").filter(x=>x));
    const textT = tokens(a.text);
    const all = new Set([...titleT,...kwT,...textT]);
    return {...a, titleT, kwT, textT, all, allArr:[...all]};
  });
  function score(a, qts){ let s=0;
    for(const raw of qts) for(const t of expand([raw])) {
      if(a.titleT.includes(t)) s+=5;
      else if(a.kwT.includes(t)) s+=3;
      else if(a.textT.includes(t)) s+=1;
      else if(fuzzy(t,a.allArr)) s+=2;
    } return s; }
  const INTENTS = [
    {id:"fine",   re:/штраф|сколько денег|бабл|денег/},
    {id:"months", re:/месяц|срок|грозит|наказани|сажают|тюрьм|что будет/},
    {id:"bail",   re:/залог/},
    {id:"mitig",  re:/признани|помощь следстви|смягча|раскаив/}
  ];
  const INTENT_NOTE = {bail:"uk-3-14", mitig:"uk-3-12"};
  const filtered = f => ART.filter(a =>
    (!f.code || a.code===f.code) &&
    (f.scope==="any" || a.scope===f.scope || a.scope==="B") &&
    (!f.wanted || a.severity===f.wanted));
  function analyze(q, f){
    const nq = norm(q), qts = tokens(nq);
    const scored = filtered(f).map(a => ({a, s:score(a,qts)})).filter(x=>x.s>0).sort((x,y)=>y.s-x.s).slice(0,4);
    return {scored, intents: INTENTS.filter(i=>i.re.test(nq)).map(i=>i.id)};
  }
  function quick(q, f){
    const list = filtered(f), nq = norm(q);
    if(!nq) return list;
    const qts = tokens(nq);
    const qn = nq.replace(/[, ]/g,".");
    const num = (qn.match(/(\d+\.\d+|\d+)/)||[])[1];
    return list.map(a => ({a, s:score(a,qts)}))
      .filter(x => (num && (x.a.num===num || x.a.num.startsWith(num+"."))) || norm(x.a.title).includes(nq) || x.s>=3)
      .sort((x,y)=>y.s-x.s).map(x=>x.a);
  }
  const conf = r => Math.min(95, Math.round(100*(1 - 1/(1 + r.s/4))));
  function penaltyBlock(a, intents){
    const p=[];
    if(a.months) p.push("лишение свободы <b>до "+a.months[1]+" мес.</b>");
    if(a.fine)   p.push("штраф <b>"+money(a.fine[1])+" $</b>");
    if(!p.length) return "<p>Санкция — см. текст статьи в кодексе.</p>";
    let head = "Санкция: ";
    if(intents.includes("fine") && a.fine) head = "Про деньги: ";
    if(intents.includes("months") && a.months) head = "Срок: ";
    return "<p>"+head+p.join(" + ")+".</p>";
  }
  function compose(res, raw){
    if(!res.scored.length)
      return "<p>По описанию ["+esc(raw)+"] ничего не нашлось. Переформулируй проще (украл телефон, побил, сел пьяным, мат на улице) или перейди в быстрый поиск по номеру статьи.</p>";
    const top=res.scored[0], rest=res.scored.slice(1), a=top.a, out=[];
    out.push("<p>Похоже на <b>["+esc(a.title)+"]</b> — ст. "+a.num+", "+(CODE_NAME[a.code]||a.code)+", совпадение ~"+conf(top)+"%.</p>");
    out.push(penaltyBlock(a, res.intents));
    if(a.severity>=1) out.push("<p>Приоритет розыска: <b>"+a.severity+"</b> (тяжесть: "+SEV[a.severity]+", потолок до "+SEV_MAX[a.severity]+" мес. по ст. 1.4 УК). Область: "+(a.scope==="F"?"федеральная (F) — разбирают федералы":a.scope==="R"?"региональная (R) — разбирают все уполномоченные органы":"общая")+".</p>");
    if(rest.length) out.push("<p>Также усматривается: "+rest.map(r=>"["+esc(r.a.title)+"] (ст. "+r.a.num+", ~"+conf(r)+"%)").join("; ")+" — проверь, есть ли в описании их признаки.</p>");
    for(const id of res.intents){ const n=INTENT_NOTE[id]; if(!n) continue;
      const ia = ART.find(x=>x.id===n);
      if(ia) out.push("<p>По смежному вопросу: ст. "+ia.num+" ["+esc(ia.title)+"]: "+esc(ia.text)+"</p>"); }
    out.push("<p>Это автоподбор статей по ключевым словам, а не консультация юриста. Точная формулировка — в кодексе на форуме.</p>");
    return out.join("");
  }
  const $ = s => document.querySelector(s);
  const state = {mode:"sit", code:"", scope:"any", wanted:0};
  let lastRes = null;
  const card = a => "<article class=\"card\"><div class=\"row\"><span class=\"badge\">"+(CODE_NAME[a.code]||a.code)+"</span><span class=\"num\">ст. "+a.num+"</span>"+(a.scope!=="B"?"<span class=\"chip\">"+a.scope+"</span>":"")+(a.severity>=1?"<span class=\"chip sev"+a.severity+"\">розск "+a.severity+"</span>":"")+"</div><h3>"+esc(a.title)+"</h3><p>"+esc(a.text)+"</p>"+(a.months?"<p class=\"pen\">Срок: до "+a.months[1]+" мес.</p>":"")+(a.fine?"<p class=\"pen\">Штраф: "+money(a.fine[1])+" $</p>":"")+"</article>";
  function renderGrid(){
    const g = $("#results");
    if(state.mode==="sit" && lastRes){ g.innerHTML = lastRes.scored.map(x=>card(x.a)).join(""); return; }
    const list = state.mode==="quick" ? quick($("#q").value, state) : filtered(state);
    g.innerHTML = list.length ? list.map(card).join("")
      : "<p class=\"hint\">Пусто: в этом кодексе база ещё наполняется (скинь PDF — добавим) или фильтры слишком строгие.</p>";
  }
  function runSit(){
    const raw = $("#sit").value.trim(); if(!raw) return;
    lastRes = analyze(raw, state);
    const box = $("#answer"); box.hidden = false; box.innerHTML = compose(lastRes, raw);
    renderGrid(); box.scrollIntoView({behavior:"smooth", block:"nearest"});
  }
  const tabs = $("#codes");
  [["", "Все"]].concat(Object.entries(CODE_NAME)).forEach(function(e){
    const b=document.createElement("button"); b.textContent=e[1]; b.dataset.code=e[0];
    if(!e[0]) b.classList.add("on");
    b.onclick=function(){ state.code=e[0]; lastRes=null; $("#answer").hidden=true;
      tabs.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b)); renderGrid(); };
    tabs.appendChild(b);
  });
  SUGGEST.forEach(function(q){ const b=document.createElement("button"); b.textContent=q;
    b.onclick=function(){ $("#sit").value=q; runSit(); }; $("#chips").appendChild(b); });
  document.querySelectorAll(".mode-btn").forEach(b=>b.onclick=function(){
    state.mode=b.dataset.mode; lastRes=null; $("#answer").hidden=true;
    document.querySelectorAll(".mode-btn").forEach(x=>x.classList.toggle("on",x===b));
    $("#panel-sit").hidden = state.mode!=="sit"; $("#panel-quick").hidden = state.mode!=="quick";
    renderGrid(); });
  document.querySelectorAll("#scope button").forEach(b=>b.onclick=function(){
    state.scope=b.dataset.scope; lastRes=null;
    document.querySelectorAll("#scope button").forEach(x=>x.classList.toggle("on",x===b)); renderGrid(); });
  $("#wanted").onchange = function(e){ state.wanted=+e.target.value; lastRes=null; renderGrid(); };
  $("#q").oninput = function(){ renderGrid(); };
  $("#go").onclick = runSit;
  $("#sit").onkeydown = function(e){ if(e.ctrlKey && e.key==="Enter") runSit(); };
  renderGrid();
})();