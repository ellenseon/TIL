# 다음 단계 가이드

## ✅ 완료된 작업
- [x] TIL 블로그 프로젝트 생성
- [x] 모든 기능 구현 (검색, RSS, 소셜 공유 등)
- [x] Git 초기화 및 커밋
- [x] GitHub에 푸시 완료

## 📋 다음 단계

### 1. 로컬에서 테스트하기

```bash
# 빌드
npm run build

# 로컬 서버 실행 (다른 터미널에서)
npm run serve

# 브라우저에서 확인
# http://localhost:8080
```

### 2. GitHub Pages 활성화

1. GitHub 리포지토리로 이동: https://github.com/ellenseon/TIL
2. **Settings** → **Pages** 클릭
3. **Source** 섹션에서 **"GitHub Actions"** 선택
4. 저장

### 3. 배포 확인

- GitHub Actions가 자동으로 빌드 및 배포를 처리합니다
- 몇 분 후 다음 URL에서 확인: https://ellenseon.github.io/TIL/
- Actions 탭에서 배포 상태 확인 가능

### 4. Disqus 설정 (선택사항)

댓글 기능을 사용하려면:

1. Disqus 가입: https://disqus.com/
2. 사이트 등록 후 shortname 확인
3. `src/templates/post.html` 파일 열기
4. 75번째 줄의 `YOUR-DISQUS-SHORTNAME`을 실제 shortname으로 변경
5. 커밋 및 푸시:
   ```bash
   git add src/templates/post.html
   git commit -m "feat: Disqus 설정 추가"
   git push
   ```

### 5. 새 포스트 작성하기

```bash
# src/posts/ 디렉토리에 마크다운 파일 생성
# 예: src/posts/my-first-post.md
```

포스트 형식:
```markdown
---
title: 포스트 제목
date: 2024-11-11
tags: [javascript, nodejs]
excerpt: 포스트 요약
draft: false
---

# 포스트 내용

여기에 마크다운으로 작성하세요.
```

### 6. 드래프트 포스트 작성

작성 중인 포스트는 `draft: true`로 설정하면 빌드 시 제외됩니다:

```markdown
---
title: 작성 중인 포스트
date: 2024-11-11
draft: true
---

작성 중...
```

### 7. 개발 모드 사용

파일 변경 시 자동으로 재빌드:

```bash
npm run dev
```

## 🔧 유용한 명령어

```bash
# 빌드
npm run build

# 개발 모드 (자동 재빌드)
npm run dev

# 로컬 서버 실행
npm run serve

# Git 상태 확인
git status

# 변경사항 커밋
git add .
git commit -m "메시지"
git push
```

## 📝 참고사항

- 모든 포스트는 `src/posts/` 디렉토리에 마크다운 파일로 작성
- 빌드된 파일은 `dist/` 디렉토리에 생성됨
- 프로필 이미지: `assets/images/profile/Ellen.jpg`
- 스타일 수정: `src/styles/main.css`
- 템플릿 수정: `src/templates/`

## 🎉 완료!

이제 블로그를 사용할 준비가 되었습니다. 새 포스트를 작성하고 커밋하면 자동으로 배포됩니다!

