// 진단 이력 화면 (화면 ④): 목록·삭제·HHI 변화 그래프
let trendChart = null;

function renderHistory() {
  const list = HistoryStore.load();
  const tbody = document.getElementById('hist-body');
  tbody.innerHTML = '';
  document.getElementById('hist-empty').style.display = list.length ? 'none' : 'block';
  document.getElementById('clear-btn').style.display = list.length ? '' : 'none';

  list.forEach(e => {
    const tr = document.createElement('tr');
    const cells = [
      new Date(e.savedAt).toLocaleDateString(),
      e.hhi.toLocaleString(),
      `${e.lv} ${e.grade}`,
      `${e.cr3}%`,
      `${e.newsCount.toLocaleString()}회`,
      e.top.slice(0, 3).map(c => `${c.name} ${c.share}%`).join(', ')
    ];
    cells.forEach(t => { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); });
    const tdDel = document.createElement('td');
    const btn = document.createElement('button');
    btn.className = 'del'; btn.textContent = '삭제';
    btn.onclick = () => { HistoryStore.remove(e.id); renderHistory(); };
    tdDel.appendChild(btn); tr.appendChild(tdDel);
    tbody.appendChild(tr);
  });

  renderCompare(list);
  const note = document.getElementById('trend-note');
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  document.getElementById('trend').style.display = list.length >= 2 ? '' : 'none';
  note.textContent = list.length >= 2 ? '' : '진단을 2회 이상 저장하면 변화 그래프가 표시됩니다.';
  if (list.length >= 2 && window.Chart) {
    const asc = [...list].reverse();
    trendChart = new Chart(document.getElementById('trend'), {
      type: 'line',
      data: { labels: asc.map(e => new Date(e.savedAt).toLocaleDateString()),
              datasets: [{ label: 'HHI', data: asc.map(e => e.hhi), borderColor: '#0B1F3A', backgroundColor: '#0B1F3A', tension: 0.2 }] },
      options: { scales: { y: { min: 0, max: 10000 } } }
    });
  }
}

// 두 진단 비교 (화면 ④)
function renderCompare(list) {
  const ok = list.length >= 2;
  document.getElementById('cmp-box').hidden = !ok;
  document.getElementById('cmp-note').textContent = ok ? '' : '진단을 2회 이상 저장하면 두 진단을 비교할 수 있습니다.';
  document.getElementById('cmp-out').hidden = true;
  if (!ok) return;
  ['cmp-a', 'cmp-b'].forEach((id, k) => {
    const sel = document.getElementById(id);
    sel.innerHTML = '';
    list.forEach((e, i) => {
      const o = document.createElement('option');
      o.value = e.id;
      o.textContent = `${new Date(e.savedAt).toLocaleString()} · HHI ${e.hhi.toLocaleString()}`;
      sel.appendChild(o);
    });
    sel.selectedIndex = k === 0 ? 1 : 0;   // 기본: 직전 진단 vs 최근 진단
  });
}
document.getElementById('cmp-btn').onclick = () => {
  const list = HistoryStore.load();
  const a = list.find(e => e.id === document.getElementById('cmp-a').value);
  const b = list.find(e => e.id === document.getElementById('cmp-b').value);
  const out = document.getElementById('cmp-out');
  if (!a || !b || a.id === b.id) {
    out.hidden = false;
    document.getElementById('cmp-sentence').textContent = '서로 다른 두 진단을 선택해 주세요.';
    document.getElementById('cmp-body').innerHTML = ''; document.getElementById('cmp-top').textContent = '';
    return;
  }
  const [older, newer] = new Date(a.savedAt) <= new Date(b.savedAt) ? [a, b] : [b, a];
  const r = compareEntries(older, newer);
  document.getElementById('cmp-sentence').textContent = r.sentence;
  document.getElementById('cmp-top').textContent = r.top;
  const body = document.getElementById('cmp-body'); body.innerHTML = '';
  r.rows.forEach(row => { const tr = document.createElement('tr'); row.forEach(t => { const td = document.createElement('td'); td.textContent = t; tr.appendChild(td); }); body.appendChild(tr); });
  out.hidden = false;
};

document.getElementById('clear-btn').onclick = () => {
  if (confirm('저장된 진단 이력을 모두 삭제할까요?')) { HistoryStore.clear(); renderHistory(); }
};
renderHistory();
