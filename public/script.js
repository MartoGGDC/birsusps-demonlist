let levels = [];
let token = null; 
let editingIndex = null;
let isAdmin = false;

const container = document.getElementById('list');
const viewToggle = document.getElementById('viewToggle');
const filterInput = document.getElementById('filterInput');
const loginModal = document.getElementById('loginModal');
const editModal = document.getElementById('editModal');

/* ---------- Helpers ---------- */
function escapeHtml(str){ if(!str && str!==0) return ''; return String(str).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;'); }

function parsePercent(str){ if(!str) return 0; const m=String(str).trim().match(/^(\d+(\.\d+)?)\s*%?$/); return m?parseFloat(m[1]):0; }

function pointercratePoints(rank){ return 150 * Math.pow(0.95, Math.max(0, rank-1)); }

/* ---------- Fetch Levels ---------- */
async function fetchLevels(){
  const res = await fetch('/api/levels');
  levels = await res.json();
  renderLevelsView(container, levels);
}

/* ---------- Render Levels ---------- */
function renderLevelsView(container, levelsArr){
  container.innerHTML='';
  levelsArr.sort((a,b)=>a.rank-b.rank);

  levelsArr.forEach((level,index)=>{
    level.recordHolders.sort((a,b)=>(b.verified?1:0)-(a.verified?1:0));
    const holdersHTML = level.recordHolders.length
      ? level.recordHolders.map(h=>`${h.verified?`<span class="text-purple-400 drop-shadow-[0_0_2px_purple]">${escapeHtml(h.name)}</span>`:escapeHtml(h.name)} - ${escapeHtml(h.percent)}${h.verified?' <span class="text-zinc-400">(Verified)</span>':''}`).join('')
      : `<li class="list-none text-zinc-500">No record holders yet.</li>`;

    const section = document.createElement('section');
    section.className='bg-zinc-800 p-4 rounded-2xl shadow-lg hover:bg-zinc-700 hover:ring-2 hover:ring-indigo-500 hover:ring-opacity-50 transition-all duration-300 ease-out opacity-0 translate-y-4 cursor-pointer';
    section.dataset.creator=(level.creator||'').toLowerCase();
    section.dataset.rank=String(level.rank);

    const youtubeThumbnail = level.youtube
      ? `<a href="https://www.youtube.com/watch?v=${encodeURIComponent(level.youtube)}" target="_blank" rel="noopener noreferrer" class="flex-shrink-0 mr-4">
           <img src="https://img.youtube.com/vi/${encodeURIComponent(level.youtube)}/hqdefault.jpg"
                alt="${escapeHtml(level.title)} YouTube Video Thumbnail"
                class="w-32 h-18 rounded-lg hover:scale-105 transition-transform object-cover"/>
         </a>` : '';

    const editButton = isAdmin
      ? `<button class="editBtn ml-2 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 text-sm">Edit</button>
         <button class="deleteBtn ml-2 px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 text-sm">Delete</button>` : '';

    section.innerHTML = `
      <div class="flex items-start">
        ${youtubeThumbnail}
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h2 id="level-${level.rank}" class="text-2xl font-bold text-zinc-100">#${level.rank} - ${escapeHtml(level.title||'-')}</h2>
            <div class="flex items-center">
              <span class="text-sm text-zinc-400">by ${escapeHtml(level.creator||'-')}</span>
              ${editButton}
            </div>
          </div>
          <div class="mt-2 border-t border-zinc-700 pt-2 record-holders" style="display:none;">
            <p class="text-sm text-zinc-100 mb-1">Record Holders:</p>
            <ul class="text-sm space-y-1 text-zinc-100">${holdersHTML}</ul>
          </div>
        </div>
      </div>
    `;

    container.appendChild(section);
    setTimeout(()=>{ section.classList.remove('opacity-0','translate-y-4'); section.classList.add('opacity-100','translate-y-0'); }, index*150);

    section.addEventListener('click',(e)=>{
      if(!e.target.closest('a')){
        const holdersDiv = section.querySelector('.record-holders');
        if(!holdersDiv) return;
        holdersDiv.style.display = (holdersDiv.style.display==='none'||holdersDiv.style.display==='')?'block':'none';
      }
    });

    if(isAdmin){
      const editBtn = section.querySelector('.editBtn');
      const delBtn = section.querySelector('.deleteBtn');

      editBtn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        editingIndex = index;
        openEditModal(level);
      });

      delBtn.addEventListener('click', async (e)=>{
        e.stopPropagation();
        if(confirm(`Delete level #${level.rank} - "${level.title}"?`)){
          await fetch(`/api/levels/${level.rank}`, {
            method:'DELETE',
            headers:{ 'Authorization': `Bearer ${token}` }
          });
          fetchLevels();
        }
      });
    }
  });

  if(isAdmin){
    const btn = document.createElement('button');
    btn.textContent='Create Level';
    btn.className='px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm';
    btn.onclick=async ()=>{
      const newLevel = { title:'New Level', creator:'', youtube:'', recordHolders:[] };
      await fetch('/api/levels',{
        method:'POST',
        headers:{ 'Content-Type':'application/json','Authorization': `Bearer ${token}` },
        body: JSON.stringify(newLevel)
      });
      fetchLevels();
    };
    container.appendChild(btn);
  }

  filterInput.oninput=()=>{
    const q = filterInput.value.toLowerCase();
    container.querySelectorAll('section').forEach(section=>{
      const matches = section.dataset.creator.includes(q) || section.dataset.rank.includes(q);
      section.style.display = matches?'block':'none';
    });
  };
}

