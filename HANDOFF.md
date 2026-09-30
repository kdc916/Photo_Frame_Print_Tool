# maxVFX Photo Frame Print Tool — Handoff

## 최신 안정 기준

- 버전: **v0.3.1 Pattern Alignment & Direct Frame Selection**
- 기준일: 2026-10-01
- 저장소: kdc916/Photo_Frame_Print_Tool
- 배포: GitHub Pages / main root

## 절대 유지 기준

- 기본 사진 영역: 89 × 119 mm
- A4 Portrait: 210 × 297 mm / 2480 × 3508 px @ 300 DPI
- A4 Landscape: 297 × 210 mm / 3508 × 2480 px @ 300 DPI
- A4 한 장 최대 2장
- slot.frame 독립 구조
- Photo → Bleed → Frame Overlay → Text 렌더 순서
- 사진/폰트 서버 업로드 없음

## v0.3.1 변경 내용

### 1. 패턴 정렬 재설계

문제:
- 다이아몬드처럼 큰 패턴이 프레임 띠 전체 타일 방식으로 렌더되어 inner/outer clip에 반쯤 잘림
- 모서리에서 패턴 시작/종료가 어색하게 보임
- 패턴 크기를 키울수록 정렬 불균형이 눈에 띔

수정:
- dots / diamonds / stars / hearts / flowers를 Perimeter Symbol 방식으로 통합
- 프레임 두께 중심선에 패턴 배치
- cornerInset을 계산해 네 모서리에는 안전영역 확보
- linePositions()로 각 변별 패턴 개수를 계산하고 실제 간격을 균등 재분배
- 요청 Pattern Size가 프레임 폭보다 크면 band 기준으로 자동 제한
- syncFrameControls에서 장식형 패턴의 Size Range max를 현재 frame.width 기준으로 갱신
- frame width / pattern type 변경 시 normalizePatternSize()를 호출해 UI값과 실제 렌더 크기를 일치

다이아몬드는 기존 전체 타일 렌더를 제거하고 drawRegularEdgeSymbols + drawDiamond 방식으로 변경했다.

### 2. 반복형 패턴 중심 정렬

- checker: 프레임 중심점 기준으로 tile origin 계산
- stripes: diagonal phase를 frame center 기준으로 정렬
- waves / zigzag: 상하 중심 기준으로 row 위치 균등 배치

### 3. Preview Direct Frame Selection

A4 Canvas에서 프레임 자체를 클릭해 활성 슬롯 변경 가능.

동작:
- 사진 내부 클릭: 현재 사진 활성화 + drag 시작
- 프레임 띠 클릭: 현재 프레임 활성화
- 프레임 클릭 시 framePatternSection으로 smooth scroll
- framePatternSection에 약 1.2초 highlight
- 선택 프레임은 outer frame 바깥쪽 점선으로 표시
- hover cursor: Photo = grab / Frame = pointer

관련 함수:
- hitPhoto()
- hitFrame()
- activateSlot()
- focusFrameEditor()

## 패턴 회귀 방지

장식형 패턴(dots/diamonds/stars/hearts/flowers)은 다시 프레임 전체 타일 방식으로 되돌리지 않는다.

특히 diamonds는 프레임 띠 중앙선에 균일 배치해야 하며 사진 안쪽으로 큰 삼각형/반쪽 다이아가 보이는 상태로 회귀하면 안 된다.

## v0.3.0 유지

- A4 최대 2장
- 1/2번 독립 Frame State
- backgroundColor + pattern layer 분리
- Pattern Color1 / Color2 / Size / Gap / Random / Seed
- deterministic random
- 프레임 설정 다른 칸 복사

## 정적 검증

- JavaScript Syntax: OK
- JS DOM ID 누락: 0
- framePatternSection 존재
- hitFrame direct selection 존재
- diamond perimeter renderer 존재
- corner-safe regular pattern 존재
- centered checker / stripe 존재
- outer frame selection 표시 존재
- Photo Bleed 유지

## 다음 개발 후보

- 패턴 회전 Angle
- 패턴 Opacity
- 사용자 PNG 패턴 타일
- 사용자 프레임/패턴 프리셋 LocalStorage
- 어린이집용 스티커
- 프린터 Calibration Ruler
- PDF Export

## 새 채팅 시작용 프롬프트

maxVFX Photo Frame Print Tool v0.3.1을 이어서 개발한다. GitHub kdc916/Photo_Frame_Print_Tool main이 최신 기준이다. A4 최대 2장, 89×119mm, 300DPI, slot.frame 독립 구조를 유지한다. dots/diamonds/stars/hearts/flowers는 frame band center 기반 Perimeter Symbol 방식이며 corner-safe 균등 배치를 유지한다. A4 미리보기에서 프레임 띠를 클릭하면 해당 슬롯이 선택되고 framePatternSection으로 이동하는 UX도 유지한다. Photo Bleed → Frame Overlay 구조를 변경하지 않는다. 최종 결과는 GitHub main 반영 + ZIP + 누적 HANDOFF.md로 제공한다.
