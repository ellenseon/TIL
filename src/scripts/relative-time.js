// 클라이언트 측 상대 시간 계산 (사용자의 현재 시간 기준)
(function() {
  'use strict';

  // ISO 8601 날짜 문자열을 Date 객체로 변환 (한국 시간대 고려)
  function parseKoreanDate(dateString) {
    if (!dateString) return null;
    
    // ISO 형식인 경우 (예: "2025-11-12T08:30:00+09:00")
    if (dateString.includes('T')) {
      return new Date(dateString);
    }
    
    // "YYYY-MM-DD HH:mm" 형식인 경우 한국 시간대로 해석
    if (/^\d{4}-\d{2}-\d{2}(\s+\d{1,2}:\d{2})?$/.test(dateString)) {
      let dateStr = dateString.trim();
      if (!dateStr.includes(':')) {
        dateStr += ' 00:00';
      }
      const [datePart, timePart] = dateStr.split(' ');
      const [hour, minute = '00'] = timePart.split(':');
      const isoString = `${datePart}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00+09:00`;
      return new Date(isoString);
    }
    
    return new Date(dateString);
  }

  // 상대 시간 계산
  function getRelativeTime(dateString) {
    const postDate = parseKoreanDate(dateString);
    if (!postDate || isNaN(postDate.getTime())) {
      return '';
    }

    const now = new Date();
    const diffTime = now - postDate;
    const diffSeconds = Math.floor(diffTime / 1000);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));

    // 1일(24시간) 이내인 경우 상대 시간으로 표시
    if (diffTime >= 0 && diffTime < 24 * 60 * 60 * 1000) {
      if (diffSeconds < 60) {
        return '방금 전';
      } else if (diffMinutes < 60) {
        return `${diffMinutes}분 전`;
      } else {
        return `${diffHours}시간 전`;
      }
    }

    // 1일 이상인 경우 날짜만 비교 (시간 무시)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const postDateOnly = new Date(
      postDate.getFullYear(),
      postDate.getMonth(),
      postDate.getDate()
    );

    const diffDays = Math.floor((today - postDateOnly) / (1000 * 60 * 60 * 24));

    // 미래 날짜인 경우
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      if (absDays === 1) {
        return '내일';
      } else {
        return `${absDays}일 후`;
      }
    }

    // 과거 날짜인 경우
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '어제';
    if (diffDays < 7) return `${diffDays}일 전`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월 전`;
    return `${Math.floor(diffDays / 365)}년 전`;
  }

  // 모든 상대 시간 요소 업데이트
  function updateRelativeTimes() {
    const elements = document.querySelectorAll('[data-post-date]');
    elements.forEach(function(element) {
      const dateString = element.getAttribute('data-post-date');
      const relativeTime = getRelativeTime(dateString);
      if (relativeTime) {
        element.textContent = relativeTime;
      }
    });
  }

  // 페이지 로드 시 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateRelativeTimes);
  } else {
    updateRelativeTimes();
  }

  // 1분마다 업데이트 (1일 이내 포스트의 경우)
  setInterval(function() {
    updateRelativeTimes();
  }, 60000); // 60초 = 1분
})();

