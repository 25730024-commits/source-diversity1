// 결과 화면 렌더링 (게이지·표·도넛 차트·요약)
let myChart = null;
if (window.Chart) { Chart.defaults.font.family = '"Pretendard","Noto Sans KR","Malgun Gothic",sans-serif'; Chart.defaults.color = '#4a5361'; }
const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 숫자 카운트업
function animateNumber(el, to, dur, format) {
  format = format || (v => Math.round(v).toLocaleString());
  if (reduceMotion) { el.textContent = format(to); return; }
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = format(to * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}


function renderResult(result) {
  const sortedChannels = result.channels, totalNewsCount = result.newsCount, totalRawCount = result.rawCount;
  const hhi = result.hhi, cr3 = result.cr3, gi = result.gradeIndex, G = GRADES[gi];
  const subText = `최근 ${CONFIG.PERIOD_MONTHS}개월 · 전체 ${totalRawCount.toLocaleString()}개 중 추출 (기간 밖 ${result.outOfPeriod} · DB 밖 ${result.unmatched} · 채널 정보 없음 ${result.noChannel} 제외)`;
  // 결과 화면으로 전환 (인트로는 접힘)
  document.body.classList.add('has-result', 'has-data');
  const root = document.documentElement;
  root.style.setProperty('--g', G.color);
  root.style.setProperty('--gsoft', G.soft);

  document.getElementById('analysis-date').textContent = `${new Date().toLocaleDateString()} 분석 완료`;
  document.getElementById('grade-lv').textContent = G.lv;
  document.getElementById('grade-name').textContent = G.name;
  document.getElementById('status-desc').textContent = G.desc;
  document.getElementById('news-count').textContent = totalNewsCount.toLocaleString();
  document.getElementById('total-filtered-sub').textContent = subText;
  document.getElementById('gauge-note').textContent = `현재 ${G.lv} · ${G.name}`;
  renderSummary({ total: totalNewsCount, raw: totalRawCount, sub: subText, hhi, cr3, G, top: sortedChannels[0], channels: sortedChannels.length });

  // 큰 숫자 카운트업
  animateNumber(document.getElementById('hhi-score'), hhi, 1000);
  animateNumber(document.getElementById('cr3-score'), cr3, 900, v => v.toFixed(1));

  // CR3 바
  const cr3Fill = document.getElementById('cr3-bar-fill');
  cr3Fill.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => { cr3Fill.style.width = `${Math.min(cr3, 100)}%`; }));

  // 게이지: 구간 강조 + 핀 이동
  [...document.querySelectorAll('#track i')].forEach((el, i) => el.classList.toggle('on', i === gi));
  [...document.querySelectorAll('#legend4 .lg')].forEach((el, i) => el.classList.toggle('on', i === gi));
  const pct = Math.min(Math.max(hhi / 100, 0), 100);
  const pin = document.getElementById('pin');
  const bubble = document.getElementById('pin-bubble');
  bubble.textContent = `내 위치 ${hhi.toLocaleString()}`;
  pin.classList.toggle('edge-l', pct < 10);
  pin.classList.toggle('edge-r', pct > 90);
  pin.style.transition = 'none';
  pin.style.left = '0%';
  void pin.offsetWidth;
  pin.style.transition = '';
  requestAnimationFrame(() => { pin.style.left = `${pct}%`; });

  // 표 (textContent로 삽입)
  const tbody = document.getElementById('channel-table-body');
  tbody.innerHTML = '';
  sortedChannels.slice(0, 10).forEach((ch, idx) => {
    const tr = document.createElement('tr');
    if (idx === 0) tr.className = 'top1';

    const tdRank = document.createElement('td');
    tdRank.className = 'rank';
    tdRank.textContent = String(idx + 1).padStart(2, '0');

    const tdName = document.createElement('td');
    tdName.textContent = ch.name;

    const tdCount = document.createElement('td');
    tdCount.textContent = `${ch.count}회`;

    const tdShare = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'share-cell';
    const sb = document.createElement('div');
    sb.className = 'sb';
    const bar = document.createElement('i');
    bar.style.width = `${ch.share.toFixed(1)}%`;
    sb.appendChild(bar);
    const label = document.createElement('span');
    label.textContent = `${ch.share.toFixed(1)}%`;
    wrap.appendChild(sb);
    wrap.appendChild(label);
    tdShare.appendChild(wrap);

    tr.append(tdRank, tdName, tdCount, tdShare);
    tbody.appendChild(tr);
  });

  updateChart(sortedChannels);

  // 결과 영역이 보이도록 이동
  setTimeout(() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }), 50);
}

function updateChart(channels) {
  if (!window.Chart) return;
  const ctx = document.getElementById('channelChart').getContext('2d');
  const topChannels = channels.slice(0, 4);
  const otherShare = channels.slice(4).reduce((sum, ch) => sum + ch.share, 0);

  const labels = topChannels.map(c => `${c.name} ${c.share.toFixed(1)}%`);
  const data = topChannels.map(c => c.share);

  if (otherShare > 0) {
    labels.push(`기타 시사 채널 ${otherShare.toFixed(1)}%`);
    data.push(otherShare);
  }

  document.getElementById('channelChart').setAttribute('aria-label', '채널별 시청 비중 도넛 차트: ' + labels.join(', '));
  if (myChart) myChart.destroy();

  myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#0B1F3A', '#2F6FEB', '#7FA6E8', '#B9CBE6', '#DDE3EC'],
        borderColor: '#ffffff',
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, padding: 14 } },
        tooltip: { callbacks: { label: c => ` ${c.parsed.toFixed(1)}%` } }
      },
      cutout: '62%'
    }
  });
}

