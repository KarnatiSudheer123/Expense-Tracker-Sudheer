/* ==================== STATE ==================== */
const store = {
  transactions: JSON.parse(localStorage.getItem('ft_tx')||'[]'),
  budget: parseFloat(localStorage.getItem('ft_budget')||'0'),
  goal: parseFloat(localStorage.getItem('ft_goal')||'0'),
  currency: localStorage.getItem('ft_curr')||'$',
  theme: localStorage.getItem('ft_theme')||'dark',
};
let currentType = 'expense';
const charts = {};
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const fmt = v => store.currency + Math.abs(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const save = () => {
  localStorage.setItem('ft_tx',JSON.stringify(store.transactions));
  localStorage.setItem('ft_budget',store.budget);
  localStorage.setItem('ft_goal',store.goal);
  localStorage.setItem('ft_curr',store.currency);
  localStorage.setItem('ft_theme',store.theme);
};

/* ==================== NOTIFICATIONS ==================== */
function notify(msg,type='success'){
  const n = document.createElement('div');
  n.className = 'notif '+type;
  n.textContent = msg;
  $('#notifs').appendChild(n);
  setTimeout(()=>n.remove(),3200);
}

/* ==================== NAVIGATION ==================== */
$$('.nav-btn').forEach(b=>{
  b.addEventListener('click',()=>{
    const p = b.dataset.page;
    $$('.nav-btn').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    $$('.page').forEach(x=>x.classList.remove('active'));
    $('#page-'+p).classList.add('active');
    $('#pageTitle').textContent = b.textContent.trim();
    window.scrollTo({top:0,behavior:'smooth'});
    if(p==='analytics') setTimeout(renderAnalytics,100);
    if(p==='dashboard') setTimeout(renderDashboardCharts,100);
    if(p==='sidebar') {}
    $('#sidebar').classList.remove('open');
  });
});
$('#menuBtn').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));

