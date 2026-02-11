/**
 * search.js — Client-side full-text search
 */
(function () {
  'use strict';

  let posts = [];
  let overlayEl, inputEl, resultsEl;

  const BlogSearch = {
    init(postsData) {
      posts = postsData || [];
      overlayEl = document.getElementById('search-overlay');
      inputEl = document.getElementById('search-input');
      resultsEl = document.getElementById('search-results');
      if (!overlayEl || !inputEl) return;

      // Keyboard shortcut Ctrl+K / Cmd+K
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault();
          this.open();
        }
        if (e.key === 'Escape' && overlayEl.classList.contains('active')) {
          this.close();
        }
      });

      // Close on overlay background click
      overlayEl.addEventListener('click', (e) => {
        if (e.target === overlayEl) this.close();
      });

      // Close button
      const closeBtn = document.getElementById('search-close');
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      // Input handler
      inputEl.addEventListener('input', () => this.search(inputEl.value));
    },

    open() {
      if (!overlayEl) return;
      overlayEl.classList.add('active');
      inputEl.value = '';
      inputEl.focus();
      this.search('');
    },

    close() {
      if (!overlayEl) return;
      overlayEl.classList.remove('active');
      inputEl.value = '';
    },

    search(query) {
      if (!resultsEl) return;
      const q = query.trim().toLowerCase();

      if (!q) {
        resultsEl.innerHTML = '<div class="search-empty">输入关键词搜索文章…</div>';
        return;
      }

      const results = posts.filter(p => {
        const haystack = `${p.title} ${p.excerpt} ${p.tags.join(' ')} ${p.category}`.toLowerCase();
        return haystack.includes(q);
      });

      if (results.length === 0) {
        resultsEl.innerHTML = `<div class="search-empty">没有找到 "${escapeHtml(query)}" 相关的文章</div>`;
        return;
      }

      resultsEl.innerHTML = results.map(p => {
        const title = highlight(p.title, q);
        const excerpt = highlight(p.excerpt, q);
        return `
          <div class="search-result-item" onclick="location.hash='#/post/${encodeURIComponent(p.slug)}'; BlogSearch.close();">
            <div class="search-result-title">${title}</div>
            <div class="search-result-excerpt">${excerpt}</div>
          </div>`;
      }).join('');
    }
  };

  function highlight(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const re = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    return escaped.replace(re, '<mark>$1</mark>');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  window.BlogSearch = BlogSearch;
})();
