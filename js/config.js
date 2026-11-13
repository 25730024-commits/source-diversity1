// 설정값 모음 — 팀 확정 전 값은 여기만 고치면 됩니다.
const CONFIG = {
  CHANNELS_URL: './data/channels.json',      // 채널 DB (엑셀 'JSON 내보내기'로 만든 파일을 덮어쓰면 됨)
  SAMPLE_URL: './data/sample_history.json',  // 예시 데이터(가짜 기록)
  PERIOD_MONTHS: 6,   // 분석 기간(최근 N개월). DB 엑셀 '계산 규칙' 기준
  MIN_SAMPLE: 30,     // 최소 표본. 계획서는 10건, DB 엑셀은 30건(잠정) → 팀 확정 필요
  CONSENT_KEY: 'jbp_consent',                // 동의 기억(같은 탭에서만)
  HISTORY_KEY: 'jbp_diagnosis_history',      // LocalStorage 키
  MAX_HISTORY: 20
};

// 등급 정의 (색상은 텍스트·단계와 함께 표시). HHI 구간은 gradeIndex()에서 정함 → 팀 확정 필요(1,500 vs 1,200)
const GRADES = [
  { lv: '1단계', name: '다양성 양호', desc: '다양한 시사·뉴스 매체를 균형 있게 시청하고 있습니다.',          color: '#1F7A52', soft: '#E6F4EC' },
  { lv: '2단계', name: '편중 주의',   desc: '특정 2~3개 시사 채널의 시청 비중이 다소 높습니다.',            color: '#A86A0A', soft: '#FBF1DD' },
  { lv: '3단계', name: '고도 편중',   desc: '소수 뉴스 채널에 시청이 집중되어 있습니다.',                  color: '#C2410C', soft: '#FDEBDD' },
  { lv: '4단계', name: '정보 고립',   desc: '1~2개 시사 채널에 뉴스 소비가 거의 완전히 집중되어 있습니다.', color: '#B42318', soft: '#FCE7E5' }
];
function gradeIndex(hhi){ return hhi < 1500 ? 0 : hhi < 2500 ? 1 : hhi <= 5000 ? 2 : 3; }
