// 화면 보조: 동의창 · 업로드 창 · 진행 표시 · 오류 박스 · 로고 이미지
class AppError extends Error { constructor(info) { super(info.title); this.info = info; } }

const WHERE = 'index.html을 파일로 직접 열었다면 GitHub Pages 주소나 VS Code Live Server에서 열어 주세요.';
const ERR = {
  noFile:    { title: '파일을 선택해 주세요', cause: '선택된 파일이 없습니다.', fix: 'Takeout에서 받은 .zip, 또는 시청 기록 .html·.json 파일을 선택해 주세요.' },
  format:    { title: '올바른 Takeout 파일이 아닙니다', cause: '시청기록 형식으로 읽을 수 없는 파일입니다.', fix: 'Google Takeout에서 YouTube의 [시청 기록]만 선택해 내보낸 파일을 올려 주세요.' },
  empty:     { title: '시청 기록을 찾지 못했습니다', cause: '파일은 열렸지만 시청 기록 항목이 없습니다.', fix: 'Takeout에서 [시청 기록]이 선택되었는지 확인하고 다시 내보내 주세요.' },
  zipNoFile: { title: 'ZIP 안에서 시청 기록 파일을 찾지 못했습니다', cause: 'ZIP에 시청 기록(.html 또는 .json)이 들어 있지 않습니다.', fix: 'Takeout에서 [시청 기록]을 포함해 다시 내보내거나, ZIP을 풀어서 시청 기록 파일만 올려 주세요.' },
  zipBroken: { title: 'ZIP 파일을 열지 못했습니다', cause: '파일이 손상되었거나 너무 클 수 있습니다.', fix: 'ZIP을 풀어서 시청 기록 파일(.html·.json)만 올려 주세요.' },
  noZipLib:  { title: '압축 해제 도구를 불러오지 못했습니다', cause: '인터넷 연결 문제로 JSZip을 불러오지 못했습니다.', fix: '연결을 확인하고 새로고침하거나, ZIP을 풀어서 시청 기록 파일만 올려 주세요.' },
  db:        { title: '채널 DB를 불러오지 못했습니다', cause: 'data/channels.json을 읽지 못했습니다.', fix: '새로고침해 보세요. ' + WHERE },
  sample:    { title: '예시 데이터를 불러오지 못했습니다', cause: 'data/sample_history.json을 읽지 못했습니다.', fix: '새로고침해 보세요. ' + WHERE }
};
function insufficientError(r) {
  const n = v => v.toLocaleString();
  return {
    title: '분석 데이터가 부족합니다',
    cause: `최근 ${CONFIG.PERIOD_MONTHS}개월 뉴스·시사 시청이 ${n(r.newsCount)}건입니다 (최소 ${CONFIG.MIN_SAMPLE}건 필요). 전체 ${n(r.rawCount)}건 중 기간 밖 ${n(r.outOfPeriod)}, 채널 DB에 없는 채널 ${n(r.unmatched)}, 채널 정보 없음 ${n(r.noChannel)}건이 제외되었습니다.`,
    fix: '시청기록이 더 쌓인 뒤 다시 진단해 주세요.'
  };
}

const $id = id => document.getElementById(id);
const modal = $id('modal'), consentModal = $id('consent');
let consentMemo = false;

function hasConsent() {
  try { return sessionStorage.getItem(CONFIG.CONSENT_KEY) === '1'; } catch (e) { return consentMemo; }
}
function openConsent() { consentModal.classList.add('show'); $id('consent-ok').focus(); }
function closeConsent() { consentModal.classList.remove('show'); }
function agreeConsent() {
  consentMemo = true;
  try { sessionStorage.setItem(CONFIG.CONSENT_KEY, '1'); } catch (e) {}
  closeConsent();
  openModal();
}
// 진단 시작: 업로드 직전에 동의창(같은 탭에서는 한 번만)
function startDiagnosis() { hasConsent() ? openModal() : openConsent(); }

function openModal() { resetUpload(); modal.classList.add('show'); }
function closeModal() { modal.classList.remove('show'); resetUpload(); }

function clearError() { const el = $id('uploadMsg'); el.hidden = true; el.textContent = ''; }
function showError(info) {
  const el = $id('uploadMsg');
  el.textContent = '';
  const t = document.createElement('strong'); t.textContent = info.title; el.appendChild(t);
  [['원인', info.cause], ['해결', info.fix]].forEach(([k, v]) => {
    const s = document.createElement('span'); s.textContent = `${k}: ${v}`; el.appendChild(s);
  });
  el.hidden = false;
}

const STEPS = ['parse', 'match', 'calc'];
function showProgress(step) {
  $id('upload-view').hidden = true; $id('progress').hidden = false;
  const at = STEPS.indexOf(step);
  document.querySelectorAll('#progress li').forEach(li => {
    const i = STEPS.indexOf(li.dataset.step);
    li.className = i < at ? 'done' : i === at ? 'active' : '';
    li.querySelector('.st').textContent = i < at ? '✓ 완료' : i === at ? '진행 중…' : '대기';
  });
  $id('cancel-btn').textContent = '취소';
}
function hideProgress() { $id('progress').hidden = true; $id('upload-view').hidden = false; }
function resetUpload() {
  hideProgress(); clearError();
  $id('file').value = '';
  $id('fileText').textContent = 'HTML, JSON 또는 ZIP 파일 선택';
}

// 로고: asset/logo.png 를 넣으면 자동으로 표시, 없으면 기본 마크 유지
function loadLogo() {
  const img = $id('logo-img'); if (!img) return;
  const probe = new Image();
  probe.onload = () => { img.src = probe.src; img.hidden = false; const m = document.querySelector('.logo-mark'); if (m) m.style.display = 'none'; };
  probe.src = './asset/logo.png';
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (consentModal.classList.contains('show')) closeConsent();
  else if (modal.classList.contains('show')) (typeof running !== 'undefined' && running) ? cancelAnalysis() : closeModal();
});
