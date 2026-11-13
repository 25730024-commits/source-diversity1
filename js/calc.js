// 편중도 계산 (화면과 무관한 순수 계산) — 테스트 데이터로 단독 검증 가능
// 1단계 matchRecords: 기간 필터 + 채널 DB 매칭 / 2단계 computeResult: 점유율·HHI·CR3·등급
function matchRecords(records, channels) {
  const index = buildChannelIndex(channels);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - CONFIG.PERIOD_MONTHS);
  let noChannel = 0, outOfPeriod = 0, unmatched = 0, newsCount = 0;
  const counts = new Map();
  records.forEach(r => {
    if (!r.channelId && !r.channelName) { noChannel++; return; }   // 채널 정보 없음(삭제·비공개·광고)
    if (r.watchedAt && r.watchedAt < cutoff) { outOfPeriod++; return; }
    const ch = matchChannel(r, index);
    if (!ch) { unmatched++; return; }                              // DB 밖 채널은 계산에서 제외
    newsCount++;
    const e = counts.get(ch.id) || { id: ch.id, name: ch.name, type: ch.type, group: ch.group, count: 0 };
    e.count++;
    counts.set(ch.id, e);
  });
  return { rawCount: records.length, noChannel, outOfPeriod, unmatched, newsCount, counts };
}

function computeResult(t) {
  const { counts, ...base } = t;
  if (base.newsCount < CONFIG.MIN_SAMPLE) return { ...base, status: 'insufficient' };
  const channels = [...counts.values()]
    .map(c => ({ ...c, share: (c.count / base.newsCount) * 100 }))
    .sort((a, b) => b.count - a.count);
  const hhi = Math.round(channels.reduce((s, c) => s + c.share * c.share, 0));
  const cr3 = channels.slice(0, 3).reduce((s, c) => s + c.share, 0);
  return { ...base, status: 'ok', hhi, cr3, gradeIndex: gradeIndex(hhi), channels };
}

function analyze(records, channels) { return computeResult(matchRecords(records, channels)); }
