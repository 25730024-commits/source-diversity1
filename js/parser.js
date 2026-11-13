// Takeout 시청기록 파싱 → 기록 배열
// 반환 형식: [{ channelId: 'UC…' | null, channelName: string | null, watchedAt: Date | null, title: string }]
// title = 영상 제목(장르 분류용). 분류에만 쓰이며 저장·전송하지 않음 → 동의 모달·동의서 문구 수정 필요
// ※ 실제 Takeout 파일로 형식을 직접 확인해야 합니다(DB 엑셀 'Takeout 가이드' 참고).

function extractChannelId(url) {
  const m = (url || '').match(/\/channel\/(UC[\w-]{20,})/);
  return m ? m[1] : null;
}

function toDate(v) {
  const d = new Date(v);
  return isNaN(d) ? null : d;
}

// '2025. 10. 3. 오후 3:12' 또는 '2025-10-03…' 형태에서 날짜 추출
function parseDateText(text) {
  let m = (text || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return toDate(`${m[1]}-${m[2]}-${m[3]}`);
  m = (text || '').match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./);
  if (m) return toDate(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`);
  return null;
}

// 'Watched 제목' / '제목을(를) 시청했습니다.' 형태에서 제목만 남김 (※ 실제 파일로 확인 필요)
function cleanTitle(t) {
  return (t || '').replace(/^Watched\s+/i, '').replace(/\s*(을\(를\)|을|를)\s*시청했습니다\.?$/, '').trim();
}

function parseJSONHistory(arr) {
  if (!Array.isArray(arr)) throw new Error('시청기록 JSON이 배열이 아닙니다');
  return arr.map(item => {
    const sub = item.subtitles && item.subtitles[0];
    const name = (sub && sub.name) || item.channelTitle || null;
    const url = (sub && sub.url) || item.channelUrl || '';
    return {
      channelId: extractChannelId(url) || item.channelId || null,
      channelName: name,
      watchedAt: item.time ? toDate(item.time) : null,
      title: cleanTitle(item.title)
    };
  });
}

function parseHTMLHistory(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, 'text/html');
  let cells = doc.querySelectorAll('.outer-cell');
  if (cells.length === 0) cells = doc.querySelectorAll('.content-cell');
  const records = [];
  cells.forEach(cell => {
    const content = cell.querySelector('.content-cell') || cell;
    const links = content.querySelectorAll('a');
    // 보통 a[0] = 영상, a[1] = 채널. 채널 정보가 없으면(삭제·비공개·광고) 건너뜀 표시용으로 빈 기록 추가
    const ch = links.length >= 2 ? links[1] : null;
    records.push({
      channelId: ch ? extractChannelId(ch.getAttribute('href')) : null,
      channelName: ch ? ch.textContent.trim() || null : null,
      watchedAt: parseDateText(content.textContent),
      title: links.length ? links[0].textContent.trim() : ''
    });
  });
  return records;
}
