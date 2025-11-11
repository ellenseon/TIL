# TIL - Today I Learned


## 시작하기

### 설치

```bash
npm install
```

### 빌드

**프로덕션 빌드** (GitHub Pages 배포용):
```bash
npm run build
```

**로컬 빌드** (로컬 테스트용):
```bash
npm run build:local
```

### 개발 모드 (자동 재빌드)

```bash
npm run dev
```

파일 변경 시 자동으로 재빌드됩니다.

### 로컬 서버 실행

```bash
npm run serve
```

빌드 후 `http://localhost:8080`에서 확인할 수 있습니다.

## 포스트 작성 가이드

### 포스트 파일 생성

`src/posts/` 디렉토리에 마크다운 파일(`.md`)을 생성하세요.

**파일명 규칙:**
- 영문, 숫자, 하이픈(`-`)만 사용
- 예: `javascript-array-methods.md`, `react-hooks-guide.md`

### Front Matter 형식

모든 포스트는 YAML front matter로 시작해야 합니다:

```yaml
---
title: 포스트 제목
date: 2024-01-15
series: 시리즈 이름 (선택사항)
tags: [tag1, tag2, tag3]
excerpt: 포스트 요약 (검색 결과 및 미리보기에 표시됨)
draft: false
---
```

### 필드 설명

| 필드 | 필수 | 설명 | 예시 |
|------|------|------|------|
| `title` | ✅ | 포스트 제목 | `JavaScript Array Methods 정리` |
| `date` | ✅ | 작성일 (YYYY-MM-DD) | `2024-01-15` |
| `series` | ❌ | 시리즈 이름 (같은 이름의 포스트가 시리즈로 묶임) | `JavaScript 학습하기` |
| `tags` | ❌ | 태그 배열 | `[javascript, array, methods]` |
| `excerpt` | ❌ | 포스트 요약 (미리보기와 검색 결과에 표시) | `JavaScript 배열 메서드들을 정리했습니다.` |
| `draft` | ❌ | 드래프트 여부 (`true`면 빌드에서 제외) | `false` |

### 포스트 템플릿

```markdown
---
title: 포스트 제목
date: 2024-01-15
series: 시리즈 이름 (선택사항)
tags: [tag1, tag2, tag3]
excerpt: 포스트 요약을 여기에 작성하세요. 검색 결과와 미리보기에 표시됩니다.
draft: false
---

# 포스트 제목

포스트 내용을 여기에 작성하세요.

## 섹션 제목

### 하위 섹션

#### 더 작은 제목

**굵은 글씨**와 *기울임*을 사용할 수 있습니다.

## 코드 블록

\`\`\`javascript
function example() {
  console.log('Hello, World!');
}
\`\`\`

## 리스트

### 순서 없는 리스트
- 항목 1
- 항목 2
- 항목 3

### 순서 있는 리스트
1. 첫 번째
2. 두 번째
3. 세 번째

## 인용구

> "좋은 코드는 스스로 설명한다." - 누군가

## 링크

[링크 텍스트](https://example.com)

## 이미지

![이미지 설명](/TIL/assets/images/example.png)

## 표

| 열1 | 열2 | 열3 |
|-----|-----|-----|
| 데이터1 | 데이터2 | 데이터3 |
| 데이터4 | 데이터5 | 데이터6 |

## 결론

포스트를 마무리하는 내용을 작성하세요.
```

### 시리즈 사용하기

관련된 여러 포스트를 시리즈로 묶을 수 있습니다:

```markdown
---
title: React Hooks 완전 정리 - Part 1
date: 2024-01-15
series: React Hooks 완전 정리
tags: [react, hooks]
excerpt: React Hooks의 기초를 다룹니다.
---
```

같은 `series` 이름을 사용하면 자동으로 시리즈로 묶이고, 시리즈 페이지에서 순서대로 표시됩니다.

### 태그 사용하기

태그는 배열 형식으로 작성합니다:

```markdown
tags: [javascript, react, hooks, tutorial]
```

- 태그는 소문자로 작성하는 것을 권장합니다
- 공백이 필요하면 하이픈(`-`)을 사용하세요: `web-development`
- 태그를 클릭하면 해당 태그의 포스트만 필터링됩니다

### 드래프트 포스트

작성 중인 포스트는 `draft: true`로 설정하면 빌드에서 제외됩니다:

```markdown
---
title: 작성 중인 포스트
date: 2024-01-15
draft: true
---
```

## 프로젝트 구조

```
TIL/
├── src/
│   ├── posts/           # 마크다운 포스트 파일
│   ├── templates/       # HTML 템플릿
│   ├── styles/          # CSS 스타일시트
│   ├── scripts/         # JavaScript 파일
│   └── assets/          # 이미지 등 정적 파일
├── dist/                # 빌드 결과물 (GitHub Pages에 배포)
├── build.js             # 빌드 스크립트
└── package.json
```

## 커스터마이징

### 프로필 정보 변경

`src/templates/index.html`, `src/templates/about.html` 등에서 프로필 정보를 수정할 수 있습니다:

- 프로필 이미지: `assets/images/profile/Ellen.jpg`
- 이름: `Ellen Seon`
- 설명: `If you know Ellen, you will absolutely love her.`

### 스타일 수정

`src/styles/main.css`에서 색상, 폰트, 간격 등을 수정할 수 있습니다.

CSS 변수를 사용하여 일관된 디자인을 유지합니다:

```css
:root {
  --bg-primary: #0d1117;
  --text-primary: #c9d1d9;
  --accent-color: #58a6ff;
  /* ... */
}
```

## 배포

### GitHub Pages 배포

1. GitHub 리포지토리 생성 (예: `ellenseon/TIL`)
2. 리포지토리 설정에서 Pages 활성화
3. 프로덕션 빌드 실행:
   ```bash
   npm run build
   ```
4. `dist/` 디렉토리 내용을 GitHub에 푸시
5. `.github/workflows/deploy.yml` 워크플로우가 자동으로 배포 처리

### 로컬 테스트

로컬에서 테스트하려면:

```bash
npm run build:local
npm run serve
```

`http://localhost:8080`에서 확인할 수 있습니다.

## 팁

### 포스트 작성 팁

1. **명확한 제목**: 검색과 SEO를 위해 명확하고 설명적인 제목 사용
2. **적절한 excerpt**: 포스트 요약을 작성하면 검색 결과와 미리보기에 표시됨
3. **태그 활용**: 관련 태그를 적절히 사용하여 분류
4. **시리즈 활용**: 연속된 주제의 포스트는 시리즈로 묶기
5. **코드 예시**: 코드 블록에 언어를 명시하여 하이라이팅 활용

### 마크다운 팁

- 코드 인라인: \`코드\`
- 코드 블록: \`\`\`언어
- 링크: `[텍스트](URL)`
- 이미지: `![설명](경로)`
- 강조: `**굵게**`, `*기울임*`

## 라이센스

MIT License
