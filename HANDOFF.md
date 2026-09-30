# maxVFX Photo Frame Print Tool — Handoff

## 최신 안정 기준

- 버전: **v0.3.0 Independent Frame & Pattern Engine**
- 기준일: 2026-10-01
- 저장소: kdc916/Photo_Frame_Print_Tool
- 배포: GitHub Pages / main 브랜치 root

## 절대 유지 기준

- A4 Portrait 210 × 297 mm → 2480 × 3508 px @ 300 DPI
- A4 Landscape 297 × 210 mm → 3508 × 2480 px @ 300 DPI
- 기본 사진 영역 89 × 119 mm
- A4 한 장 최대 2장
- 저장 시 mm 데이터에서 300 DPI로 다시 렌더링
- 사진/폰트 서버 업로드 없음
- 외부 CDN/API 없이 기본 편집과 출력 가능

## v0.3.0 핵심 변경

### 1. 4장 배치 제거

이전 2×2 4장 배치에서는 89×119 mm 사진 + 프레임 + 재단 가이드가 A4에서 서로 겹칠 수 있었다.

현재 layout 값은 1 또는 2만 허용하고 코드에서도 Math.min(2, ...)로 최대값을 방어한다. 4장 UI 및 렌더 분기는 제거했다.

### 2. 2장 자동 레이아웃

각 슬롯의 프레임 두께가 서로 다를 수 있으므로 프레임 외곽 크기를 슬롯별로 계산한다.

- Portrait 우선: 세로 스택
- Landscape 우선: 가로 스택
- 지정 방향에서 공간이 부족하면 반대 배치 방식 자동 검토
- 슬롯 외곽 사이 기본 간격: 8 mm
- 가이드 포함 A4 영역 초과 여부 상태 표시

### 3. 슬롯별 독립 Frame State

전역 state.frame을 제거했다.

각 slot.frame이 다음을 독립 저장한다.

- style
- backgroundColor
- lineColor
- width
- radius
- pattern
- patternColor1
- patternColor2
- patternSize
- patternGap
- patternRandom
- patternSeed
- texture
- textureStrength
- presetIndex

따라서 1번은 핑크 도트, 2번은 민트 별처럼 완전히 다르게 설정 가능하다.

### 4. Pattern Engine

지원 패턴:

1. none
2. dots
3. stripes
4. checker
5. diamonds
6. stars
7. hearts
8. flowers
9. waves
10. zigzag
11. confetti
12. sprinkles
13. crayon

#### 도트 패턴 규칙

도트는 난수로 찍지 않는다.

linePositions(start, end, desiredStep)로 각 변 길이에서 표시 개수를 계산한 후 실제 간격을 균등 분배한다.

- 모든 도트 반지름 동일
- 각 변에서 균일 간격
- 둥근 모서리 영역은 inset 처리
- patternRandom이 도트에 영향을 주지 않음

회귀 금지: 도트 좌표를 프레임 전체 난수 배치 방식으로 되돌리지 않는다.

#### 랜덤 패턴

컨페티/스프링클/크레용 및 일부 장식 패턴은 해시 기반 deterministic random 사용.

- 같은 seed → 항상 같은 결과
- 미리보기와 300 DPI 저장 결과 배열 일치
- 화면 재렌더 시 패턴 위치가 흔들리지 않음
- Random Seed 버튼으로 새 배치 생성

### 5. Pattern Control

- 패턴 종류
- Pattern Color 1
- Pattern Color 2
- Pattern Size
- Pattern Gap
- Randomness
- Seed

프레임 배경 단색과 패턴은 분리된 레이어다.

### 6. Frame Copy

프레임 설정을 다른 칸에 복사는 frame 객체만 deep copy한다. 사진/텍스트는 변경하지 않는다.

## v0.2.0 회귀 방지

프레임과 사진 경계는 Photo → 0.18~0.45 mm Bleed → Frame Overlay → Text 순서를 유지한다.

폰트는 Local Font Access와 TTF / OTF / WOFF / WOFF2 직접 로드를 유지하고 업로드 파일은 서버로 보내지 않는다.

## 정적 검증 결과

- JavaScript Syntax: OK
- JS DOM ID 누락: 0
- 4장 레이아웃 코드/UI: 없음
- 최대 2장 방어 코드: 있음
- slot.frame 독립 상태: 있음
- deterministic dot renderer: 있음
- 12개 신규 패턴 renderer: 있음
- patternSeed: 있음
- Photo Bleed → Frame Overlay: 유지

## 다음 패치 후보

- 어린이집용 스티커 레이어
- 스티커 이동·회전·크기
- 사용자 프레임/패턴 프리셋 LocalStorage 저장
- 사용자 패턴 이미지 업로드
- 투명 PNG 패턴 타일 지원
- 패턴 회전 각도
- 패턴 불투명도
- 프린터 100 mm Calibration Ruler
- PDF 직접 Export

## 새 채팅 시작용 프롬프트

maxVFX Photo Frame Print Tool v0.3.0을 이어서 개발한다. GitHub kdc916/Photo_Frame_Print_Tool main을 최신 기준으로 사용한다. A4 한 장 최대 2장, 기본 사진 89×119mm, 300DPI 출력, slot.frame 독립 구조를 유지한다. 도트는 linePositions 기반 균등 배치이며 난수 배치로 되돌리지 않는다. Photo Bleed → Frame Overlay 흰 seam 방지 구조도 유지한다. 현재 패턴은 dots/stripes/checker/diamonds/stars/hearts/flowers/waves/zigzag/confetti/sprinkles/crayon이며 Size/Gap/Random/Seed/Color1/Color2가 슬롯별 독립이다. 최종 작업은 GitHub main 반영 + ZIP + 누적 HANDOFF.md로 제공한다.