/* ---------- Edit Modal ---------- */
const editForm = document.getElementById('editForm');
const cancelEdit = document.getElementById('cancelEdit');

function openEditModal(level){
  document.getElementById('editRank').value=level.rank;
  document.getElementById('editTitle').value=level.title;
  document.getElementById('editCreator').value=level.creator;
  document.getElementById('editYoutube').value=level.youtube||'';
  document.getElementById('editRecords').value=level.recordHolders.map(r=>`${r.name}-${r.percent}-${r.verified?'true':'false'}`).join(',');
  editModal.classList.remove('hidden');
}

cancelEdit.addEventListener('click',()=>editModal.classList.add('hidden'));

editForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const lvl = levels[editingIndex];
  const oldRank = lvl.rank;
  const newRank = parseInt(document.getElementById('editRank').value);

  const updatedLevel = {
    title: document.getElementById('editTitle').value,
    creator: document.getElementById('editCreator').value,
    youtube: document.getElementById('editYoutube').value,
    recordHolders: document.getElementById('editRecords').value.split(',').map(s=>{
      const parts = s.split('-');
      return { name:parts[0]?.trim(), percent:parts[1]?.trim()||'0%', verified:parts[2]?.trim().toLowerCase()==='true' };
    }),
    rank: newRank
  };

  await fetch(`/api/levels/${oldRank}`, {
    method:'PUT',
    headers:{ 'Content-Type':'application/json','Authorization': `Bearer ${token}` },
    body: JSON.stringify(updatedLevel)
  });
  fetchLevels();
  editModal.classList.add('hidden');
});

/* ---------- Login ---------- */
const loginBtn=document.getElementById('loginBtn');
const cancelLogin=document.getElementById('cancelLogin');
const confirmLogin=document.getElementById('confirmLogin');

loginBtn.addEventListener('click',()=>loginModal.classList.remove('hidden'));
cancelLogin.addEventListener('click',()=>loginModal.classList.add('hidden'));

confirmLogin.addEventListener('click', async ()=>{
  const username=document.getElementById('username').value;
  const password=document.getElementById('password').value;
  const res = await fetch('/api/login',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if(data.success){
    token = data.token;
    isAdmin = true;
    loginModal.classList.add('hidden');
    fetchLevels();
  } else alert('Invalid credentials');
});

/* ---------- Leaderboard ---------- */
function renderLeaderboardView(container, levelsArr){
  container.innerHTML='';
  const players={};
  levelsArr.forEach(level=>{
    const pts = pointercratePoints(level.rank);
    level.recordHolders.forEach(rec=>{
      const name = rec.name||'Unknown';
      const percent=parsePercent(rec.percent);
      if(!players[name]) players[name]={name, points:0, records:[]};
      players[name].points+=(percent/100)*pts;
      players[name].records.push({rank:level.rank,title:level.title,percent});
    });
  });

  const list = Object.values(players).sort((a,b)=>b.points-a.points);
  const div=document.createElement('div'); div.className='space-y-4';
  const header=document.createElement('div'); header.className='flex items-center justify-between text-zinc-400';
  header.innerHTML='<div class="text-lg font-semibold">Leaderboard</div>'; div.appendChild(header);

  if(list.length===0){ const p=document.createElement('p'); p.className='text-zinc-500'; p.textContent='No players with records yet.'; div.appendChild(p);}
  else{
    const table=document.createElement('div'); table.className='bg-zinc-800 p-3 rounded-2xl shadow-lg';
    table.innerHTML=`<div class="hidden md:flex text-xs text-zinc-400 uppercase tracking-wide mb-2 px-2"><div class="w-12">Rank</div><div class="flex-1">Player</div><div class="w-28 text-right">Points</div></div>`;
    list.forEach((p,i)=>{
      const row=document.createElement('div'); row.className='border-t border-zinc-700 pt-3 mt-3 cursor-pointer hover:bg-zinc-700 transition rounded-lg p-2';
      row.innerHTML=`<div class="flex items-center justify-between gap-4"><div class="flex items-center gap-3"><div class="w-12 text-xl font-bold text-zinc-100">${i+1}</div><div><div class="text-lg font-semibold text-zinc-100 player-name hover:text-indigo-400 transition">${escapeHtml(p.name)}</div></div></div><div class="text-right text-zinc-100 font-semibold">${p.points.toFixed(2)}</div></div>`;
      div.appendChild(row);
    });
  }
  container.appendChild(div);
}

/* ---------- Toggle Views ---------- */
let currentView='levels';
function showLevelsView(){ currentView='levels'; viewToggle.textContent='View Leaderboard'; fetchLevels();}
function showLeaderboardView(){ currentView='leaderboard'; viewToggle.textContent='View Levels'; renderLeaderboardView(container, levels);}
viewToggle.addEventListener('click',()=>currentView==='levels'?showLeaderboardView():showLevelsView());

/* ---------- On Load ---------- */
fetchLevels();
