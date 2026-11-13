// 진단 이력 저장소 (브라우저 LocalStorage)
// 저장하는 것: 날짜·HHI·CR3·등급·채널별 비중 요약만. 원본 시청기록·영상 제목은 저장하지 않음.
const HistoryStore = {
  load() {
    try { return JSON.parse(localStorage.getItem(CONFIG.HISTORY_KEY)) || []; }
    catch (e) { return []; }
  },
  _save(list) {
    try { localStorage.setItem(CONFIG.HISTORY_KEY, JSON.stringify(list)); return true; }
    catch (e) { return false; }
  },
  add(entry) {
    const list = this.load();
    list.unshift(entry);
    return this._save(list.slice(0, CONFIG.MAX_HISTORY));
  },
  remove(id) { return this._save(this.load().filter(e => e.id !== id)); },
  clear() { return this._save([]); }
};

// 결과 객체(calc.js analyze 반환값) → 저장용 요약
function makeHistoryEntry(result) {
  const G = GRADES[result.gradeIndex];
  return {
    id: Date.now().toString(36),
    savedAt: new Date().toISOString(),
    hhi: result.hhi,
    cr3: Math.round(result.cr3 * 10) / 10,
    lv: G.lv,
    grade: G.name,
    newsCount: result.newsCount,
    channelCount: result.channels.length,
    top: result.channels.slice(0, 5).map(c => ({ name: c.name, share: Math.round(c.share * 10) / 10 }))
  };
}
