# maxVFX Photo Frame Print Tool — Handoff

## 최신 안정 기준

- 버전: **v0.3.2 Continuous Perimeter Pattern Spacing**
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

## v0.3.2 변경 내용

### 문제

v0.3.1의 장식 패턴은 프레임 각 변을 독립적으로 균등 분배했다.
이 때문에 top/right, right/bottom 같은 모서리에서 각 변의 첫/마지막 패턴이 서로 가까워져 2개가 고정된 것처럼 보일 수 있었다.

### 해결

drawRegularEdgeSymbols()를 네 변 독립 계산 방식에서 전체 Rounded Rectangle Perimeter 방식으로 변경했다.

추가 함수:
- roundedPerimeterMetrics(g, ppm, frame)
- pointOnRoundedPerimeter(metrics, distance)

알고리즘:
1. 프레임 띠 중앙선을 기준으로 둥근 사각형 center path 계산
2. 직선 길이 + 4개 quarter arc 길이로 전체 perimeter 계산
3. desiredStep = patternSize + patternGap 기준으로 count 결정
4. actualStep = perimeter / count 로 남는 길이를 전체 둘레에 균등 분배
5. phase = actualStep * 0.5 로 시작해 모서리나 특정 축에 패턴이 고정되지 않도록 처리
6. 모든 패턴은 phase + index * actualStep 위치에서 하나의 연속 경로를 따라 배치

결과:
- 모서리 중복 패턴 제거
- 직선/곡선 모두 동일 중심 간격
- 패턴 크기 변경 시 개수 자동 변화
- Preview / 300 DPI Export에서 동일 배치

### 적용 패턴

- dots
- diamonds
- stars
- hearts
- flowers

## 회귀 금지

장식형 패턴을 다시 top/bottom/left/right 네 변별 배열로 분리하지 않는다.
특히 모서리에 각 변의 패턴이 각각 하나씩 생겨 2개가 붙는 구조로 돌아가면 안 된다.

패턴 간격은 단순 고정 개수가 아니라 Pattern Size + Pattern Gap을 기준으로 전체 둘레의 count를 계산하고 actualStep으로 재분배해야 한다.

## v0.3.1 유지

- 장식형 패턴은 frame band 중심에 위치
- Pattern Size는 frame.width에 맞춰 자동 제한
- Preview에서 frame band 클릭 → 슬롯 활성화 → framePatternSection 자동 이동
- 체크 / 줄무늬 / 물결 / 지그재그 중심 정렬

## 정적 검증

- JavaScript Syntax: OK
- JS DOM ID 누락: 0
- continuous rounded perimeter 함수 존재
- actualStep = perimeter / count 존재
- half-step phase 존재
- 이전 cornerInset + 네 변 독립 배치 제거
- Direct Frame Selection 유지
- Pattern Size Guard 유지
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

maxVFX Photo Frame Print Tool v0.3.2를 이어서 개발한다. GitHub kdc916/Photo_Frame_Print_Tool main이 최신 기준이다. A4 최대 2장, 89×119mm, 300DPI, slot.frame 독립 구조를 유지한다. dots/diamonds/stars/hearts/flowers는 roundedPerimeterMetrics + pointOnRoundedPerimeter 기반으로 프레임 전체 둘레를 하나의 연속 경로로 배치한다. Pattern Size + Gap으로 count를 구한 뒤 actualStep = perimeter/count로 전체 간격을 균등 분배하고 half-step phase를 유지한다. 네 변 독립 배치로 되돌리지 않는다. A4 미리보기 프레임 직접 선택 및 Photo Bleed → Frame Overlay 구조도 유지한다. 최종 결과는 GitHub main 반영 + ZIP + 누적 HANDOFF.md로 제공한다.
