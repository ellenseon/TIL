const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const matter = require('front-matter');
const lunr = require('lunr');
const RSS = require('rss');
const chokidar = require('chokidar');

const POSTS_DIR = path.join(__dirname, 'src', 'posts');
const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATES_DIR = path.join(__dirname, 'src', 'templates');
const ASSETS_DIR = path.join(__dirname, 'assets');

// 로컬 모드 확인 (--local 플래그)
const isLocalMode = process.argv.includes('--local');
const BASE_PATH = isLocalMode ? '' : '/TIL';

// Marked 설정 - HTML 허용 및 Prism 설정
marked.setOptions({
  breaks: true, // 줄바꿈 허용
  gfm: true, // GitHub Flavored Markdown 활성화
  headerIds: true, // 헤더에 ID 자동 생성
  mangle: false, // 이메일 주소 난독화 비활성화
  sanitize: false, // HTML 태그 허용 (sanitize 비활성화)
  highlight: function(code, lang) {
    return `<pre class="language-${lang || 'text'}"><code class="language-${lang || 'text'}">${escapeHtml(code)}</code></pre>`;
  }
});

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// 간단한 상태 표시 문법 처리: [완료], [진행중], [계획변경], [미완료] 등
function processStatusMarkers(text) {
  // 상태 표시 패턴
  const statusMap = {
    '완료': { class: 'status-complete', color: 'green' },
    '계획변경': { class: 'status-changed', color: 'orange' },
    '미완료': { class: 'status-incomplete', color: 'red' },
    '진행중': { class: 'status-progress', color: 'gray' }
  };
  
  // 링크 패턴을 먼저 임시로 보호 (마크다운 링크와 충돌 방지)
  const linkPlaceholders = [];
  let linkIndex = 0;
  
  // 마크다운 링크 패턴 [텍스트](url)을 임시로 치환
  const textWithProtectedLinks = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, (match) => {
    const placeholder = `__LINK_PLACEHOLDER_${linkIndex}__`;
    linkPlaceholders[linkIndex] = match;
    linkIndex++;
    return placeholder;
  });
  
  // [상태] 패턴을 찾아서 변환 (링크가 아닌 경우만)
  const processedText = textWithProtectedLinks.replace(/\[([^\]]+)\]/g, (match, status) => {
    const statusLower = status.trim();
    const statusInfo = statusMap[statusLower];
    
    if (statusInfo) {
      return `<span class="${statusInfo.class}" data-status="${statusLower}">${status}</span>`;
    }
    
    // 매칭되지 않으면 그대로 반환
    return match;
  });
  
  // 보호된 링크를 원래대로 복원
  return processedText.replace(/__LINK_PLACEHOLDER_(\d+)__/g, (match, index) => {
    return linkPlaceholders[parseInt(index)] || match;
  });
}

// 한국 시간대(Asia/Seoul, UTC+9)로 날짜 파싱
function parseKoreanDate(dateString) {
  if (!dateString) return new Date();
  
  // 이미 Date 객체면 그대로 반환
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // 문자열인 경우 파싱
  let dateStr = dateString.toString().trim();
  
  // 날짜 형식이 "YYYY-MM-DD HH:mm" 또는 "YYYY-MM-DD"인 경우
  // 한국 시간대(UTC+9)로 해석하기 위해 시간대 정보 추가
  if (/^\d{4}-\d{2}-\d{2}(\s+\d{1,2}:\d{2})?$/.test(dateStr)) {
    // 시간이 없으면 자정(00:00)으로 설정
    if (!dateStr.includes(':')) {
      dateStr += ' 00:00';
    }
    // 한국 시간대(UTC+9)로 파싱
    // ISO 형식으로 변환: "2025-11-12 08:30" -> "2025-11-12T08:30:00+09:00"
    const [datePart, timePart] = dateStr.split(' ');
    const [hour, minute = '00'] = timePart.split(':');
    const isoString = `${datePart}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00+09:00`;
    return new Date(isoString);
  }
  
  // 다른 형식은 기본 파싱 사용
  const parsed = new Date(dateString);
  
  // 파싱된 날짜가 유효하지 않으면 현재 시간 반환
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  
  // 이미 시간대 정보가 있으면 그대로 사용, 없으면 한국 시간대로 간주
  // 문자열에 시간대 정보(+09:00, Z 등)가 없으면 한국 시간대 오프셋 적용
  if (!dateStr.includes('+') && !dateStr.includes('-') && !dateStr.includes('Z') && !dateStr.includes('T')) {
    // 시간대 정보가 없는 경우, 한국 시간대 오프셋(+9시간) 적용
    const utcDate = new Date(dateString + 'Z'); // UTC로 파싱 시도
    if (!isNaN(utcDate.getTime())) {
      // UTC 시간에서 9시간을 빼서 한국 시간으로 조정
      // (한국은 UTC+9이므로 UTC 시간에 9시간을 더해야 함)
      return new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
    }
  }
  
  return parsed;
}

