# TIL - Today I Learned

개발 노트와 학습 기록을 담는 노트형 블로그입니다.

## 특징

- 🌙 다크모드 우선 디자인
- 💻 GitHub 스타일 Prism 코드 하이라이팅
- 🔍 Lunr 검색 기능
- 📡 RSS 피드
- 💬 Disqus 댓글 (설정 필요)
- 📱 소셜 공유 버튼
- 📝 드래프트 기능
- 🔎 SEO/OG 태그 최적화
- 🚫 광고/추적기 없음

## 시작하기

### 설치

```bash
npm install
```

### 빌드

```bash
npm run build
```

### 개발 모드 (자동 재빌드)

```bash
npm run dev
```

### 로컬 서버 실행

```bash
npm run serve
```

## 포스트 작성

`src/posts/` 디렉토리에 마크다운 파일을 생성하세요.

### 포스트 형식

```markdown
---
title: 포스트 제목
date: 2024-01-15
tags: [tag1, tag2]
excerpt: 포스트 요약
draft: false
---

# 포스트 내용
```

### 드래프트

`draft: true`로 설정하면 빌드 시 제외됩니다.

## 배포

GitHub Pages에 배포하려면:

1. GitHub 리포지토리 생성
2. `.github/workflows/deploy.yml` 워크플로우 사용 (자동 배포)
3. 또는 수동으로 `dist/` 디렉토리 내용을 `gh-pages` 브랜치에 푸시

## 라이센스

MIT License

