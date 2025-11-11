# Git 설정 가이드

## Git 사용자 정보 설정

Git 커밋 시 사용할 이름과 이메일을 설정하세요:

```bash
# 전역 설정 (모든 리포지토리에 적용)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# 또는 이 리포지토리만 설정
git config user.name "Your Name"
git config user.email "you@example.com"
```

## 현재 설정 확인

```bash
# 전역 설정 확인
git config --global user.name
git config --global user.email

# 모든 설정 확인
git config --list
```

## 예시

```bash
git config --global user.name "ellenseon"
git config --global user.email "ellenseon@example.com"
```

## 이전 커밋의 작성자 정보 수정

만약 이미 커밋한 내용의 작성자 정보를 수정하고 싶다면:

```bash
# 마지막 커밋의 작성자 정보 수정
git commit --amend --reset-author

# 또는 특정 커밋의 작성자 정보 수정
git commit --amend --author="Your Name <you@example.com>"
```

## 참고

- GitHub에 푸시할 때는 이메일이 GitHub 계정과 연결되어 있으면 프로필에 표시됩니다
- 이메일을 공개하지 않으려면 GitHub의 noreply 이메일을 사용할 수 있습니다: `username@users.noreply.github.com`

