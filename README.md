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

## 프로필 이미지 설정

`assets/images/profile/Ellen.jpg` 파일을 추가하세요. 이 파일이 없으면 프로필 이미지가 표시되지 않습니다.

## 배포

GitHub Pages에 배포하려면:

1. GitHub에서 `ellenseon/TIL` 리포지토리 생성
2. 리포지토리 설정에서 Pages 활성화 (GitHub Actions 사용)
3. 다음 명령어로 푸시:
   ```bash
   git push -u origin main
   ```
4. `.github/workflows/deploy.yml` 워크플로우가 자동으로 배포를 처리합니다

## Disqus 설정

댓글 기능을 사용하려면 `src/templates/post.html` 파일에서 `YOUR-DISQUS-SHORTNAME`을 실제 Disqus shortname으로 변경하세요.

## 라이센스

MIT License

