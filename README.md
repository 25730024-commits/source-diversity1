# 정보편식 진단기 (꼬꼬꼬몽)

YouTube 시청기록(Google Takeout)을 올리면 뉴스·시사 채널만 골라 HHI·CR3로 정보 소스 편중도를 진단하는 웹 대시보드입니다.
서버 없이 브라우저에서만 처리하며, 업로드한 파일은 저장하지 않습니다.

## 폴더 구조
```
index.html        메인 + 업로드 + 결과 대시보드
history.html      진단 이력(LocalStorage)
css/style.css
js/config.js      설정값(분석 기간, 최소 표본, 등급 구간)
js/parser.js      Takeout HTML/JSON 파싱
js/matcher.js     채널 ID ↔ 채널 DB 매칭
js/calc.js        점유율·HHI·CR3·등급 계산
js/messages.js    CR3 평가·이력 비교 문구(규칙 기반)
js/ui.js          동의창·업로드 창·진행 표시·오류 박스
js/dashboard.js   결과 화면 렌더링
js/storage.js     진단 이력 저장
js/app.js         진입점
data/channels.json        채널 DB
data/sample_history.json  예시 데이터(가짜 기록)
asset/logo.png  로고 파일을 이 이름으로 넣으면 자동 표시(없으면 기본 마크)
docs/CHANGELOG.md  수정 내역
```

## 실행 방법
`data/channels.json`을 `fetch`로 읽기 때문에 `index.html`을 더블클릭하면 동작하지 않습니다.
- VS Code **Live Server**로 열기, 또는
- GitHub Pages(Settings → Pages → main / root) 배포 주소에서 열기

## 채널 DB 갱신
`정보편식진단기_DB.xlsx` → 'JSON 내보내기' 시트 → 내용을 `data/channels.json`에 덮어쓰기.
형식: `[{ "id": "UC…", "name": "…", "type": "…", "group": "…" }]`

## 확정이 필요한 값 (js/config.js, js/matcher.js)
- 최소 표본: 계획서 10건 / DB 엑셀 30건 (현재 30)
- HHI 1단계 상한: 계획서 1,500 / DB 엑셀 초안 1,200 (현재 1,500, gradeIndex)
- 뉴스 판별: 채널 ID 일치 + 채널명 완전 일치만 사용. 키워드 보조 판별은 제외함

## 주의
- 실제 Takeout 파일(본인 시청기록)을 저장소에 올리지 않습니다. `.gitignore`에 제외 패턴이 있습니다.
- 파서는 실제 Takeout 파일로 형식을 확인해야 합니다. 특히 HTML의 날짜·채널 링크 구조.
