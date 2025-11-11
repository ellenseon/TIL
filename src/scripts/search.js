let idx = null;
let postsData = {};

// Lunr 인덱스 로드
if (typeof searchIndex !== 'undefined') {
  idx = lunr.Index.load(searchIndex.index);
  postsData = searchIndex.posts || {};
}

const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

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

