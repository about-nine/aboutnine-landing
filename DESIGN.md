# About Nine — Design System

> **Website:** https://about-nine.onrender.com  
> **App Type:** Mobile-first PWA (Progressive Web App), portrait-only  
> **Tech stack:** Vanilla HTML/CSS/JS · Flask backend · Firebase · Agora RTC

---

## 1. Overview

About Nine는 음성 기반 소셜 매칭 앱이다. 브랜드 성격은 **침묵, 밤, 친밀감**이다.

| 항목 | 설명 |
|---|---|
| 테마 | Dark-only. 밝은 모드 없음 |
| 색조 | 딥 챠콜 그라데이션 배경 위 퍼플-블루 액센트 |
| 폰트 성격 | Merriweather(세리프) 브랜드 헤드라인 + 시스템 산세리프 UI |
| 텍스트 케이스 | 전체 `text-transform: lowercase` 강제 적용 (카테고리 레이블 예외) |
| 컨테이너 | 최대 480px 고정, 화면 중앙 배치 |
| 핵심 감성 | 감각적, 조용한 밤, 음악과 목소리 |

---

## 2. Colors

모든 색상은 `:root` CSS 변수로 정의됨.

### Brand / Accent

| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.accent.blue}` | `#5b7fff` | 채팅 버블(mine), 전송 버튼 |
| `{colors.accent.purple}` | `#7b5bff` | 포커스 보더, 링크 hover, 슬라이더 |
| `{colors.accent.yellow}` | `#f4c542` | 음소거 active 상태 |

### Gradient Presets

| 토큰 | 값 | 용도 |
|---|---|---|
| `{gradient.primary}` | `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` | Primary 버튼 |
| `{gradient.cta.overlay}` | `linear-gradient(135deg, #ff6ec4 0%, #7873f5 100%)` | 오버레이 모달 주요 CTA |
| `{gradient.chat.mine}` | `linear-gradient(135deg, #5b7fff, #7b5bff)` | 내 채팅 버블 |
| `{gradient.avatar}` | `linear-gradient(135deg, #c471ed 0%, #f64f59 100%)` | 채팅 아바타 |
| `{gradient.bg.body}` | `linear-gradient(180deg, #4a4a4a 0%, #1a1a1a 100%)` | 전체 페이지 배경 |
| `{gradient.mood}` | `linear-gradient(135deg, #667eea, #764ba2, #f093fb)` | 플레이리스트 모달 (앨범 색상 동적 교체됨) |

### Surface

| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.bg.dark}` | `#2a2a2a` | 탭 active 배경, bottom nav base |
| `{colors.bg.darker}` | `#1f1f1f` | 포커스 시 인풋 배경, chemistry 카드 bg |
| `{colors.bg.card}` | `#3a3a3a` | 카드, 채팅 셀렉트, 탭 컨테이너 |
| `{colors.bg.chat.bubble}` | `#525252` | 상대방 채팅 버블, 컨트롤 버튼 |
| `{colors.bg.search}` | `#2b2b2b` | 검색 인풋 배경 |
| `{colors.bg.life.card}` | `#d9d9d9` | 라이프 가이드 카드 (유일한 밝은 표면) |
| `{colors.overlay.modal}` | `rgba(0, 0, 0, 0.88)` | 오버레이 모달 배경 |
| `{colors.overlay.loading}` | `rgba(0, 0, 0, 0.90)` | 로딩 오버레이 |

### Text

| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.text.primary}` | `#ffffff` | 주요 텍스트, 활성 탭, 기본 버튼 배경 |
| `{colors.text.secondary}` | `#b0b0b0` | 부제목, placeholder, 비활성 nav |
| `{colors.text.muted}` | `rgba(255, 255, 255, 0.65)` | 약관 본문 텍스트 |
| `{colors.text.brand.gray}` | `#8e8e8e` | 상단 브랜드 레이블 ("about nine") |

### Semantic

| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.status.error}` | `#ff6b6b` | 에러 메시지 |
| `{colors.status.success}` | `#4ecb71` | 성공 메시지, 온라인 상태 도트 |
| `{colors.status.end.call}` | `#ff4444` | 통화 종료 버튼 |

