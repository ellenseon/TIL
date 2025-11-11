# 배포 가이드

## GitHub에 푸시하기

### 방법 1: Personal Access Token 사용 (권장)

1. GitHub에서 Personal Access Token 생성:
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - "Generate new token (classic)" 클릭
   - `repo` 권한 선택
   - 토큰 생성 후 복사

2. 푸시 시 토큰 사용:
   ```bash
   git push -u origin main
   # Username: ellenseon
   # Password: [생성한 토큰 붙여넣기]
   ```

### 방법 2: GitHub CLI 사용

```bash
# GitHub CLI 설치 (없는 경우)
brew install gh

# 로그인
gh auth login

# 푸시
git push -u origin main
```

### 방법 3: SSH 키 설정

1. SSH 키 생성 (이미 있는 경우 생략):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. SSH 키를 GitHub에 추가:
   - `~/.ssh/id_ed25519.pub` 내용 복사
   - GitHub → Settings → SSH and GPG keys → New SSH key

3. 원격 저장소를 SSH로 변경:
   ```bash
   git remote set-url origin git@github.com:ellenseon/TIL.git
   git push -u origin main
   ```

## GitHub Pages 활성화

1. GitHub 리포지토리로 이동: https://github.com/ellenseon/TIL
2. Settings → Pages
3. Source: "GitHub Actions" 선택
4. `.github/workflows/deploy.yml` 워크플로우가 자동으로 배포를 처리합니다

## 배포 확인

푸시 후 몇 분 후 다음 URL에서 확인:
https://ellenseon.github.io/TIL/