// 한국 시간대 기준 현재 날짜 가져오기 (날짜만, 시간은 0시 0분)
function getKoreanToday() {
  const now = new Date();
  // 한국 시간대(Asia/Seoul)의 현재 날짜 문자열 얻기
  const koreanDateString = now.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Seoul'
  }); // "YYYY-MM-DD" 형식
  
  // 날짜만 파싱 (시간은 00:00:00)
  const [year, month, day] = koreanDateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// 한국 시간대 기준 현재 시간 가져오기 (시간 포함)
function getKoreanNow() {
  const now = new Date();
  // 한국 시간대(Asia/Seoul)의 현재 시간 정보 얻기
  const koreanTimeString = now.toLocaleString('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // "MM/DD/YYYY, HH:mm:ss" 형식을 파싱
  const [datePart, timePart] = koreanTimeString.split(', ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);
  
  return new Date(year, month - 1, day, hour, minute, second);
}

function loadTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');
}

function getHeader(activeTab = '') {
  let header = loadTemplate('header.html');
  // active 클래스 설정
  header = header.replace(/\{\{navActivePost\}\}/g, activeTab === 'post' ? 'active' : '');
  header = header.replace(/\{\{navActiveSeries\}\}/g, activeTab === 'series' ? 'active' : '');
  header = header.replace(/\{\{navActiveAbout\}\}/g, activeTab === 'about' ? 'active' : '');
  return header;
}

function getFooter() {
  return loadTemplate('footer.html');
}

function getAllPosts() {
  const files = fs.readdirSync(POSTS_DIR);
  const posts = [];
  
  files.forEach(file => {
    if (file.endsWith('.md')) {
      const content = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
      const { attributes, body } = matter(content);
      
      // 드래프트는 제외 (draft: true인 경우)
      if (attributes.draft !== true) {
        // 상태 마커 처리 후 마크다운 변환
        const processedBody = processStatusMarkers(body);
        const html = marked(processedBody);
        const slug = file.replace('.md', '');
        
        posts.push({
          ...attributes,
          slug,
          content: html,
          date: parseKoreanDate(attributes.date) || new Date(),
          excerpt: attributes.excerpt || body.substring(0, 200) + '...'
        });
      }
    }
  });
  
  // 날짜순 정렬 (최신순) - 한국 시간대 기준
  return posts.sort((a, b) => {
    const dateA = parseKoreanDate(a.date);
    const dateB = parseKoreanDate(b.date);
    return dateB - dateA;
  });
}

function getSeries(posts) {
  const series = {};
  posts.forEach(post => {
    if (post.series) {
      const seriesName = post.series;
      if (!series[seriesName]) {
        series[seriesName] = [];
      }
      series[seriesName].push(post);
    }
  });
  
  // 각 시리즈의 포스트를 날짜순으로 정렬 - 한국 시간대 기준
  Object.keys(series).forEach(seriesName => {
    series[seriesName].sort((a, b) => {
      const dateA = parseKoreanDate(a.date);
      const dateB = parseKoreanDate(b.date);
      return dateA - dateB;
    });
  });
  
  return series;
}

function getSeriesPosts(series, seriesName) {
  return series[seriesName] || [];
}

function getSeriesNavigation(post, seriesPosts) {
  if (!seriesPosts || seriesPosts.length === 0) {
    return { prev: null, next: null };
  }
  
  const currentIndex = seriesPosts.findIndex(p => p.slug === post.slug);
  if (currentIndex === -1) {
    return { prev: null, next: null };
  }
  
  return {
    prev: currentIndex > 0 ? seriesPosts[currentIndex - 1] : null,
    next: currentIndex < seriesPosts.length - 1 ? seriesPosts[currentIndex + 1] : null
  };
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function buildIndex(posts) {
  const idx = lunr(function() {
    this.ref('slug');
    this.field('title', { boost: 10 });
    this.field('content');
    this.field('tags', { boost: 5 });
    
    posts.forEach(post => {
      this.add({
        slug: post.slug,
        title: post.title || '',
        content: post.content.replace(/<[^>]*>/g, ' '), // HTML 태그 제거
        tags: (post.tags || []).join(' ')
      });
    });
  });
  
  // 포스트 데이터도 함께 저장 (검색 결과 표시용)
  const postsData = {};
  posts.forEach(post => {
    postsData[post.slug] = {
      title: post.title || 'Untitled',
      excerpt: post.excerpt || ''
    };
  });
  
  return {
    index: idx.toJSON(),
    posts: postsData
  };
}

function buildRSS(posts) {
  const feed = new RSS({
    title: 'TIL - Today I Learned',
    description: 'Today I Learned 블로그',
    feed_url: 'https://ellenseon.github.io/TIL/rss.xml',
    site_url: 'https://ellenseon.github.io/TIL',
    language: 'ko',
    pubDate: new Date().toUTCString()
  });
  
  posts.slice(0, 20).forEach(post => {
    feed.item({
      title: post.title,
      description: post.excerpt,
      url: `https://ellenseon.github.io/TIL/posts/${post.slug}.html`,
      date: post.date,
      categories: post.tags || []
    });
  });
  
  return feed.xml();
}

function buildPostPage(post, allPosts, index, series) {
  const template = loadTemplate('post.html');
  
  // 시리즈가 있으면 시리즈 내 네비게이션, 없으면 전체 포스트 네비게이션
  let prevPost = null;
  let nextPost = null;
  let seriesInfo = '';
  let seriesNavigation = '';
  let seriesShare = '';
  let footerShare = '';
  
  const title = post.title || 'Untitled';
  const url = `https://ellenseon.github.io/TIL/posts/${post.slug}.html`;
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);
  
  if (post.series && series[post.series]) {
    const seriesPosts = series[post.series];
    const nav = getSeriesNavigation(post, seriesPosts);
    prevPost = nav.prev;
    nextPost = nav.next;
    
    const seriesSlug = slugify(post.series);
    const currentIndex = seriesPosts.findIndex(p => p.slug === post.slug);
    const totalPosts = seriesPosts.length;
    
    seriesInfo = `
      <div class="series-info">
        <a href="${BASE_PATH}/series/${seriesSlug}.html" class="series-link">
          <span class="series-label">시리즈</span>
          <span class="series-name">${post.series}</span>
        </a>
        <span class="series-progress">${currentIndex + 1} / ${totalPosts}</span>
      </div>
    `;
    
    // 시리즈 포스트일 때 공유하기를 시리즈 네비게이션 위에 배치
    seriesShare = `
      <div class="post-share">
        <button class="share-btn-main" id="share-toggle-series" title="공유하기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
          </svg>
        </button>
        <div class="share-menu" id="share-menu-series">
          <a href="https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}" target="_blank" rel="noopener noreferrer" class="share-btn-item" title="Twitter 공유">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener noreferrer" class="share-btn-item" title="Facebook 공유">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener noreferrer" class="share-btn-item" title="LinkedIn 공유">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <button class="share-btn-item" id="copy-url-series" title="URL 복사" data-url="${url}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
        </div>
      </div>
      <script>
        // 공유 메뉴 토글 (시리즈용)
        const shareToggleSeries = document.getElementById('share-toggle-series');
        const shareMenuSeries = document.getElementById('share-menu-series');
        const copyUrlBtnSeries = document.getElementById('copy-url-series');
        
        if (shareToggleSeries && shareMenuSeries) {
          shareToggleSeries.addEventListener('click', () => {
            shareMenuSeries.classList.toggle('show');
          });
          
          // 외부 클릭 시 닫기
          document.addEventListener('click', (e) => {
            if (!shareToggleSeries.contains(e.target) && !shareMenuSeries.contains(e.target)) {
              shareMenuSeries.classList.remove('show');
            }
          });
        }
        
        // URL 복사 (시리즈용)
        if (copyUrlBtnSeries) {
          copyUrlBtnSeries.addEventListener('click', async () => {
            const url = copyUrlBtnSeries.getAttribute('data-url');
            try {
              await navigator.clipboard.writeText(url);
              copyUrlBtnSeries.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
              copyUrlBtnSeries.title = '복사됨!';
              setTimeout(() => {
                copyUrlBtnSeries.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
                copyUrlBtnSeries.title = 'URL 복사';
              }, 2000);
            } catch (err) {
              console.error('복사 실패:', err);
            }
          });
        }
      </script>
    `;
    
    if (prevPost || nextPost) {
      seriesNavigation = '<div class="series-navigation">';
      if (prevPost) {
        seriesNavigation += `<a href="${BASE_PATH}/posts/${prevPost.slug}.html" class="series-nav-link prev">← 이전 글: ${prevPost.title}</a>`;
      }
      if (nextPost) {
        seriesNavigation += `<a href="${BASE_PATH}/posts/${nextPost.slug}.html" class="series-nav-link next">다음 글: ${nextPost.title} →</a>`;
      }
      seriesNavigation += '</div>';
    }
  } else {
    // 시리즈가 없으면 전체 포스트 기준 네비게이션
    prevPost = index > 0 ? allPosts[index - 1] : null;
    nextPost = index < allPosts.length - 1 ? allPosts[index + 1] : null;
    
    // 시리즈가 없을 때만 하단 공유하기 버튼 표시
    footerShare = `
      <div class="post-share">
        <button class="share-btn-main" id="share-toggle" title="공유하기">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
          </svg>
        </button>
        <div class="share-menu" id="share-menu">
          <a href="https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}" target="_blank" rel="noopener noreferrer" class="share-btn-item" title="Twitter 공유">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" rel="noopener noreferrer" class="share-btn-item" title="Facebook 공유">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank" rel="noopener noreferrer" class="share-btn-item" title="LinkedIn 공유">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          <button class="share-btn-item" id="copy-url" title="URL 복사" data-url="${url}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
        </div>
      </div>
      <script>
        // 공유 메뉴 토글
        const shareToggle = document.getElementById('share-toggle');
        const shareMenu = document.getElementById('share-menu');
        const copyUrlBtn = document.getElementById('copy-url');
        
        if (shareToggle && shareMenu) {
          shareToggle.addEventListener('click', () => {
            shareMenu.classList.toggle('show');
          });
          
          // 외부 클릭 시 닫기
          document.addEventListener('click', (e) => {
            if (!shareToggle.contains(e.target) && !shareMenu.contains(e.target)) {
              shareMenu.classList.remove('show');
            }
          });
        }
        
        // URL 복사
        if (copyUrlBtn) {
          copyUrlBtn.addEventListener('click', async () => {
            const url = copyUrlBtn.getAttribute('data-url');
            try {
              await navigator.clipboard.writeText(url);
              copyUrlBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
              copyUrlBtn.title = '복사됨!';
              setTimeout(() => {
                copyUrlBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>';
                copyUrlBtn.title = 'URL 복사';
              }, 2000);
            } catch (err) {
              console.error('복사 실패:', err);
            }
          });
        }
      </script>
    `;
  }
  
  let html = template
    .replace(/\{\{header\}\}/g, getHeader('post'))
    .replace(/\{\{footer\}\}/g, getFooter())
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{content\}\}/g, post.content)
    .replace(/\{\{date\}\}/g, formatDate(post.date))
    .replace(/\{\{seriesInfo\}\}/g, seriesInfo)
    .replace(/\{\{tags\}\}/g, (post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join(''))
    .replace(/\{\{description\}\}/g, post.excerpt || title)
    .replace(/\{\{url\}\}/g, url)
    .replace(/\{\{image\}\}/g, post.image || 'https://ellenseon.github.io/TIL/assets/images/profile/Ellen.jpg')
    .replace(/\{\{encodedTitle\}\}/g, encodedTitle)
    .replace(/\{\{encodedUrl\}\}/g, encodedUrl)
    .replace(/\{\{seriesShare\}\}/g, seriesShare)
    .replace(/\{\{seriesNavigation\}\}/g, seriesNavigation)
    .replace(/\{\{footerShare\}\}/g, footerShare);
  
  // 경로 치환 (템플릿의 /TIL/를 BASE_PATH로 변경)
  if (BASE_PATH === '') {
    // 로컬 모드: /TIL/ 제거
    html = html.replace(/\/TIL\//g, '/');
  } else {
    // 프로덕션 모드: 이미 /TIL/이 있으므로 그대로 유지
    // 중복 방지를 위해 이미 /TIL/이 있으면 변경하지 않음
  }
  
  // 일반 네비게이션 (시리즈가 없을 때만)
  if (!post.series) {
    if (prevPost) {
      html = html.replace(/\{\{prevPost\}\}/g, `<a href="${BASE_PATH}/posts/${prevPost.slug}.html" class="nav-link">← ${prevPost.title}</a>`);
    } else {
      html = html.replace(/\{\{prevPost\}\}/g, '');
    }
    
    if (nextPost) {
      html = html.replace(/\{\{nextPost\}\}/g, `<a href="${BASE_PATH}/posts/${nextPost.slug}.html" class="nav-link">${nextPost.title} →</a>`);
    } else {
      html = html.replace(/\{\{nextPost\}\}/g, '');
    }
  } else {
    html = html.replace(/\{\{prevPost\}\}/g, '');
    html = html.replace(/\{\{nextPost\}\}/g, '');
  }
  
  return html;
}

function buildSeriesPage(seriesName, posts) {
  const template = loadTemplate('series.html');
  const seriesSlug = slugify(seriesName);
  
  const postsHtml = posts.map((post, index) => {
    const postDate = parseKoreanDate(post.date);
    const isoDate = postDate.toISOString();
    return `
    <article class="series-post-item" data-post-url="${BASE_PATH}/posts/${post.slug}.html">
      <div class="series-post-number">${index + 1}</div>
      <div class="series-post-content">
        <h2><a href="${BASE_PATH}/posts/${post.slug}.html">${post.title || 'Untitled'}</a></h2>
        <p class="excerpt">${post.excerpt}</p>
        <div class="post-footer-meta">
          <div class="post-tags"></div>
          <div class="post-meta-info">
            <span class="post-date" data-post-date="${isoDate}">계산 중...</span>
          </div>
        </div>
      </div>
    </article>
  `;
  }).join('');
  
  let html = template
    .replace(/\{\{header\}\}/g, getHeader('series'))
    .replace(/\{\{footer\}\}/g, getFooter())
    .replace(/\{\{series\}\}/g, seriesName)
    .replace(/\{\{seriesSlug\}\}/g, seriesSlug)
    .replace(/\{\{postCount\}\}/g, posts.length)
    .replace(/\{\{posts\}\}/g, postsHtml);
  
  // 경로 치환 (템플릿의 /TIL/를 BASE_PATH로 변경)
  if (BASE_PATH === '') {
    // 로컬 모드: /TIL/ 제거
    html = html.replace(/\/TIL\//g, '/');
  } else {
    // 프로덕션 모드: 이미 /TIL/이 있으므로 그대로 유지
  }
  
  return html;
}

function getAllTags(posts) {
  const tagCounts = {};
  posts.forEach(post => {
    (post.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  return Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
}

function buildIndexPage(posts, searchData, series) {
  const template = loadTemplate('index.html');
  
  // 태그 목록 생성
  const allTags = getAllTags(posts);
  const tagsList = allTags.map(({ tag, count }) => 
    `<a href="#" class="tag-item" data-tag="${tag}">${tag} <span class="tag-count">(${count})</span></a>`
  ).join('\n      ');
  
  const tagsHtml = `
      <a href="#" class="tag-item tag-item-all" data-tag="all">전체보기 <span class="tag-count">(${posts.length})</span></a>
${tagsList}
  `;
  
  // 포스트 HTML 생성 (velog 스타일)
  // ISO 8601 형식으로 날짜 저장 (클라이언트 측에서 상대 시간 계산)
  const postsHtml = posts.map(post => {
    const postDate = parseKoreanDate(post.date);
    const isoDate = postDate.toISOString();
    
    return `
      <article class="post-preview" data-post-url="${BASE_PATH}/posts/${post.slug}.html">
        <h2 class="post-title"><a href="${BASE_PATH}/posts/${post.slug}.html">${post.title || 'Untitled'}</a></h2>
        <div class="post-content-preview">${post.excerpt}</div>
        <div class="post-footer-meta">
          <div class="post-tags">
            ${(post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
          <div class="post-meta-info">
            <span class="post-date" data-post-date="${isoDate}">계산 중...</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
  
  // 검색 인덱스와 포스트 데이터를 JSON으로 이스케이프
  const escapedData = JSON.stringify(searchData);
  
  let html = template
    .replace(/\{\{header\}\}/g, getHeader('post'))
    .replace(/\{\{footer\}\}/g, getFooter())
    .replace(/\{\{tagsSidebar\}\}/g, tagsHtml)
    .replace(/\{\{posts\}\}/g, postsHtml)
    .replace(/\{\{searchIndex\}\}/g, escapedData);
  
  // 경로 치환 (템플릿의 /TIL/를 BASE_PATH로 변경)
  if (BASE_PATH === '') {
    // 로컬 모드: /TIL/ 제거
    html = html.replace(/\/TIL\//g, '/');
  } else {
    // 프로덕션 모드: 이미 /TIL/이 있으므로 그대로 유지
  }
  
  return html;
}

function formatDate(date) {
  const dateObj = parseKoreanDate(date);
  const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0;
  
  if (hasTime) {
    // 시간이 있으면 날짜와 시간 모두 표시 (한국 시간대)
    return dateObj.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' KST';
  } else {
    // 시간이 없으면 날짜만 표시
    return dateObj.toLocaleDateString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

function getRelativeDate(date) {
  // 한국 시간대 기준으로 현재 시간과 포스트 날짜 비교
  const now = getKoreanNow();
  const postDate = parseKoreanDate(date);
  
  // 시간 차이 계산 (밀리초 단위)
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
  const today = getKoreanToday();
  const postDateOnly = new Date(
    postDate.getFullYear(),
    postDate.getMonth(),
    postDate.getDate()
  );
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  
  const diffDays = Math.floor((todayOnly - postDateOnly) / (1000 * 60 * 60 * 24));
  
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

function buildSeriesListPage(series) {
  const template = loadTemplate('series-list.html');
  
  const seriesList = Object.keys(series).sort().map(seriesName => {
    const seriesSlug = slugify(seriesName);
    const seriesPosts = series[seriesName];
    const count = seriesPosts.length;
    const latestPost = seriesPosts[seriesPosts.length - 1];
    
    return `
      <div class="series-item">
        <a href="${BASE_PATH}/series/${seriesSlug}.html" class="series-item-link">
          <div class="series-item-header">
            <span class="series-item-name">${seriesName}</span>
            <span class="series-item-count">${count}개의 글</span>
          </div>
          <div class="series-item-latest">
            <span class="series-item-latest-label">최신:</span>
            <span class="series-item-latest-title">${latestPost.title}</span>
          </div>
        </a>
      </div>
    `;
  }).join('');
  
  const seriesListHtml = seriesList ? `<div class="series-list">${seriesList}</div>` : '<p>시리즈가 없습니다.</p>';
  
  let html = template
    .replace(/\{\{header\}\}/g, getHeader('series'))
    .replace(/\{\{footer\}\}/g, getFooter())
    .replace(/\{\{seriesList\}\}/g, seriesListHtml);
  
  // 경로 치환
  if (BASE_PATH === '') {
    html = html.replace(/\/TIL\//g, '/');
  }
  
  return html;
}

function buildAboutPage() {
  const template = loadTemplate('about.html');
  const aboutMdPath = path.join(__dirname, 'src', 'about.md');
  
  let content = '';
  if (fs.existsSync(aboutMdPath)) {
    const mdContent = fs.readFileSync(aboutMdPath, 'utf-8');
    const { attributes, body } = matter(mdContent);
    const processedBody = processStatusMarkers(body);
    content = marked(processedBody);
  } else {
    // 기본 내용 (마크다운 파일이 없을 경우)
    content = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <img src="${BASE_PATH}/assets/images/profile/Ellen.jpg" alt="Profile" style="width: 200px; height: 200px; border-radius: 50%; object-fit: cover; border: 3px solid var(--border-color);">
      </div>
      <h2>안녕하세요! 👋</h2>
      <p>안녕하세요, 저는 ellenseon입니다. 개발과 학습을 기록하는 공간입니다.</p>
    `;
  }
  
  let html = template
    .replace(/\{\{header\}\}/g, getHeader('about'))
    .replace(/\{\{footer\}\}/g, getFooter())
    .replace(/\{\{content\}\}/g, content);
  
  // 경로 치환 (템플릿의 /TIL/를 BASE_PATH로 변경)
  if (BASE_PATH === '') {
    // 로컬 모드: /TIL/ 제거
    html = html.replace(/\/TIL\//g, '/');
  } else {
    // 프로덕션 모드: 이미 /TIL/이 있으므로 그대로 유지
  }
  
  return html;
}

function copyAssets() {
  if (fs.existsSync(ASSETS_DIR)) {
    const distAssets = path.join(DIST_DIR, 'assets');
    if (!fs.existsSync(distAssets)) {
      fs.mkdirSync(distAssets, { recursive: true });
    }
    copyRecursiveSync(ASSETS_DIR, distAssets);
  }
  
  // Lunr.js 복사
  const lunrPath = path.join(__dirname, 'node_modules', 'lunr', 'lunr.min.js');
  if (fs.existsSync(lunrPath)) {
    const distScripts = path.join(DIST_DIR, 'scripts');
    if (!fs.existsSync(distScripts)) {
      fs.mkdirSync(distScripts, { recursive: true });
    }
    fs.copyFileSync(lunrPath, path.join(distScripts, 'lunr.min.js'));
  }
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function build() {
  console.log('Building blog...');
  
  // 디렉토리 생성
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
  }
  
  const postsDir = path.join(DIST_DIR, 'posts');
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }
  
  // 포스트 로드
  const posts = getAllPosts();
  console.log(`Found ${posts.length} posts`);
  
  // 시리즈별 그룹화
  const series = getSeries(posts);
  const seriesNames = Object.keys(series);
  console.log(`Found ${seriesNames.length} series: ${seriesNames.join(', ')}`);
  
  // 검색 인덱스 생성
  const searchData = buildIndex(posts);
  fs.writeFileSync(path.join(DIST_DIR, 'search-index.json'), JSON.stringify(searchData));
  
  // RSS 생성
  const rss = buildRSS(posts);
  fs.writeFileSync(path.join(DIST_DIR, 'rss.xml'), rss);
  
  // 포스트 페이지 생성
  posts.forEach((post, index) => {
    const html = buildPostPage(post, posts, index, series);
    fs.writeFileSync(path.join(postsDir, `${post.slug}.html`), html);
  });
  
  // 시리즈 페이지 생성
  const seriesDir = path.join(DIST_DIR, 'series');
  if (!fs.existsSync(seriesDir)) {
    fs.mkdirSync(seriesDir, { recursive: true });
  }
  
  seriesNames.forEach(seriesName => {
    const seriesPosts = series[seriesName];
    const html = buildSeriesPage(seriesName, seriesPosts);
    const seriesSlug = slugify(seriesName);
    fs.writeFileSync(path.join(seriesDir, `${seriesSlug}.html`), html);
    console.log(`Built series page: ${seriesName} (${seriesPosts.length} posts)`);
  });
  
  // 인덱스 페이지 생성
  const indexHtml = buildIndexPage(posts, searchData, series);
  fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);
  
  // 시리즈 목록 페이지 생성
  const seriesListHtml = buildSeriesListPage(series);
  fs.writeFileSync(path.join(DIST_DIR, 'series.html'), seriesListHtml);
  
  // About 페이지 생성
  const aboutHtml = buildAboutPage();
  fs.writeFileSync(path.join(DIST_DIR, 'about.html'), aboutHtml);
  
  // 정적 파일 복사
  copyAssets();
  
  // CSS, JS 복사
  const srcStyles = path.join(__dirname, 'src', 'styles');
  const srcScripts = path.join(__dirname, 'src', 'scripts');
  const distStyles = path.join(DIST_DIR, 'styles');
  const distScripts = path.join(DIST_DIR, 'scripts');
  
  if (fs.existsSync(srcStyles)) {
    copyRecursiveSync(srcStyles, distStyles);
  }
  if (fs.existsSync(srcScripts)) {
    copyRecursiveSync(srcScripts, distScripts);
  }
  
  console.log('Build complete!');
}

// 빌드 실행
build();

// Watch 모드
if (process.argv.includes('--watch')) {
  console.log('Watching for changes...');
  chokidar.watch([POSTS_DIR, TEMPLATES_DIR, path.join(__dirname, 'src', 'styles'), path.join(__dirname, 'src', 'scripts')]).on('change', () => {
    console.log('Change detected, rebuilding...');
    build();
  });
}

