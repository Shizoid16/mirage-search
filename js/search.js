/* Mirage v4: разбор ситуации по кускам + обстоятельства + залог + прозрачность. */
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
    гнал:["превышение"], лихачил:["превышение"],
    заложника:["заложник"], взорвал:["террор"],
    банду:["объединение"], опг:["объединение"], группировка:["объединение"],
    жетон:["удостоверение"], выговор:["взыскание"],
    уволили:["увольнение"], сократили:["увольнение"], премию:["премия"]
  };
  const QUALS = [
    {re:/ствол|оружи|пушк[ауи]|нож|пистолет|автомат/, t:"применение оружия — отягчающее (ст. 3.4 УК), санкция ближе к верхнему пределу"},
    {re:/групп|вдво|втро|с пацанами|с друзьями|компанией|сообща/, t:"совершение группой лиц — отягчающее (ст. 3.4 УК)"},
    {re:/повторн|рецидив|второй раз|уже судим|раньше сидел/, t:"повторность — отягчающее (ст. 3.4 УК)"},
    {re:/\bкоп[ауоам]?\b|\bмент[ауоам]?\b|сотрудник|полицей|должност|служив/, t:"деяние в отношении сотрудника — смотри главы 10-11 УК"},
    {re:/жесток|издева|пытал|мучил/, t:"особая жестокость — отягчающее (ст. 3.4 УК)"},
    {re:/сдался|повинн|признал|раскаял|помог следстви|возместил|компенсир|загладил/, t:"признание / содействие следствию — смягчение до половины санкции (ст. 3.3, 3.12, 3.13 УК)"},
    {re:/пьян|подшофе|под вещества/, t:"состояние опьянения — суд учитывает как контекст"}
  ];
  const NO_BAIL = new Set(["4.1","4.2","4.3","4.6","5.1","5.5","6.8","8.1","8.3","8.5","8.7","8.12","8.14","10.2","10.6","10.9","10.14","11.4","11.6","11.7","11.11","12.1","12.2","12.3","12.4","12.5","13.1"]);
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
  function score(a, qts){ let s=0; const hits=[];
    for(const raw of qts) for(const t of expand([raw])) {
      if(a.titleT.includes(t)){ s+=5; hits.push(t); }
      else if(a.kwT.includes(t)){ s+=3; hits.push(t); }
      else if(a.textT.includes(t)){ s+=1; hits.push(t); }
      else { const f=fuzzy(t,a.allArr); if(f){ s+=2; hits.push(f); } }
    } return {s, hits}; }
  const INTENTS = [
    {id:"fine",   re:/штраф|сколько денег|бабл|денег/},
    {id:"months", re:/месяц|срок|грозит|наказани|сажают|тюрьм|что будет/},
    {id:"bail",   re:/залог/},
    {id:"mitig",  re:/признани|помощь следстви|смягча|раскаив/}
  ];
  const INTENT_NOTE = {mitig:"uk-3-12"};
  const filtered = f => ART.filter(a =>
    (!f.code || a.code===f.code) &&
    (f.scope==="any" || a.scope===f.scope || a.scope==="B") &&
    (!f.wanted || a.severity===f.wanted));
  function analyzeAll(raw, f){
    const clauses = raw.split(/[;,\n]+|\s+и\s+|\s+плюс\s+|\s+а также\s+/i).map(s=>s.trim()).filter(s=>tokens(s).length>0);
    const crimes=[]; const seen={};
    (clauses.length?clauses:[raw]).forEach(cl=>{
      const qts=tokens(cl);
      const top=filtered(f).map(a=>({a,r:score(a,qts)})).filter(x=>x.r.s>=3).sort((x,y)=>y.r.s-x.r.s)[0];
      if(top&&!seen[top.a.id]){seen[top.a.id]=1;crimes.push(top);}
    });
    if(!crimes.length){
      const qts=tokens(raw);
      crimes.push(...filtered(f).map(a=>({a,r:score(a,qts)})).filter(x=>x.r.s>0).sort((x,y)=>y.r.s-x.r.s).slice(0,3));
    }
    const nq=norm(raw);
    return {crimes:crimes.slice(0,4), intents:INTENTS.filter(i=>i.re.test(nq)).map(i=>i.id),
            quals:QUALS.filter(q=>q.re.test(nq)), multi:(clauses.length>1&&crimes.length>1)};
  }
  function quick(q, f){
    const list = filtered(f), nq = norm(q);
    if(!nq) return list;
    const qts = tokens(nq);
    const qn = nq.replace(/[, ]/g,".");
    const num = (qn.match(/(\d+\.\d+|\d+)/)||[])[1];
    return list.map(a => ({a, r:score(a,qts)}))
      .filter(x => (num && (x.a.num===num || x.a.num.startsWith(num+"."))) || norm(x.a.title).includes(nq) || x.r.s>=3)
      .sort((x,y)=>y.r.s-x.r.s).map(x=>x.a);
  }
  const conf = r => Math.min(95, Math.round(100*(1 - 1/(1 + r.s/4))));
  function penaltyLine(a){
    const p=[];
    if(a.months) p.push("лишение свободы <b>до "+a.months[1]+" мес.</b>");
    if(a.fine)   p.push("штраф <b>"+money(a.fine[1])+" $</b>");
    return p.length? p.join(" + ") : "санкция — см. текст статьи";
  }
  function compose(res, raw){
    if(!res.crimes.length)
      return "<p>По описанию ["+esc(raw)+"] ничего не нашлось. Переформулируй проще (украл телефон, побил, мат на улице) или перейди в быстрый поиск по номеру статьи.</p>";
    const out=[]; const top=res.crimes[0], a=top.a;
    out.push("<p><b>1. Квалификация.</b> Похоже на <b>["+esc(a.title)+"]</b> — ст. "+a.num+", "+(CODE_NAME[a.code]||a.code)+", совпадение ~"+conf(top.r)+"%.</p>");
    out.push("<p class=\"why\">Поймано по словам: "+[...new Set(top.r.hits)].slice(0,8).join(", ")+"</p>");
    out.push("<p><b>2. Санкция.</b> "+penaltyLine(a)+".</p>");
    if(a.severity>=1) out.push("<p><b>3. Розыск и область.</b> Приоритет розыска <b>"+a.severity+"</b> (тяжесть: "+SEV[a.severity]+", потолок до "+SEV_MAX[a.severity]+" мес., ст. 1.4 УК). Область: "+(a.scope==="F"?"федеральная (F) — разбирают федералы":a.scope==="R"?"региональная (R) — разбирают все уполномоченные органы":"общая")+".</p>");
    if(res.crimes.length>1){
      out.push("<p><b>4. Совокупность (ст. 1.6 УК).</b> В описании усматриваются и другие составы: "+res.crimes.slice(1).map(c=>"["+esc(c.a.title)+"] ст. "+c.a.num+" ("+penaltyLine(c.a)+")").join("; ")+". Ответственность — по каждой статье отдельно.</p>");
    }
    if(res.quals.length) out.push("<p><b>5. Обстоятельства.</b> "+res.quals.map(q=>q.t).join("; ")+".</p>");
    if(res.intents.includes("bail")){
      const c=res.crimes.find(x=>x.a.severity>=1);
      if(c) out.push("<p class=\"note\"><b>Про залог:</b> "+(NO_BAIL.has(c.a.num)
        ? "НЕТ — ст. "+c.a.num+" входит в список исключений (ст. 3.14 УК): залог не применяется, только стража и суд."
        : "ДА — ст. "+c.a.num+" не в списке исключений; залог оформляет только лицензированный адвокат (ст. 3.14 УК, ст. 5.18 Конституции).")+"</p>");
      else out.push("<p class=\"note\"><b>Про залог:</b> см. ст. 3.14 УК — возможен через лицензированного адвоката по статьям не из списка исключений.</p>");
    }
    for(const id of res.intents){ const n=INTENT_NOTE[id]; if(!n) continue;
      const ia=ART.find(x=>x.id===n);
      if(ia) out.push("<p class=\"note\">По смежному вопросу: ст. "+ia.num+" ["+esc(ia.title)+"]: "+esc(ia.text)+"</p>"); }
    out.push("<p class=\"warn\">Это автоподбор статей по ключевым словам, а не консультация юриста. Точная формулировка — в кодексе на форуме.</p>");
    return out.join("");
  }
  const $ = s => document.querySelector(s);
  const state = {mode:"sit", code:"", scope:"any", wanted:0};
  let lastRes = null;
  const card = a => "<article class=\"card\"><div class=\"row\"><span class=\"badge\">"+(CODE_NAME[a.code]||a.code)+"</span><span class=\"num\">ст. "+a.num+"</span>"+(a.scope!=="B"?"<span class=\"chip\">"+a.scope+"</span>":"")+(a.severity>=1?"<span class=\"chip sev"+a.severity+"\">розск "+a.severity+"</span>":"")+"</div><h3>"+esc(a.title)+"</h3><p>"+esc(a.text)+"</p>"+(a.months?"<p class=\"pen\">Срок: до "+a.months[1]+" мес.</p>":"")+(a.fine?"<p class=\"pen\">Штраф: "+money(a.fine[1])+" $</p>":"")+"</article>";
  function renderGrid(){
    const g = $("#results");
    if(state.mode==="sit" && lastRes){ g.innerHTML = lastRes.crimes.map(x=>card(x.a)).join(""); return; }
    const list = state.mode==="quick" ? quick($("#q").value, state) : filtered(state);
    g.innerHTML = list.length ? list.map(card).join("")
      : "<p class=\"hint\">Пусто: в этом кодексе база ещё наполняется или фильтры слишком строгие.</p>";
  }
  function runSit(){
    const raw = $("#sit").value.trim(); if(!raw) return;
    lastRes = analyzeAll(raw, state);
    const box = $("#answer"); box.hidden = false; box.innerHTML = compose(lastRes, raw);
    const fol = $("#follow"); fol.innerHTML = "";
    lastRes.crimes.slice(1,4).forEach(c=>{
      const b=document.createElement("button"); b.textContent="Разобрать: "+c.a.title;
      b.onclick=function(){ $("#sit").value=c.a.title; runSit(); }; fol.appendChild(b); });
    renderGrid(); box.scrollIntoView({behavior:"smooth", block:"nearest"});
    if(window.MirageDB) MirageDB.log(raw, lastRes.crimes.length? lastRes.crimes[0].a.num+" "+lastRes.crimes[0].a.title : "—");
  }
  window.MirageRun = function(t){ $("#sit").value=t; runSit(); };
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