function scrollToSection(id){
  let el = document.getElementById(id);
  // 결과 전에는 #result가 숨겨져 있으므로 진단 요약으로 이동
  if (!el || el.offsetParent === null) el = document.getElementById('summary');
  if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

// ── 진단 요약 + 홈 안내 영역 ──
const GRADE_RANGES = ['1,500 미만', '1,500 ~ 2,499', '2,500 ~ 5,000', '5,000 초과'];

function initHomeSections(){
  if (document.getElementById('summary')) return;
  const result = document.getElementById('result');
  const parent = result ? result.parentNode : (document.querySelector('footer') || document.body).parentNode;
  const anchor = result || document.querySelector('footer') || null;
  // 부모에 이미 .wrap 이 있으면 중복 패딩을 피한다
  const wrapCls = (parent && parent.closest && parent.closest('.wrap')) ? '' : ' wrap';

  const summary = document.createElement('section');
  summary.id = 'summary';
  summary.className = 'sum' + wrapCls;
  summary.innerHTML =
    '<div class="sum-head"><h2>진단 요약</h2><span id="sum-date">파일을 업로드하세요</span></div>' +
    '<p class="sum-line" id="sum-line">시청기록을 올리면 뉴스·시사 시청 현황을 한 문장으로 요약해 드립니다.</p>' +
    '<div class="sum-grid">' +
      '<div class="sum-card"><div class="sum-k">추출된 뉴스·시사 영상</div><div class="sum-v" id="sum-count">–</div><div class="sum-s" id="sum-count-sub">전체 시청 기록 중 뉴스 필터링</div></div>' +
      '<div class="sum-card hl"><div class="sum-k">HHI 편중도 지수</div><div class="sum-v" id="sum-hhi">–</div><div class="sum-s" id="sum-hhi-sub">분석 대기 중</div></div>' +
      '<div class="sum-card"><div class="sum-k">상위 3개 채널 CR3</div><div class="sum-v" id="sum-cr3">–</div><div class="sum-s" id="sum-cr3-sub">뉴스 채널 중 상위 점유율</div></div>' +
      '<div class="sum-card"><div class="sum-k">최다 시청 채널</div><div class="sum-v txt" id="sum-top">–</div><div class="sum-s" id="sum-top-sub">분석 후 표시</div></div>' +
    '</div>';

  const guide = document.createElement('section');
  guide.id = 'home-guide';
  guide.className = 'guide' + wrapCls;
  const steps = [
    ['01', '업로드', 'HTML·JSON·ZIP 시청기록'],
    ['02', '파싱', '시청기록에서 채널명 추출'],
    ['03', '뉴스·시사 필터링', '채널 DB + 키워드로 판별'],
    ['04', '계산 · 시각화', 'HHI·CR3 산출, 등급 표시']
  ];
  guide.innerHTML =
    '<div class="guide-head"><h2>진단은 이렇게 진행됩니다</h2><span>음악·예능·게임은 자동 제외</span></div>' +
    '<div class="steps">' + steps.map(s => '<div class="step"><i>STEP ' + s[0] + '</i><b>' + s[1] + '</b><span>' + s[2] + '</span></div>').join('') + '</div>' +
    '<div class="guide-head"><h2>HHI 4단계 기준</h2><span>한 채널이 100%이면 최대 10,000점</span></div>' +
    '<div class="gcards">' + GRADES.map((g, i) => '<div class="gcard" style="--c:' + g.color + '"><small>' + g.lv + '</small><b>' + g.name + '</b><em>HHI ' + GRADE_RANGES[i] + '</em><span>' + g.desc + '</span></div>').join('') + '</div>';

  if (parent) {
    parent.insertBefore(summary, anchor);
    parent.insertBefore(guide, anchor);
  } else {
    document.body.appendChild(summary);
    document.body.appendChild(guide);
  }
}

function renderSummary(o){
  const $ = id => document.getElementById(id);
  const topShare = o.top.share.toFixed(1);
  $('sum-date').textContent = `${new Date().toLocaleDateString()} 분석 완료`;
  animateNumber($('sum-count'), o.total, 800, v => Math.round(v).toLocaleString() + '개');
  $('sum-count-sub').textContent = o.sub;
  animateNumber($('sum-hhi'), o.hhi, 1000);
  $('sum-hhi-sub').textContent = `${o.G.lv} · ${o.G.name}`;
  animateNumber($('sum-cr3'), o.cr3, 900, v => v.toFixed(1) + '%');
  $('sum-cr3-sub').textContent = `인식된 채널 ${o.channels}개 중 상위 3개`;
  $('sum-top').textContent = o.top.name;
  $('sum-top-sub').textContent = `${o.top.count}회 · ${topShare}%`;
  // 규칙 기반 요약 문장 (외부 AI 미사용, 판단 없이 수치만 서술)
  $('sum-line').textContent =
    `뉴스·시사 영상 ${o.total.toLocaleString()}개를 분석한 결과, 상위 3개 채널이 전체의 ${o.cr3.toFixed(1)}%를 차지하며 가장 많이 본 채널은 ${o.top.name}(${topShare}%)입니다. ` +
    `HHI ${o.hhi.toLocaleString()}로 '${o.G.lv} ${o.G.name}' 구간에 해당합니다. (수치 기반 분석 결과이며 채널의 좋고 나쁨은 판단하지 않습니다.)`;
}


// CR3 평가 문구 · 분석 기준 목록
function renderExtras(result) {
  document.getElementById('cr3-eval').textContent = cr3Label(result.cr3);
  const ul = document.getElementById('basis-list');
  ul.innerHTML = '';
  basisItems(result).forEach(t => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
}
