# maxVFX Photo Frame Print Tool — Handoff

## 최신 안정 기준

- 버전: **v0.4.2 Four-Up + 90° Photo Rotation**
- 기준일: 2026-10-04
- 저장소: kdc916/Photo_Frame_Print_Tool
- 배포: GitHub Pages / main root

## 절대 유지 기준

- 기준 사진: 89 × 119 mm
- A4 Portrait: 210 × 297 mm / 2480 × 3508 px @ 300 DPI
- A4 Landscape: 297 × 210 mm / 3508 × 2480 px @ 300 DPI
- A4 최대 4장
- 3장 선택 시 Landscape 자동 전환 및 Orientation UI 잠금
- slot.frame 독립 구조
- Photo → Bleed → Frame Overlay → Text 렌더 순서
- 사진/폰트 서버 업로드 없음

## v0.4.0 핵심 변경

### 1. SLOT_COUNT 3

- SLOT_COUNT = 3
- state.slots = [createSlot(0), createSlot(1), createSlot(2)]
- Layout UI: 1 / 2 / 3
- setLayout() 최대값 Math.min(3, ...)

### 2. 3장 자동 Landscape

setLayout(3) 시:

- state.orientation = landscape
- orientationSelect = landscape
- orientationSelect.disabled = true

1장 또는 2장으로 돌아가면 Orientation 선택을 다시 활성화한다.

### 3. Global A4 Fit Scale

state.layoutScale: 0.4 ~ 1.0

관련 함수:

- getGuideReserve()
- getLayoutMargin()
- getLayoutGap()
- getBaseFrameWidth(slot)
- getBaseSlotOuter(slot)
- getMaxFitScale()
- getLayoutScale()
- getSlotOuter(slot, scale)
- buildRect(slotIndex, x, y, scale)
- getLayoutRects()

실제 적용 배율:

getLayoutScale() = getMaxFitScale() × state.layoutScale

getMaxFitScale()는 최대 1.0으로 제한한다. 즉 기준 사진 크기보다 자동으로 더 크게 확대하지 않는다.

### 4. 3장 Fit 계산

3장에서는 Horizontal Layout만 사용한다.

- Page: A4 Landscape 297 × 210 mm
- 기본 최소 Margin: 3 mm
- 기본 최소 Gap: 2 mm
- Guide가 켜져 있으면 Margin >= guideOffset + 1 mm
- Guide가 켜져 있으면 Gap >= guideOffset × 2 + 1 mm

기본값:

- photo 89 mm
- frame 5 mm × 2
- outer width 99 mm
- 99 × 3 = 297 mm
- guideOffset 2 mm → margin 3 mm, gap 5 mm
- usable width = 297 - 6 - 10 = 281 mm
- fit = 281 / 297 ≈ 0.9461

따라서 기본 3장 실제 사진 크기는 약 84.2 × 112.6 mm, 프레임은 약 4.7 mm.

### 5. 전체 크기 슬라이더

UI:
- layoutScaleRange
- layoutScaleValue
- effectiveSizeText

슬라이더 100%는 현재 A4 Fit 결과의 최대값. 40%까지 추가 축소 가능.

같이 축소되는 값:

- photoW / photoH
- frame.width
- frame.radius
- frame.patternSize
- frame.patternGap
- photo offsetX / offsetY
- text size / text position offset

### 6. 프레임 ON/OFF

createDefaultFrame(): enabled = true

UI: frameEnabledToggle

OFF 시:

- drawFrame() return
- getBaseFrameWidth() = 0
- 레이아웃 외곽에서 프레임 두께 제외
- hitFrame()에서 선택 대상 제외
- 프레임/패턴 컨트롤 disabled

사진 자체는 그대로 유지한다.

### 7. Copy 동작 3슬롯 대응

사진 / 프레임 / 텍스트 복사는 현재 슬롯을 제외한 나머지 슬롯 전체에 복사한다.

## v0.3.2 회귀 방지

장식 패턴 dots/diamonds/stars/hearts/flowers는 roundedPerimeterMetrics(), pointOnRoundedPerimeter(), actualStep = perimeter / count, phase = actualStep × 0.5 기반의 Continuous Perimeter 배치를 유지한다.

네 변 독립 배열 방식으로 되돌리지 않는다.

## 정적 검증

- JavaScript Syntax: OK
- JS DOM ID 누락: 0
- Layout 3 UI 존재
- SLOT_COUNT 3
- createSlot(2) 존재
- setLayout 최대 3
- 3장 자동 Landscape 존재
- frameEnabledToggle 연결
- Frame OFF Geometry = width 0
- Global Fit Scale 존재
- Pattern Size / Gap Global Scale 적용
- Direct Frame Selection 유지
- Continuous Perimeter Pattern 유지

## 다음 개발 후보

- 패턴 Angle / Opacity
- 사용자 PNG 패턴
- 프레임/패턴 프리셋 LocalStorage
- 어린이집용 스티커
- Calibration Ruler
- PDF Export

## 새 채팅 시작용 프롬프트

maxVFX Photo Frame Print Tool v0.4.0을 이어서 개발한다. GitHub kdc916/Photo_Frame_Print_Tool main이 최신 기준이다. 기준 사진은 89×119mm이며 A4 최대 3장이다. 3장 선택 시 Landscape를 강제하고 getMaxFitScale()로 재단 가이드와 슬롯 간격까지 고려한 최대 맞춤 크기를 계산한다. 실제 배율은 getMaxFitScale() × state.layoutScale이며 전체 크기 슬라이더는 사진/프레임/패턴을 함께 축소한다. frame.enabled가 false이면 프레임 렌더와 레이아웃 프레임 두께를 모두 0으로 처리한다. v0.3.2 Continuous Perimeter Pattern 및 Photo Bleed → Frame Overlay 구조를 유지한다. 최종 결과는 GitHub main 반영 + ZIP + 누적 HANDOFF.md로 제공한다.


## v0.4.2 추가 변경

- SLOT_COUNT를 4로 확장
- 4장 선택 시 A4 Portrait 2×2 Grid 사용
- 4장 Fit Scale은 각 열의 최대 폭과 각 행의 최대 높이를 기준으로 계산
- slot.quarterTurn 추가: 0 / 90 / 180 / 270
- 기존 slot.rotation은 -15°~+15° 미세 회전으로 유지
- 실제 렌더 회전 = quarterTurn + rotation
- 90°/270° 상태에서는 fitScale()이 naturalWidth / naturalHeight를 교환
- rotate90LeftBtn / rotate90RightBtn / quarterTurnValue UI 추가
- 사진 맞춤은 quarterTurn=0으로 복귀
- 사진 복사 시 quarterTurn 상태 유지

### 회귀 방지

- 4장 레이아웃은 1,2 / 3,4 순서의 2×2 배치 유지
- 3장은 Landscape 자동 고정
- 4장은 Portrait 자동 고정
- 90°/270° 회전에서 프레임 안에 빈 영역이 생기지 않도록 rotated fit 계산 유지
