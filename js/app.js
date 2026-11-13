// 진입점: 파일 읽기 → 매칭 → 계산 → 결과 표시 (화면 ①②③ 연결)
let lastResult = null, channelsCache = null, cancelled = false, running = false;
const tick = () => new Promise(r => setTimeout(r, 40));

// ── 홈 · 결과 이동 ──
function goResult() {
  if (document.body.classList.contains('has-result')) { scrollToSection('result'); return; }
  if (document.body.classList.contains('has-data')) {
    document.body.classList.add('has-result');
    window.scrollTo(0, 0);
    return;
  }
  startDiagnosis();
}
function goHome(e) {
  if (e && e.preventDefault) e.preventDefault();
  closeModal(); closeConsent();
  // 결과는 그대로 두고 화면만 인트로로 돌아감 → 상단 [진단 결과]에서 다시 열 수 있음
  document.body.classList.remove('has-result');
  window.scrollTo(0, 0);
}
function syncNav() {
  const r = document.body.classList.contains('has-result');
  const h = $id('nav-home'), v = $id('nav-result');
  h.classList.toggle('active', !r); v.classList.toggle('active', r);
  if (r) { v.setAttribute('aria-current', 'page'); h.removeAttribute('aria-current'); }
  else { h.setAttribute('aria-current', 'page'); v.removeAttribute('aria-current'); }
}
new MutationObserver(syncNav).observe(document.body, { attributes: true, attributeFilter: ['class'] });

// ── 채널 DB (fetch는 file:// 로 열면 막힘 → Live Server 또는 GitHub Pages) ──
async function loadChannels() {
  if (channelsCache) return channelsCache;
  try {
    const res = await fetch(CONFIG.CHANNELS_URL);
    if (!res.ok) throw new Error(res.status);
    channelsCache = (await res.json()).filter(c => c.id);
    return channelsCache;
  } catch (e) { throw new AppError(ERR.db); }
}

// ── 파일 → 기록 배열 ──
function parseText(text, isHtml) {
  try { return isHtml ? parseHTMLHistory(text) : parseJSONHistory(JSON.parse(text)); }
  catch (e) { throw new AppError(ERR.format); }
}
async function readRecords(file, kind) {
  let records;
  try {
    if (kind === 'zip') {
      if (typeof JSZip === 'undefined') throw new AppError(ERR.noZipLib);
      const zip = await JSZip.loadAsync(file);
      let target = null, isHtml = false;
      zip.forEach((path, entry) => {
        const p = path.toLowerCase();
        if (p.endsWith('watch-history.json') || p.endsWith('시청 기록.json')) { target = entry; isHtml = false; }
        else if (!target && p.endsWith('.html')) { target = entry; isHtml = true; }
      });
      if (!target) throw new AppError(ERR.zipNoFile);
      records = parseText(await target.async('string'), isHtml);
    } else {
      records = parseText(await file.text(), kind === 'html');
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(kind === 'zip' ? ERR.zipBroken : ERR.format);
  }
  if (!records.length) throw new AppError(ERR.empty);
  return records;
}

// 확장자가 없거나 이상해도 파일 앞부분으로 형식 판별
async function detectKind(file) {
  const name = file.name.toLowerCase();
  if (/\.zip$/.test(name)) return 'zip';
  if (/\.json$/.test(name)) return 'json';
  if (/\.html?$/.test(name)) return 'html';
  const b = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return (b[0] === 0x50 && b[1] === 0x4B) ? 'zip' : (b[0] === 0x5B || b[0] === 0x7B) ? 'json' : 'html';
}

function fileSelected(input) {
  $id('fileText').textContent = input.files[0]?.name || 'HTML, JSON 또는 ZIP 파일 선택';
  clearError();
  if (input.files[0]) setTimeout(analyzeFile, 150);   // 선택하면 바로 분석 시작
}

async function analyzeFile() {
  const file = $id('file').files[0];
  if (!file) { showError(ERR.noFile); return; }
  let kind;
  try { kind = await detectKind(file); } catch (e) { showError(ERR.format); return; }
  startRun(() => readRecords(file, kind));
}

function loadSampleData() {
  openModal();
  startRun(async () => {
    try {
      const res = await fetch(CONFIG.SAMPLE_URL);
      if (!res.ok) throw new Error(res.status);
      return parseJSONHistory(await res.json());
    } catch (e) { throw new AppError(ERR.sample); }
  });
}

// ── 분석 실행: 파싱 → 채널 매칭 → 지수 계산 (단계 표시 + 취소) ──
async function startRun(getRecords) {
  if (running) return;
  running = true; cancelled = false; clearError(); showProgress('parse');
  try {
    await tick();
    const records = await getRecords();
    if (cancelled) return resetUpload();
    showProgress('match'); await tick();
    const channels = await loadChannels();
    const tally = matchRecords(records, channels);
    if (cancelled) return resetUpload();
    showProgress('calc'); await tick();
    const result = computeResult(tally);
    if (cancelled) return resetUpload();
    if (result.status === 'insufficient') throw new AppError(insufficientError(result));
    lastResult = result;
    renderResult(result); renderExtras(result);
    $id('save-btn').textContent = '결과 저장';
    closeModal();
  } catch (e) {
    hideProgress();
    showError(e instanceof AppError ? e.info : ERR.format);
  } finally { running = false; }
}
function cancelAnalysis() {
  if (!running) { closeModal(); return; }
  cancelled = true; $id('cancel-btn').textContent = '취소 중…';
}

// ── 결과 저장 (LocalStorage, 요약만) ──
function saveCurrentResult() {
  if (!lastResult) return;
  const ok = HistoryStore.add(makeHistoryEntry(lastResult));
  $id('save-btn').textContent = ok ? '저장됨 ✓' : '저장 실패';
}

syncNav();
initHomeSections();
loadLogo();
if (location.hash === '#start') { history.replaceState(null, '', location.pathname); startDiagnosis(); }
