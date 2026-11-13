// 장르 분류 — data/genre_dictionary.json 기준 (임시 규칙, 팀 확정 전)
// 의존: matcher.js의 buildChannelIndex / matchChannel (뉴스 DB 25개는 채널 ID로 먼저 '뉴스·시사' 확정)
// 순수 계산만 한다(화면·저장 없음) → 노드에서 단독 테스트 가능.

const _LATIN = /^[a-z0-9 ]+$/;

// 사전 컴파일: 영문 키워드는 단어 경계(앞뒤가 영숫자가 아님)로, 한글은 부분 문자열로 일치
function compileDict(dict) {
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const comp = k => {
    k = k.toLowerCase();
    return _LATIN.test(k) ? { re: new RegExp('(^|[^a-z0-9])' + esc(k) + '($|[^a-z0-9])') } : { s: k };
  };
  const cats = dict.categories.filter(c => c.enabled && c.id !== 'other').map(c => c.id);
  const kw = {};
  cats.forEach(id => {
    const d = dict.keywords[id] || { strong: [], weak: [] };
    kw[id] = { strong: d.strong.map(comp), weak: d.weak.map(comp) };
  });
  return { cats, kw, dict };
}

function _hit(text, c) { return c.re ? c.re.test(text) : text.includes(c.s); }

// 텍스트 한 덩어리에 대한 카테고리별 점수 (strong·weak 가중치를 인자로 받음)
function _scoreText(text, compiled, wStrong, wWeak, into) {
  if (!text) return;
  const t = text.toLowerCase();
  compiled.cats.forEach(id => {
    let s = 0;
    compiled.kw[id].strong.forEach(c => { if (_hit(t, c)) s += wStrong; });
    compiled.kw[id].weak.forEach(c => { if (_hit(t, c)) s += wWeak; });
    if (s) into[id] = (into[id] || 0) + s;
  });
}

// 채널 하나의 장르 결정
function _assign(scores, compiled) {
  const r = compiled.dict.rules.step3_score;
  const order = compiled.dict.priority_order;
  const list = compiled.cats
    .map(id => [id, scores[id] || 0])
    .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]));
  const [top, second] = [list[0], list[1] || ['', 0]];
  if (top[1] >= r.min_top_score && top[1] >= r.min_ratio_to_second * second[1]) return { genre: top[0], score: top[1] };
  return { genre: 'other', score: top[1] };
}

/**
 * records: parseJSONHistory/parseHTMLHistory 결과 ([{channelId, channelName, watchedAt, title}])
 * newsChannels: channels.json 배열 / dict: genre_dictionary.json
 * opts.periodMonths: 기간 필터(없으면 전체)
 */
function classifyRecords(records, newsChannels, dict, opts) {
  opts = opts || {};
  const compiled = compileDict(dict);
  const newsIndex = buildChannelIndex(newsChannels);
  const w = dict.rules.step3_score.weights;
  const cutoff = opts.periodMonths ? (() => { const d = new Date(); d.setMonth(d.getMonth() - opts.periodMonths); return d; })() : null;

  let noChannel = 0, outOfPeriod = 0, withTitle = 0;
  const chans = new Map();   // key -> 채널 집계
  records.forEach(r => {
    if (!r.channelId && !r.channelName) { noChannel++; return; }
    if (cutoff && r.watchedAt && r.watchedAt < cutoff) { outOfPeriod++; return; }
    const key = r.channelId || 'name:' + r.channelName;
    let c = chans.get(key);
    if (!c) {
      c = { key, name: r.channelName || r.channelId, count: 0, scores: {}, titles: [], fixed: null };
      const news = matchChannel(r, newsIndex);
      if (news) c.fixed = 'news';
      else if (/ - topic$/i.test(r.channelName || '')) c.fixed = 'music';
      else _scoreText(r.channelName, compiled, w.strong_in_channel_name, w.weak_in_channel_name, c.scores);
      chans.set(key, c);
    }
    c.count++;
    if (r.title) {
      withTitle++;
      if (c.titles.length < 3) c.titles.push(r.title);
      if (!c.fixed) _scoreText(r.title, compiled, w.strong_in_title, w.weak_in_title, c.scores);
    }
  });

  const channels = [];
  const genreCounts = {};
  let usable = 0;
  chans.forEach(c => {
    const a = c.fixed ? { genre: c.fixed, score: null } : _assign(c.scores, compiled);
    c.genre = a.genre; c.score = a.score;
    channels.push({ key: c.key, name: c.name, count: c.count, genre: c.genre, score: c.score, titles: c.titles, fixed: !!c.fixed });
    genreCounts[c.genre] = (genreCounts[c.genre] || 0) + c.count;
    usable += c.count;
  });
  channels.sort((a, b) => b.count - a.count);

  const other = genreCounts.other || 0;
  return {
    total: records.length, noChannel, outOfPeriod, usable,
    titleRate: usable ? Math.round(withTitle / usable * 1000) / 10 : 0,   // 제목이 읽힌 비율(%): 낮으면 파서 문제
    genreCounts,
    classifiedRate: usable ? Math.round((usable - other) / usable * 1000) / 10 : 0,   // 기타가 아닌 비율(%)
    channels,
    otherTop: channels.filter(c => c.genre === 'other').slice(0, 20)
  };
}

// 장르별 비중(%) — 기타 포함
function genreShares(genreCounts) {
  const total = Object.values(genreCounts).reduce((a, b) => a + b, 0);
  const out = {};
  Object.keys(genreCounts).forEach(g => { out[g] = total ? genreCounts[g] / total * 100 : 0; });
  return out;
}

// 장르 편중도(HHI): 기타를 뺀 장르 비중으로 계산 (기타는 '장르'가 아니므로)
function genreHHI(genreCounts) {
  const c = { ...genreCounts }; delete c.other;
  const total = Object.values(c).reduce((a, b) => a + b, 0);
  if (!total) return null;
  return Math.round(Object.values(c).reduce((s, n) => s + Math.pow(n / total * 100, 2), 0));
}

// 유형 이름 결정 (dict.types 규칙) — 임시
function assignType(genreCounts, dict) {
  const T = dict.types, names = T.dominant_genre_names;
  const sh = genreShares(genreCounts);
  if ((sh.other || 0) > T.guard.other_share_over) return { type: null, note: T.guard.result };
  const gen = Object.keys(sh).filter(g => g !== 'other').sort((a, b) => sh[b] - sh[a]);
  if (!gen.length) return { type: null, note: T.guard.result };
  const top = sh[gen[0]], top2 = top + (gen[1] ? sh[gen[1]] : 0), used = gen.filter(g => sh[g] > 0).length;
  const nameOf = g => (dict.categories.find(c => c.id === g) || {}).name || g;
  if (top >= 40) return { type: names[gen[0]] || nameOf(gen[0]), note: '' };
  if (top < 25 && used >= 5) return { type: '장르 뷔페형', note: '' };
  if (top2 >= 60) return { type: '투 트랙형 (' + nameOf(gen[0]) + ' + ' + nameOf(gen[1]) + ')', note: '' };
  return { type: '다채로운 시청자형', note: '' };
}

if (typeof module !== 'undefined') module.exports = { compileDict, classifyRecords, genreShares, genreHHI, assignType };