### Border

| 토큰 | 값 | 용도 |
|---|---|---|
| `{colors.border.default}` | `#4a4a4a` | 인풋, 카드, 모달 보더 |
| `{colors.border.subtle}` | `rgba(255, 255, 255, 0.20)` | 카드, 채팅 버블, 검색 인풋 |
| `{colors.border.faint}` | `rgba(255, 255, 255, 0.10)` | 모달 푸터 구분선, 트랙 아이템 |

---

## 3. Typography

### Font Families

| 토큰 | 값 | 용도 |
|---|---|---|
| `{font.brand}` | `"Merriweather", serif` | 브랜드 헤드라인, 모달 타이틀, 채팅 컨테이너, 대기 화면 |
| `{font.ui}` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif` | 버튼, 인풋, 일반 UI 텍스트 |

> Merriweather는 Google Fonts에서 weight 400, 700만 로드됨.

### Type Scale

| 역할 | 폰트 | 크기 | 웨이트 | 행간 | 자간 | 토큰 예 |
|---|---|---|---|---|---|---|
| Policy Title | Merriweather | 34px | 400 | 1.15 | −0.5px | `{type.policy.title}` |
| H1 / Page Title | System | 32px | 600 | 1.2 | — | `{type.h1}` |
| Brand Headline | Merriweather | 28px | 600 | 1.1 | −1px | `{type.brand}` |
| H2 | System | 24px | 600 | 1.2 | — | `{type.h2}` |
| Overlay Title | Merriweather | 22px | 700 | — | — | `{type.overlay.title}` |
| Modal Title | Merriweather | 22px | 600 | — | — | `{type.modal.title}` |
| Body / Voice Timer | System | 16px | 400/600 | 1.6 | — | `{type.body}` |
| Button | System (inherit) | 16px | 600 | — | — | `{type.button}` |
| Input | System | 16px | 400 | — | — | `{type.input}` |
| Track Name | System | 15px | 500 | — | — | `{type.track.name}` |
| Sub Text / Overlay | System | 14px | 400 | 1.5 | — | `{type.sub}` |
| Slide Sub | System | 13px | 400 | 1.6 | — | `{type.slide.sub}` |
| Chat Bubble | Merriweather | 13px | 400 | 1.5 | — | `{type.chat.bubble}` |
| Body P / List | System | 13px | 400 | 1.6 | — | `{type.body.sm}` |
| Label / Status | System | 12px | 400/500 | — | — | `{type.label}` |
| Code Input | System | 24px | 600 | — | — | `{type.otp}` |
| Voice Timer | Merriweather | 16px | 600 | — | 2px | `{type.timer}` |
| Life Card | System | 12px | 600 | — | — | `{type.life.card}` |
| Category Label | System | 14px | 400 | — | 0.2em | `{type.category}` (uppercase 예외) |

> **H1 responsive:** 480px→28px, 420px→26px, 360px→24px

---

## 4. Layout

### Container System

| 토큰 | 값 | 용도 |
|---|---|---|
| `{layout.container.maxWidth}` | `480px` | 전체 앱 최대 너비 |
| `{layout.container.padding.x}` | `20px` | 기본 좌우 패딩 |
| `{layout.container.padding.x.sm}` | `16px` | 420px 이하 |
| `{layout.container.padding.x.xs}` | `14px` | 360px 이하 |
| `{layout.container.padding.top}` | `156px + safe-top` | 기본 상단 패딩 |
| `{layout.container.padding.bottom}` | `30px + safe-bottom` | 기본 하단 패딩 |
| `{layout.bottomNav.height}` | `70px` | 하단 네비게이션 높이 |

### Spacing Scale

| 토큰 | 값 | 주요 용도 |
|---|---|---|
| `{spacing.xs}` | `4px` | 탭 내부 패딩, 소 간격 |
| `{spacing.sm}` | `6px` | 채팅 버블 수직 패딩, 버튼 패딩 내부 |
| `{spacing.md}` | `8px` | 칩 패딩, 코드 인풋 gap |
| `{spacing.lg}` | `10px` | 히스토리 갭, 컨트롤 gap |
| `{spacing.xl}` | `12px` | 카드 gap, 날짜 인풋 gap |
| `{spacing.2xl}` | `14px` | 오버레이 카드 gap, 트랙 아이템 gap |
| `{spacing.3xl}` | `16px` | 카드 수평 패딩, 탭 패딩 |
| `{spacing.4xl}` | `20px` | 기본 좌우 패딩, 하단 여백 |
| `{spacing.5xl}` | `24px` | 오버레이 패딩, 모달 헤더 패딩 |
| `{spacing.6xl}` | `28px` | 슬라이드 텍스트 패딩 |
| `{spacing.7xl}` | `30px` | 채팅 헤더 상단 패딩 |
| `{spacing.8xl}` | `40px` | 브랜드 텍스트 하단 마진 |
| `{spacing.9xl}` | `60px` | 대기 화면 top 패딩 |

### Grid

- 라이프 가이드: 3열 균등 그리드 (`grid-template-columns: repeat(3, minmax(0, 1fr))`), gap 12px
- 단일 컬럼 플렉스 레이아웃이 기본

### 여백 철학

- 모든 컨테이너는 `env(safe-area-inset-*)` 적용 (iOS 노치/홈바 대응)
- 하단 nav 위 콘텐츠는 `calc(90px + safe-bottom)` 패딩으로 겹침 방지
- 수평 패딩은 일관되게 20px (뷰포트에 따라 16px, 14px 감소)

---

## 5. Elevation & Depth

그림자보다 **backdrop-filter blur + 반투명 레이어**로 깊이를 표현한다. 표준 카드에는 box-shadow 없음.

| 레벨 | 방법 | 값 | 적용 대상 |
|---|---|---|---|
| Level 0 (기본 카드) | border | 1px solid `rgba(255,255,255,0.20)` | .card, 채팅 버블 |
| Level 1 (서브 레이어) | backdrop-filter | `blur(8px)` | 모달 헤더/푸터, 트랙 아이템 |
| Level 2 (플레이리스트 모달) | backdrop-filter + shadow | `blur(12px)` + `box-shadow: 0 20px 60px rgba(0,0,0,0.50)` | 플레이리스트 모달 |
| Level 3 (오버레이) | 배경 딤 | `rgba(0,0,0,0.88)` 전체화면 | 오버레이 모달 |
| Level 4 (로딩) | 배경 딤 | `rgba(0,0,0,0.90)` 전체화면 | 로딩 오버레이 |
| Spotify embed | shadow | `box-shadow: 0 4px 16px rgba(0,0,0,0.30)` | Spotify 임베드 컨테이너 |

### Z-index 체계

| 값 | 용도 |
|---|---|
| 50 | 일반 오버레이 모달 |
| 100 | 하단 네비게이션 |
| 1000 | (기타 레이어) |
| 9999 | 로딩 오버레이 |
| 10000 | 플레이리스트 모달, 라이프 모달 |
| 11000 | 화자 전환(switch) 오버레이 |

---

## 6. Shapes

| 토큰 | 값 | 적용 대상 |
|---|---|---|
| `{radius.full}` | `50%` | 원형 버튼 (전송, 컨트롤), 상태 도트, 트랙 번호 |
| `{radius.pill}` | `999px` | 트랙 칩 |
| `{radius.pill.lg}` | `28px` | 검색 인풋, 채팅 셀렉트 |
| `{radius.pill.md}` | `25px` | 기본 버튼 |
| `{radius.bubble}` | `22px` | 채팅 버블 |
| `{radius.modal.playlist}` | `24px` | 플레이리스트 모달 |
| `{radius.tab.wrap}` | `24px` | 탭 컨테이너 |
| `{radius.tab.inner}` | `20px` | 개별 탭 |
| `{radius.modal.life}` | `20px` | 라이프 모달 내용 |
| `{radius.image.card}` | `20px` | 음성통화 이미지 카드 |
| `{radius.modal.overlay}` | `16px` | 오버레이 카드, 히스토리 빈상태 박스 |
| `{radius.modal.playlist.track}` | `14px` | 트랙 아이템, 일반 카드 |
| `{radius.input}` | `12px` | 인풋 필드, Spotify 임베드 |
| `{radius.life.card}` | `16px` | 라이프 가이드 카드 |
| `{radius.profile.input}` | `6px` | 프로필 인라인 인풋 포커스 |

---

## 7. Components

### 7.1 Button

```
기본 버튼 (Default White)
  width: 100%
  padding: 16px {spacing.4xl}
  border-radius: {radius.pill.md} (25px)
  background: {colors.text.primary} (#ffffff)
  color: {colors.bg.dark} (#2a2a2a)
  font-size: 16px, weight: 600
  text-transform: lowercase
  transition: all 0.3s ease
  disabled: opacity 0.3

Primary (.primary)
  background: {gradient.primary}
  color: white, border: none

Secondary (.secondary)
  background: transparent
  border: 2px solid {colors.border.default}
  color: {colors.text.primary}

Ghost (.ghost)
  background: transparent
  border: 1px solid {colors.border.default}
  color: {colors.text.secondary}

Send Button (.chat-send)
  size: 47×47px, border-radius: 50%
  background: {gradient.chat.mine}
  active: scale(0.95)

Control Button (.control-btn) — 음성통화
  size: 50×50px (420px 이하: 44×44px)
  border-radius: 50%
  background: {colors.bg.chat.bubble} (#525252)
  active state: background {colors.accent.yellow}, icon color black
  end-call: background {colors.status.end.call} (#ff4444)

Inline Text Button (.view-details-btn)
  background: rgba(255,255,255,0.20)
  border: none, border-radius: 20px
  padding: 10px 20px, width: auto

Life Card (.life-card)
  background: {colors.bg.life.card} (#d9d9d9)
  border-radius: {radius.life.card} (16px)
  padding: 40px 20px
  font-size: 12px, weight: 600
  color: black (다크 배경 위의 유일한 밝은 표면)
  aspect-ratio: 1/1, min-height: 96px
  active: scale(0.95)
```

### 7.2 Card

```
Standard Card (.card)
  background: {colors.bg.card} (#3a3a3a)
  border-radius: {radius.modal.playlist.track} (14px)
  border: 1px solid {colors.border.subtle}
  padding: 22px 16px
  hover: background #2f2f2f
  selected: background #3a3a3a, opacity 0.7

Overlay Card (.overlay-card)
  background: {colors.bg.card}
  border: 1px solid {colors.border.default}
  border-radius: {radius.modal.overlay} (16px)
  padding: 24px, gap: 14px

Chemistry Card (.chemistry-card)
  border-radius: 20px, padding: 20px
  background: linear-gradient(#1f1f1f, #1f1f1f) padding-box,
              {gradient.primary} border-box
  border: 1px solid transparent

Empty State Box (.empty-state-box)
  background: {colors.bg.card}
  border-radius: {radius.modal.overlay} (16px)
  border: 1px solid {colors.border.default}
  min-height: calc(100vh - 260px)
  이미지: 30×30px asterisk, margin-bottom 24px
```

### 7.3 Navigation (Bottom Nav)

```
.bottom-nav
  position: fixed, bottom: 0
  width: 100%, max-width: 480px
  height: calc(70px + safe-bottom)
  background: linear-gradient(to top,
    rgba(42,42,42,1.00) 0%,
    rgba(42,42,42,0.95) 70%,
    rgba(42,42,42,0.00) 100%)
  z-index: 100

.nav-item
  flex: 1, height: 50px (420px 이하: 44px)
  icon: 24×24px SVG
  inactive color: {colors.text.secondary}
  active color: {colors.text.primary}
  hover: transform none (이동 효과 없음)
```

### 7.4 Tabs

```
.tabs
  background: {colors.bg.card} (#3a3a3a)
  border-radius: {radius.tab.wrap} (24px)
  padding: 4px

.tab
  padding: 10px 16px (420px 이하: 9px 12px)
  border-radius: {radius.tab.inner} (20px)
  font-size: 14px (420px 이하: 13px), weight: 500
  inactive color: {colors.text.secondary}
  transition: all 0.3s ease

.tab.active
  background: {colors.bg.dark} (#2a2a2a)
  color: {colors.text.primary}
```

### 7.5 Input

```
Default Input / Select / Textarea
  width: 100%
  padding: 16px 20px (420px 이하: 14px 16px)
  background: {colors.bg.card}
  border: 2px solid {colors.border.default}
  border-radius: {radius.input} (12px)
  font-size: 16px (420px 이하: 15px)
  color: {colors.text.primary}
  margin-bottom: 20px
  transition: all 0.3s ease
  placeholder: {colors.text.secondary}, opacity 0.6
  focus: border-color {colors.accent.purple}, background {colors.bg.darker}

Search Input (.search-input)
  height: 56px (420px 이하: 50px)
  border-radius: {radius.pill.lg} (28px) — pill
  border: 1px solid {colors.border.subtle}
  background: {colors.bg.search} (#2b2b2b)
  padding: 0 60px 0 22px
  font-size: 16px (420px 이하: 15px)

OTP Code Input (.code-input)
  width: 50px, height: 60px
  (480px 이하: 42×52px, 420px 이하: 40×48px, 360px 이하: 36×44px)
  text-align: center, font-size: 24px, weight: 600

Chat Select (.chat-select)
  border-radius: {radius.pill.lg} (28px)
  background: {colors.bg.card}, border: none
  padding: 12px 18px, padding-right: 45px
  custom chevron SVG right 18px
```

### 7.6 Chat Bubbles

```
Other's Bubble (.chat-bubble)
  background: {colors.bg.chat.bubble} (#525252)
  border: 1px solid {colors.border.subtle}
  border-radius: {radius.bubble} (22px)
  padding: 6px 14px
  max-width: 70%, font-size: 13px, line-height: 1.5
  font-family: {font.brand}

My Bubble (.chat-bubble.mine)
  background: {gradient.chat.mine}
  border-radius: {radius.bubble} (22px)
  max-width: 70%

Avatar (.chat-avatar)
  width/height: 36px, border-radius: 50%
  background: {gradient.avatar}

Chat Row gap: 10px, message gap: 8px
fade-in animation: 0.3s forwards
```

### 7.7 Modals & Overlays

```
Overlay Modal (.overlay-modal)
  backdrop: {colors.overlay.modal} (rgba(0,0,0,0.88))
  z-index: 50, padding: 24px

Playlist Modal (.modal)
  backdrop: {colors.overlay.loading} + backdrop-filter: blur(12px)
  border-radius: {radius.modal.playlist} (24px)
  width: 94%, max-width: 440px, max-height: 88vh
  box-shadow: 0 20px 60px rgba(0,0,0,0.50)
  mood gradient background: 135deg, animated 20s moodFlow

Modal Header: padding 32px 24px 20px
Modal Footer: padding 20px 24px, border-top 1px solid rgba(255,255,255,0.10)

Track Item (.track-item)
  background: rgba(0,0,0,0.25), backdrop-filter: blur(8px)
  border: 1px solid rgba(255,255,255,0.10)
  border-radius: {radius.modal.playlist.track} (14px)
  padding: 14px 16px, gap: 14px
  playing state: background rgba(255,255,255,0.22),
                 border rgba(255,255,255,0.40),
                 box-shadow 0 6px 18px rgba(255,255,255,0.15)

Life Modal (.life-modal-content)
  background: {colors.bg.card}
  border-radius: {radius.modal.life} (20px)
  padding: 40px 30px, text-align: center
```

### 7.8 Status Indicators

```
Status Dot (.status-dot) — 12×12px circle
  online:    background {colors.status.success} (#4ecb71)
  offline:   background {colors.text.secondary} (#b0b0b0)
  blocked:   inline SVG (red slash circle)
  completed: inline SVG (green check circle)
```

### 7.9 Loading State

```
로딩 오버레이
  position: fixed, inset: 0
  background: {colors.overlay.loading}
  z-index: 9999

Loading Asterisks
  컨테이너: 100×100px, orbit-container 2.5s linear infinite (공전)
  asterisk-1: 35×35px, spin 2.0s linear infinite
  asterisk-2: 30×30px, spin 1.6s linear infinite reverse (역방향)
  텍스트: {colors.text.primary}, font-size 14px, margin-top 20px

Spinner (.loading-spinner) — 모달 내부
  40×40px, border 3px solid rgba(255,255,255,0.20)
  border-top-color: white, border-radius: 50%
  spin 0.8s linear infinite
```

### 7.10 Track Chip

```
.track-chip
  background: {colors.bg.chat.bubble} (#525252)
  border-radius: {radius.pill} (999px)
  padding: 8px 12px, gap: 8px
  font-size: 12px
  chip-text max-width: 280px (420px 이하: 220px), truncated

.track-chip-remove
  font-size: 18px, opacity 0.7
  hover: opacity 1.0
```

### 7.11 Onboarding Slides

```
슬라이드 전환: transform 0.42s cubic-bezier(0.4, 0, 0.2, 1)
Visual area: flex 0 0 56%
Text area: flex 1, padding 28px 28px calc(30px + safe-bottom)

Headline: {font.brand}, 28px, weight 600, line-height 1.1, letter-spacing -1px
  accent: rgba(255,255,255,0.60)
Sub: 13px, {colors.text.secondary}, line-height 1.6

Dots:
  size: 8×8px, border-radius: 50%
  inactive: {colors.bg.chat.bubble} (#525252)
  transition: all 0.3s ease

슬라이드 content fade-in: opacity 0→1, translateY 10px→0, 0.4s ease, delay 0.15s
```

---

## 8. Do's and Don'ts

### ✅ Do's

| 규칙 | 이유 |
|---|---|
| 브랜드/헤드라인 텍스트는 `Merriweather` serif만 사용 | 브랜드 감성 일관성 |
| 모든 사용자 노출 텍스트는 `lowercase` | body-level 강제 적용. 의도적 브랜드 톤 |
| 주요 CTA에는 그라데이션 버튼 사용 | 시각적 계층 강조 |
| 인터랙티브 요소 최소 터치 타겟 44px 이상 확보 | 모바일 UX 표준 |
| 모든 컨테이너에 `env(safe-area-inset-*)` 적용 | iOS 노치/Dynamic Island/홈 인디케이터 대응 |
| 카드 구분에 border 사용 (box-shadow 대신) | 다크 배경에서 그림자보다 선명한 경계 |
| 깊이 표현은 `backdrop-filter: blur()` 사용 | 레이어드 느낌의 깊이감 |
| 비활성/빈 상태에는 asterisk 이미지 + 메시지 조합 | 일관된 empty state 패턴 |

### ❌ Don'ts

| 규칙 | 이유 |
|---|---|
| 밝은 배경(흰색/회색) 전체 화면에 사용 금지 | 라이프 카드 내부 예외. 다크 테마 일관성 파괴 |
| 버튼에 hover transform/shadow 추가 금지 | 탭, nav에 `.hover { transform: none }` 명시됨 |
| `border-radius` 12px 미만 인터랙티브 요소 금지 | 전체 시스템 최소 radius |
| 위에 그라데이션 없이 흰 버튼을 주 CTA로 사용 금지 | 흰 버튼은 기본 폴백. Primary는 반드시 그라데이션 |
| `text-transform: uppercase` 사용 금지 | 카테고리 레이블(letter-spacing 0.2em) 한 곳만 예외 |
| 표준 카드에 `box-shadow` 추가 금지 | 시스템 일관성. Elevation은 blur/border로만 |
| 480px 초과 레이아웃 구현 금지 | 앱은 모바일 PWA 전용, max-width 480px 고정 |
| 이미지/미디어 drag 허용 금지 | `-webkit-user-drag: none` 전역 적용 |

---

## 9. Responsive

### Breakpoints

| 토큰 | 값 | 변경 내용 |
|---|---|---|
| `{bp.max}` | `480px` | 컨테이너 최대 너비 |
| `{bp.md}` | `max-width: 480px` | h1 → 28px |
| `{bp.sm}` | `max-width: 420px` | h1 26px, h2 20px, button 15px, padding 16px, gap 8px |
| `{bp.xs}` | `max-width: 360px` | h1 24px, brand 22px, OTP 36×44px, padding 14px |
| `{bp.height.sm}` | `max-height: 700px` | 상단 패딩 축소, 브랜드 마진 감소 |

### 반응형 수치 변화 (주요 요소)

| 요소 | 480px+ | 480px 이하 | 420px 이하 | 360px 이하 |
|---|---|---|---|---|
| Container padding-x | 20px | 20px | 16px | 14px |
| H1 | 32px | 28px | 26px | 24px |
| Brand text | 28px | 28px | 24px | 22px |
| OTP cell | 50×60px | 42×52px | 40×48px | 36×44px |
| Voice image height | 30vh | — | 24vh | 22vh |
| Chat send btn | 47×47px | — | 44×44px | — |
| Life card min-height | 96px | — | 88px | 82px |

### Touch Target

| 요소 | 크기 |
|---|---|
| Nav item | 50px height (420px 이하: 44px) |
| 기본 버튼 | padding 16px → 최소 ~48px height |
| Send button | 47×47px (420px 이하: 44×44px) |
| Control button | 50×50px (420px 이하: 44×44px) |
| Back button (.policy-back) | 36×36px |
| Track chip remove | 18px font (충분한 탭 영역 필요) |

### 반응형 전략

- **Mobile-first, portrait-only.** `manifest.json`의 `orientation: "portrait"` 고정
- SVH (`100svh`) 지원 브라우저 우선 적용: `@supports (height: 100svh)`
- `env(safe-area-inset-*)` 전체 적용으로 노치/홈 인디케이터 대응
- 스크롤 없는 전체화면 레이아웃 (chat, voice, playlist, waiting): `height: 100vh/100svh`
- 스크롤 있는 레이아웃 (lounge, history, profile): `overflow-y: auto`

---

## 10. Known Gaps

아래 항목은 현재 분석에서 불완전하거나 정의되지 않은 부분이다.

| 항목 | 상세 |
|---|---|
| **배포 환경** | Render.com 호스팅 (https://about-nine.onrender.com). 콜드 스타트 지연 고려 필요 |
| **디자인 토큰 파일 없음** | 모든 토큰이 CSS 변수(`style.css :root`)에만 존재. JSON/YAML 토큰 파일 미존재 |
| **라이트 테마 미정의** | 다크 모드만 존재. `prefers-color-scheme` 처리 없음 |
| **애니메이션 타이밍 미체계화** | 0.2s, 0.25s, 0.3s, 0.42s, 2.5s 등이 하드코딩으로 분산. 글로벌 easing 변수 없음 |
| **아이콘 시스템 없음** | 전부 인라인 SVG 또는 `data:image/svg+xml` URI. 아이콘 라이브러리/스프라이트 없음 |
| **z-index 체계 미문서화** | 50, 100, 9999, 10000, 11000 등이 각 파일에 하드코딩. 전역 스케일 없음 |
| **mood gradient 토큰** | 플레이리스트 모달 배경은 앨범 커버에서 동적으로 추출. 폴백 컬러 `#667eea, #764ba2, #f093fb`만 고정 |
| **Merriweather 웨이트 제한** | 400, 700만 로드. 실제 사용은 400/600(inherit)/700에 의존, 일부 weight는 합성 볼드 |
| **프로필/에디트 화면 스타일** | `edit-profile.html`의 인라인 스타일이 공유 CSS를 오버라이드하는 범위 미분석 |
| **애니메이션 접근성** | `prefers-reduced-motion` 처리: playlist ticker에만 적용. 로딩 asterisk, 기타 애니메이션 미처리 |
