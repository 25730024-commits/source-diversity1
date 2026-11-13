// 채널 매칭: 시청기록의 채널 ID ↔ 채널 DB(channels.json)
// 1순위 채널 ID 일치, 보조로 채널명(표기 차이 정규화) 완전 일치.
// 키워드 판별은 쓰지 않음(DB 엑셀 방침). 계획서와 다르므로 팀 확정 필요.

// 이름 정규화: 소문자 + 공백·기호 제거
function norm(s) { return (s || '').toLowerCase().replace(/[\s\-_·.,'"()\[\]]/g, ''); }

function buildChannelIndex(channels) {
  const byId = new Map(), byName = new Map();
  channels.forEach(ch => {
    if (!ch.id) return;
    byId.set(ch.id, ch);
    if (norm(ch.name)) byName.set(norm(ch.name), ch);
  });
  return { byId, byName };
}

function matchChannel(record, index) {
  if (record.channelId && index.byId.has(record.channelId)) return index.byId.get(record.channelId);
  const n = norm(record.channelName);
  return n && index.byName.has(n) ? index.byName.get(n) : null;
}
