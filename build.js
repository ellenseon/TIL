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

// Prism 설정
marked.setOptions({
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

function loadTemplate(name) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, name), 'utf-8');
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
        const html = marked(body);
        const slug = file.replace('.md', '');
        
        posts.push({
          ...attributes,
          slug,
          content: html,
          date: attributes.date || new Date(),
          excerpt: attributes.excerpt || body.substring(0, 200) + '...'
        });
      }
    }
  });
  
  // 날짜순 정렬 (최신순)
  return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
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
  
  // 각 시리즈의 포스트를 날짜순으로 정렬
  Object.keys(series).forEach(seriesName => {
    series[seriesName].sort((a, b) => new Date(a.date) - new Date(b.date));
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
  }
  
  const title = post.title || 'Untitled';
  const url = `https://ellenseon.github.io/TIL/posts/${post.slug}.html`;
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);
  
  let html = template
    .replace(/\{\{title\}\}/g, title)
    .replace(/\{\{content\}\}/g, post.content)
    .replace(/\{\{date\}\}/g, new Date(post.date).toLocaleDateString('ko-KR'))
    .replace(/\{\{seriesInfo\}\}/g, seriesInfo)
    .replace(/\{\{tags\}\}/g, (post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join(''))
    .replace(/\{\{description\}\}/g, post.excerpt || title)
    .replace(/\{\{url\}\}/g, url)
    .replace(/\{\{image\}\}/g, post.image || 'https://ellenseon.github.io/TIL/assets/images/profile/Ellen.jpg')
    .replace(/\{\{encodedTitle\}\}/g, encodedTitle)
    .replace(/\{\{encodedUrl\}\}/g, encodedUrl)
    .replace(/\{\{seriesNavigation\}\}/g, seriesNavigation);
  
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
    const relativeDate = getRelativeDate(post.date);
    return `
    <article class="series-post-item">
      <div class="series-post-number">${index + 1}</div>
      <div class="series-post-content">
        <h2><a href="${BASE_PATH}/posts/${post.slug}.html">${post.title || 'Untitled'}</a></h2>
        <p class="excerpt">${post.excerpt}</p>
        <div class="post-footer-meta">
          <div class="post-tags"></div>
          <div class="post-meta-info">
            <span class="post-date">${relativeDate}</span>
          </div>
        </div>
      </div>
    </article>
  `;
  }).join('');
  
  let html = template
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
  const postsHtml = posts.map(post => {
    const dateStr = new Date(post.date).toLocaleDateString('ko-KR');
    const relativeDate = getRelativeDate(post.date);
    
    return `
      <article class="post-preview">
        <h2 class="post-title"><a href="${BASE_PATH}/posts/${post.slug}.html">${post.title || 'Untitled'}</a></h2>
        <div class="post-content-preview">${post.excerpt}</div>
        <div class="post-footer-meta">
          <div class="post-tags">
            ${(post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
          <div class="post-meta-info">
            <span class="post-date">${relativeDate}</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
  
  // 검색 인덱스와 포스트 데이터를 JSON으로 이스케이프
  const escapedData = JSON.stringify(searchData);
  
  let html = template
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

function getRelativeDate(date) {
  const now = new Date();
  const postDate = new Date(date);
  const diffTime = now - postDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
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
  
  let html = template.replace(/\{\{seriesList\}\}/g, seriesListHtml);
  
  // 경로 치환
  if (BASE_PATH === '') {
    html = html.replace(/\/TIL\//g, '/');
  }
  
  return html;
}

function buildAboutPage() {
  const template = loadTemplate('about.html');
  
  let html = template;
  
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

