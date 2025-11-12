let idx = null;
let postsData = {};
let allPosts = [];

// Lunr 인덱스 로드
if (typeof searchIndex !== 'undefined') {
  idx = lunr.Index.load(searchIndex.index);
  postsData = searchIndex.posts || {};
}

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

// 태그 필터링 기능
function initTagFiltering() {
  // 모든 포스트 데이터 수집
  const postElements = document.querySelectorAll('.post-preview');
  allPosts = Array.from(postElements).map(postEl => {
    const titleEl = postEl.querySelector('.post-title a');
    const tagsEl = postEl.querySelectorAll('.post-tags .tag');
    return {
      element: postEl,
      title: titleEl ? titleEl.textContent : '',
      tags: Array.from(tagsEl).map(tag => tag.textContent.trim())
    };
  });

  // 태그 아이템 클릭 이벤트
  const tagItems = document.querySelectorAll('.tag-item, .post-tags .tag');
  tagItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation(); // 포스트 전체 클릭 이벤트 전파 방지
      const tag = item.getAttribute('data-tag') || item.textContent.trim();
      filterByTag(tag);
      
      // 사이드바 태그 활성화
      document.querySelectorAll('.tag-item').forEach(t => t.classList.remove('active'));
      if (item.classList.contains('tag-item')) {
        item.classList.add('active');
      } else {
        // 포스트의 태그를 클릭한 경우 사이드바에서도 활성화
        const sidebarTag = document.querySelector(`.tag-item[data-tag="${tag}"]`);
        if (sidebarTag) {
          sidebarTag.classList.add('active');
        }
      }
    });
  });
}

function filterByTag(tag) {
  if (tag === 'all') {
    // 전체보기
    allPosts.forEach(post => {
      post.element.style.display = 'block';
    });
    return;
  }

  // 태그로 필터링
  allPosts.forEach(post => {
    if (post.tags.includes(tag)) {
      post.element.style.display = 'block';
    } else {
      post.element.style.display = 'none';
    }
  });
}

// 페이지 로드 시 태그 필터링 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTagFiltering);
} else {
  initTagFiltering();
}

// 검색 실행
function performSearch(query) {
  if (!idx || !query.trim()) {
    searchResults.classList.remove('show');
    return;
  }

  try {
    const results = idx.search(query);
    
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item"><p>검색 결과가 없습니다.</p></div>';
      searchResults.classList.add('show');
      return;
    }

    // 포스트 데이터를 사용하여 결과 표시
    const resultsHtml = results.slice(0, 10).map(result => {
      const slug = result.ref;
      const post = postsData[slug] || { title: slug, excerpt: '' };
      return `
        <div class="search-result-item" onclick="window.location.href='/TIL/posts/${slug}.html'">
          <h3>${post.title}</h3>
          <p>${post.excerpt.substring(0, 100)}...</p>
        </div>
      `;
    }).join('');
    
    searchResults.innerHTML = resultsHtml;
    searchResults.classList.add('show');
  } catch (err) {
    console.error('Search error:', err);
  }
}

// 입력 이벤트
if (searchInput) {
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(e.target.value);
    }, 300);
  });

  // 외부 클릭 시 결과 닫기
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
      searchResults.classList.remove('show');
    }
  });
}

