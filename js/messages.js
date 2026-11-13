// 규칙 기반 문구 (외부 AI 미사용 · 판단 없이 수치만 서술)
function cr3Label(cr3) {
  if (cr3 < 50) return '분산형 · 다양한 매체를 골고루 접함';
  if (cr3 <= 70) return '집중형 · 사실상 3개 이하 매체에 집중';
  return '과점·독점형 · 소수 매체에만 의존';
}

function basisItems(r) {
  const n = v => v.toLocaleString();
  return [
    `분석 기간: 업로드한 날 기준 최근 ${CONFIG.PERIOD_MONTHS}개월`,
    '집계 기준: 시청 횟수 (같은 영상을 다시 본 기록도 포함)',
    `분석 대상: 채널 DB에 등록된 뉴스·시사 채널 ${n(r.channels.length)}개의 시청 ${n(r.newsCount)}회`,
    `제외된 기록: 기간 밖 ${n(r.outOfPeriod)} · 채널 DB에 없는 채널 ${n(r.unmatched)} · 채널 정보 없음 ${n(r.noChannel)} (전체 ${n(r.rawCount)}회)`,
    `최소 표본: 뉴스·시사 시청이 ${CONFIG.MIN_SAMPLE}회 이상일 때만 진단합니다`,
    '등급 구간은 기업결합 심사의 시장집중도(HHI) 기준을 참고한 상대 지표이며 법적·학술적 판정 기준이 아닙니다. 채널의 정치 성향이나 좋고 나쁨은 판단하지 않습니다.'
  ];
}

// 두 진단 비교 (a=이전, b=이후)
function compareEntries(a, b) {
  const diff = b.hhi - a.hhi;
  const pct = a.hhi ? (Math.abs(diff) / a.hhi) * 100 : 0;
  const range = `(HHI ${a.hhi.toLocaleString()} → ${b.hhi.toLocaleString()})`;
  const sentence = diff === 0 ? `두 진단의 HHI가 같습니다 ${range}.`
    : diff < 0 ? `이전 진단보다 편중도가 ${pct.toFixed(1)}% 개선되었습니다 ${range}.`
    : `이전 진단보다 편중도가 ${pct.toFixed(1)}% 높아졌습니다 ${range}.`;
  const na = a.top.map(c => c.name), nb = b.top.map(c => c.name);
  const added = nb.filter(x => !na.includes(x)), removed = na.filter(x => !nb.includes(x));
  const top = (added.length || removed.length)
    ? `상위 채널 변화 — 새로 들어옴: ${added.join(', ') || '없음'} / 빠짐: ${removed.join(', ') || '없음'}`
    : '상위 채널 구성은 같습니다.';
  const rows = [
    ['HHI', a.hhi.toLocaleString(), b.hhi.toLocaleString()],
    ['등급', `${a.lv} ${a.grade}`, `${b.lv} ${b.grade}`],
    ['CR3', `${a.cr3}%`, `${b.cr3}%`],
    ['뉴스·시사 시청', `${a.newsCount.toLocaleString()}회`, `${b.newsCount.toLocaleString()}회`],
    ['시청 채널 수', `${a.channelCount}개`, `${b.channelCount}개`]
  ];
  return { sentence: sentence + ' (수치 기반 분석 결과입니다.)', top, rows };
}