/* ==================== ADD TRANSACTION ==================== */
$$('#page-add .toggle button').forEach(b=>{
  b.addEventListener('click',()=>{
    $$('#page-add .toggle button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentType = b.dataset.type;
  });
});
$('#txDate').valueAsDate = new Date();
$('#addTxBtn').addEventListener('click',()=>{
  const name = $('#txName').value.trim();
  const amount = parseFloat($('#txAmount').value);
  const cat = $('#txCategory').value;
  const date = $('#txDate').value;
  if(!name||!amount||amount<=0||!date){ notify('Please fill all fields','error'); return; }
  store.transactions.unshift({id:Date.now(),name,amount,category:cat,date,type:currentType});
  save();
  $('#txName').value=''; $('#txAmount').value='';
  notify('Transaction added!','success');
  refreshAll();
  checkBudgetWarn();
});

/* ==================== TRANSACTIONS TABLE ==================== */
function getFilteredTx(){
  let list = [...store.transactions];
  const q = ($('#txSearch')?.value||'').toLowerCase();
  const cat = $('#txFilterCat')?.value||'';
  const d = $('#txFilterDate')?.value||'';
  const sort = $('#txSort')?.value||'none';
  if(q) list = list.filter(t=>t.name.toLowerCase().includes(q));
  if(cat) list = list.filter(t=>t.category===cat);
  if(d) list = list.filter(t=>t.date===d);
  if(sort==='asc') list.sort((a,b)=>a.amount-b.amount);
  if(sort==='desc') list.sort((a,b)=>b.amount-a.amount);
  return list;
}
function renderTxTable(){
  const tbody = $('#txTable');
  const list = getFilteredTx();
  if(!list.length){ tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;opacity:.6">No transactions yet</td></tr>'; return; }
  tbody.innerHTML = list.map(t=>`
    <tr>
      <td>${t.name}</td>
      <td>${t.category}</td>
      <td>${t.date}</td>
      <td><span class="tag ${t.type}">${t.type}</span></td>
      <td style="color:${t.type==='income'?'#86efac':'#fca5a5'};font-weight:600">${t.type==='income'?'+':'-'}${fmt(t.amount)}</td>
      <td class="row-actions">
        <button class="btn small" onclick="editTx(${t.id})">✏️</button>
        <button class="btn small danger" onclick="delTx(${t.id})">🗑️</button>
      </td>
    </tr>`).join('');
}
window.delTx = id => {
  store.transactions = store.transactions.filter(t=>t.id!==id);
  save(); refreshAll(); notify('Transaction deleted','warn');
};
window.editTx = id => {
  const t = store.transactions.find(x=>x.id===id); if(!t) return;
  const name = prompt('Name:',t.name); if(name===null) return;
  const amt = prompt('Amount:',t.amount); if(amt===null) return;
  t.name = name||t.name; t.amount = parseFloat(amt)||t.amount;
  save(); refreshAll(); notify('Transaction updated','success');
};
['txSearch','txFilterCat','txFilterDate','txSort'].forEach(id=>{
  document.addEventListener('input',e=>{ if(e.target.id===id) renderTxTable(); });
  document.addEventListener('change',e=>{ if(e.target.id===id) renderTxTable(); });
});
$('#globalSearch').addEventListener('input',e=>{
  const v = e.target.value;
  $('#txSearch').value = v;
  $$('.nav-btn').forEach(b=>b.classList.remove('active'));
  $$('.nav-btn')[2].classList.add('active');
  $$('.page').forEach(x=>x.classList.remove('active'));
  $('#page-transactions').classList.add('active');
  $('#pageTitle').textContent = 'Transactions';
  renderTxTable();
});

/* ==================== DASHBOARD STATS ==================== */
function calcStats(){
  const inc = store.transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = store.transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  return {income:inc,expense:exp,balance:inc-exp,savings:Math.max(0,inc-exp)};
}
function animateCount(el,target){
  const dur = 900; const start = performance.now(); const from = 0;
  const step = now => {
    const p = Math.min(1,(now-start)/dur);
    const v = from + (target-from)*(1-Math.pow(1-p,3));
    el.textContent = fmt(v);
    if(p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function renderStats(){
  const s = calcStats();
  animateCount($('#statBalance'),s.balance);
  animateCount($('#statIncome'),s.income);
  animateCount($('#statExpense'),s.expense);
  animateCount($('#statSavings'),s.savings);

  // Recent
  const recent = store.transactions.slice(0,5);
  $('#recentTx').innerHTML = recent.length ? recent.map(t=>`
    <tr><td>${t.name}</td><td>${t.category}</td><td>${t.date}</td>
    <td style="color:${t.type==='income'?'#86efac':'#fca5a5'};font-weight:600">${t.type==='income'?'+':'-'}${fmt(t.amount)}</td></tr>
  `).join('') : '<tr><td colspan="4" style="text-align:center;padding:20px;opacity:.6">No transactions yet</td></tr>';
}

/* ==================== CATEGORY FILTER OPTIONS ==================== */
function refreshCatFilter(){
  const sel = $('#txFilterCat'); if(!sel) return;
  const cats = [...new Set(store.transactions.map(t=>t.category))];
  sel.innerHTML = '<option value="">All Categories</option>'+cats.map(c=>`<option>${c}</option>`).join('');
}

/* ==================== CHARTS ==================== */
const chartOpts = {
  responsive:true, maintainAspectRatio:false,
  animation:{duration:1100,easing:'easeOutCubic'},
  plugins:{legend:{labels:{color:'#e6f0ff'}}},
  scales:{x:{ticks:{color:'#cbd5e1'},grid:{color:'rgba(255,255,255,0.08)'}},y:{ticks:{color:'#cbd5e1'},grid:{color:'rgba(255,255,255,0.08)'}}}
};
function destroyChart(k){ if(charts[k]){charts[k].destroy(); delete charts[k];} }
function monthlyData(){
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const inc = Array(12).fill(0), exp = Array(12).fill(0);
  store.transactions.forEach(t=>{
    const m = new Date(t.date).getMonth();
    if(t.type==='income') inc[m]+=t.amount; else exp[m]+=t.amount;
  });
  return {months,inc,exp};
}
function categoryData(){
  const map = {};
  store.transactions.filter(t=>t.type==='expense').forEach(t=>map[t.category]=(map[t.category]||0)+t.amount);
  return {labels:Object.keys(map),data:Object.values(map)};
}
const palette = ['#86efac','#4ade80','#60a5fa','#f87171','#fbbf24','#a78bfa','#f472b6','#34d399','#fb923c','#22d3ee'];
function renderDashboardCharts(){
  const {months,inc,exp} = monthlyData();
  destroyChart('dashMonthly');
  charts.dashMonthly = new Chart($('#dashMonthly'),{
    type:'bar',
    data:{labels:months,datasets:[
      {label:'Income',data:inc,backgroundColor:'rgba(134,239,172,.85)',borderRadius:8},
      {label:'Expense',data:exp,backgroundColor:'rgba(248,113,113,.85)',borderRadius:8}
    ]},
    options:chartOpts
  });
  const cd = categoryData();
  destroyChart('dashPie');
  charts.dashPie = new Chart($('#dashPie'),{
    type:'doughnut',
    data:{labels:cd.labels.length?cd.labels:['No data'],datasets:[{data:cd.data.length?cd.data:[1],backgroundColor:palette,borderWidth:0}]},
    options:{...chartOpts,scales:{}}
  });
}
function renderAnalytics(){
  const {months,inc,exp} = monthlyData();
  const cd = categoryData();

  // Bar
  destroyChart('chartBar');
  charts.chartBar = new Chart($('#chartBar'),{type:'bar',
    data:{labels:cd.labels.length?cd.labels:['No data'],datasets:[{label:'Spent',data:cd.data.length?cd.data:[0],backgroundColor:palette,borderRadius:10}]},
    options:chartOpts});

  // Pie
  destroyChart('chartPie');
  charts.chartPie = new Chart($('#chartPie'),{type:'pie',
    data:{labels:cd.labels.length?cd.labels:['No data'],datasets:[{data:cd.data.length?cd.data:[1],backgroundColor:palette,borderWidth:0}]},
    options:{...chartOpts,scales:{}}});

  // Trend (cumulative savings)
  const savingsTrend = []; let running = 0;
  const sorted = [...store.transactions].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const labels = sorted.map(t=>t.date);
  sorted.forEach(t=>{ running += t.type==='income'?t.amount:-t.amount; savingsTrend.push(running); });
  destroyChart('chartTrend');
  charts.chartTrend = new Chart($('#chartTrend'),{type:'line',
    data:{labels:labels.length?labels:['Start'],datasets:[{label:'Balance',data:savingsTrend.length?savingsTrend:[0],fill:true,
      backgroundColor:'rgba(134,239,172,0.25)',borderColor:'#86efac',tension:.35,pointRadius:3}]},
    options:chartOpts});

  // Monthly
  destroyChart('chartMonthly');
  charts.chartMonthly = new Chart($('#chartMonthly'),{type:'bar',
    data:{labels:months,datasets:[{label:'Spending',data:exp,backgroundColor:'rgba(96,165,250,.85)',borderRadius:8}]},
    options:chartOpts});

  // Income vs expense
  destroyChart('chartCompare');
  charts.chartCompare = new Chart($('#chartCompare'),{type:'bar',
    data:{labels:['Income','Expense'],datasets:[{data:[inc.reduce((a,b)=>a+b,0),exp.reduce((a,b)=>a+b,0)],
      backgroundColor:['#4ade80','#f87171'],borderRadius:12}]},
    options:{...chartOpts,plugins:{legend:{display:false}}}});

  // Category-wise expense (horizontal)
  destroyChart('chartCatExp');
  charts.chartCatExp = new Chart($('#chartCatExp'),{type:'bar',
    data:{labels:cd.labels.length?cd.labels:['No data'],datasets:[{label:'Expense',data:cd.data.length?cd.data:[0],backgroundColor:palette,borderRadius:10}]},
    options:{...chartOpts,indexAxis:'y'}});
}

/* ==================== BUDGET ==================== */
function renderBudget(){
  $('#budgetInput').value = store.budget||'';
  const thisMonth = new Date().getMonth();
  const spent = store.transactions.filter(t=>t.type==='expense'&&new Date(t.date).getMonth()===thisMonth).reduce((s,t)=>s+t.amount,0);
  const pct = store.budget>0 ? Math.min(100,(spent/store.budget)*100) : 0;
  const bar = $('#budgetBar');
  bar.style.width = pct+'%';
  bar.className = 'bar' + (pct>=100?' danger':pct>=80?' warn':'');
  $('#budgetSpent').textContent = fmt(spent);
  $('#budgetTotal').textContent = fmt(store.budget);
  $('#budgetRemain').textContent = fmt(Math.max(0,store.budget-spent));
}
$('#setBudgetBtn').addEventListener('click',()=>{
  store.budget = parseFloat($('#budgetInput').value)||0;
  save(); renderBudget(); notify('Budget saved!','success');
});
function checkBudgetWarn(){
  const thisMonth = new Date().getMonth();
  const spent = store.transactions.filter(t=>t.type==='expense'&&new Date(t.date).getMonth()===thisMonth).reduce((s,t)=>s+t.amount,0);
  if(store.budget>0 && spent>store.budget) notify('⚠️ Budget exceeded!','error');
  else if(store.budget>0 && spent>store.budget*.8) notify('⚠️ 80% of budget used','warn');
}

/* ==================== SAVINGS ==================== */
function renderSavings(){
  $('#goalInput').value = store.goal||'';
  const s = calcStats();
  const saved = s.savings;
  const pct = store.goal>0 ? Math.min(100,(saved/store.goal)*100) : 0;
  $('#goalBar').style.width = pct+'%';
  $('#goalPct').textContent = pct.toFixed(1)+'%';
  $('#goalSaved').textContent = fmt(saved);
  $('#goalTotal').textContent = fmt(store.goal);
  const emoji = $('#goalEmoji');
  if(pct>=100){ emoji.textContent='🏆'; emoji.classList.add('achievement'); notify('🎉 Goal achieved!','success'); }
  else if(pct>=75) emoji.textContent='🚀';
  else if(pct>=50) emoji.textContent='💪';
  else if(pct>=25) emoji.textContent='🌱';
  else emoji.textContent='🎯';
}
$('#setGoalBtn').addEventListener('click',()=>{
  store.goal = parseFloat($('#goalInput').value)||0;
  save(); renderSavings(); notify('Goal saved!','success');
});

/* ==================== REPORTS ==================== */
function rangeTotal(days){
  const now = new Date();
  return store.transactions.filter(t=>{
    const diff = (now-new Date(t.date))/(1000*60*60*24);
    return t.type==='expense' && diff<=days;
  }).reduce((s,t)=>s+t.amount,0);
}
function renderReports(){
  $('#reportWeek').textContent = fmt(rangeTotal(7));
  $('#reportMonth').textContent = fmt(rangeTotal(30));
  $('#reportYear').textContent = fmt(rangeTotal(365));
}
$$('[data-report]').forEach(b=>b.addEventListener('click',()=>{
  const period = b.dataset.report;
  const days = period==='week'?7:period==='month'?30:365;
  const now = new Date();
  const list = store.transactions.filter(t=>(now-new Date(t.date))/(1000*60*60*24)<=days);
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(18); doc.text(`${period.toUpperCase()} REPORT - FinTrack`,14,18);
  doc.setFontSize(10); doc.text(`Generated: ${now.toLocaleString()}`,14,26);
  let y = 40;
  doc.setFontSize(12); doc.text('Name',14,y); doc.text('Category',60,y); doc.text('Date',110,y); doc.text('Type',145,y); doc.text('Amount',175,y);
  y+=6; doc.line(14,y,196,y); y+=6;
  let totalInc=0,totalExp=0;
  list.forEach(t=>{
    if(y>270){doc.addPage();y=20;}
    doc.text(String(t.name).slice(0,22),14,y);
    doc.text(t.category,60,y); doc.text(t.date,110,y); doc.text(t.type,145,y);
    doc.text(fmt(t.amount),175,y);
    if(t.type==='income') totalInc+=t.amount; else totalExp+=t.amount;
    y+=7;
  });
  y+=10;
  doc.setFontSize(13);
  doc.text(`Total Income: ${fmt(totalInc)}`,14,y); y+=8;
  doc.text(`Total Expense: ${fmt(totalExp)}`,14,y); y+=8;
  doc.text(`Net: ${fmt(totalInc-totalExp)}`,14,y);
  doc.save(`fintrack-${period}-report.pdf`);
  notify('Report downloaded!','success');
}));

/* ==================== SETTINGS ==================== */
$$('#page-settings .toggle button').forEach(b=>b.addEventListener('click',()=>{
  $$('#page-settings .toggle button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  store.theme = b.dataset.theme;
  applyTheme();
}));
$('#themeBtn').addEventListener('click',()=>{
  store.theme = store.theme==='dark'?'light':'dark';
  applyTheme(); save();
});
function applyTheme(){
  document.body.classList.toggle('light',store.theme==='light');
  $('#themeBtn').textContent = store.theme==='dark'?'🌙':'☀️';
}
$('#saveSettings').addEventListener('click',()=>{
  store.currency = $('#currencyInput').value||'$';
  save(); refreshAll(); notify('Settings saved!','success');
});
$('#clearData').addEventListener('click',()=>{
  if(!confirm('Delete all data?')) return;
  store.transactions = []; store.budget=0; store.goal=0;
  save(); refreshAll(); notify('All data cleared','warn');
});

/* ==================== BACK TO TOP ==================== */
window.addEventListener('scroll',()=>{
  $('#backTop').classList.toggle('show', window.scrollY>300);
});
$('#backTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

/* ==================== REFRESH ==================== */
function refreshAll(){
  renderStats();
  renderTxTable();
  refreshCatFilter();
  renderBudget();
  renderSavings();
  renderReports();
  renderDashboardCharts();
  if($('#page-analytics').classList.contains('active')) renderAnalytics();
}

/* ==================== INIT ==================== */
window.addEventListener('load',()=>{
    
  // seed data if empty
  if(!store.transactions.length){
    const today = new Date();
    const d = n => { const x=new Date(today); x.setDate(x.getDate()-n); return x.toISOString().slice(0,10); };
    store.transactions = [
      {id:1,name:'Salary',amount:3500,category:'Salary',date:d(2),type:'income'},
      {id:2,name:'Groceries',amount:120,category:'Food',date:d(1),type:'expense'},
      {id:3,name:'Uber',amount:25,category:'Transport',date:d(3),type:'expense'},
      {id:4,name:'Netflix',amount:15,category:'Entertainment',date:d(5),type:'expense'},
      {id:5,name:'Freelance',amount:600,category:'Salary',date:d(6),type:'income'},
      {id:6,name:'Electricity',amount:80,category:'Bills',date:d(8),type:'expense'},
      {id:7,name:'Shoes',amount:140,category:'Shopping',date:d(10),type:'expense'},
    ];
    store.budget = 1500; store.goal = 2000;
    save();
  }
  applyTheme();
  refreshAll();
  setTimeout(()=>$('#loader').classList.add('hide'),600);
  setTimeout(()=>notify('Welcome to FinTrack 👋','success'),900);
});