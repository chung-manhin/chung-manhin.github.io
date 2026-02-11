/**
 * app.js — SPA core: router, rendering, dark mode, animations, comments, stats
 * Newspaper / Editorial Poster theme
 */
(function () {
  'use strict';

  /* ── Config ── */
  const SITE = {
    title: "chung-manhin's blog",
    author: 'chung-manhin',
    nickname: 'wenxuan',
    subtitle: 'Learn!',
    description: '机器人工程大学生的学习笔记与技术记录。',
    avatar: '/image/11.jpg',
    giscus: {
      repo: 'chung-manhin/chung-manhin.github.io',
      repoId: '',
      category: 'Announcements',
      categoryId: '',
    }
  };

  let postsData = [];
  const contentEl = () => document.getElementById('app-content');

  /* ── Bootstrap ── */
  document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
    await loadPosts();
    window.addEventListener('hashchange', onRoute);
    onRoute();
    initScrollReveal();
  });

  /* ── Load posts.json ── */
  async function loadPosts() {
    try {
      const res = await fetch('/posts.json?' + Date.now());
      postsData = await res.json();
      postsData.sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      console.error('Failed to load posts.json', e);
      postsData = [];
    }
    if (window.BlogSearch) window.BlogSearch.init(postsData);
  }

  /* ── Helpers ── */
  function formatDateCN(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return year + '\u5E74' + month + '\u6708' + day + '\u65E5';
  }

  function getTodayEdition() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const days = ['\u661F\u671F\u65E5', '\u661F\u671F\u4E00', '\u661F\u671F\u4E8C', '\u661F\u671F\u4E09', '\u661F\u671F\u56DB', '\u661F\u671F\u4E94', '\u661F\u671F\u516D'];
    return y + '-' + m + '-' + d + ' ' + days[now.getDay()];
  }

  /* ── Router ── */
  function onRoute() {
    const hash = location.hash || '#/';
    const parts = hash.replace('#/', '').split('/');
    const route = parts[0] || '';

    // Update active nav links
    document.querySelectorAll('.masthead-nav a, .mobile-tab-bar a').forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('active', href === hash || (hash === '#/' && href === '#/'));
    });

    switch (route) {
      case '':
        renderHome();
        break;
      case 'post':
        renderPost(decodeURIComponent(parts.slice(1).join('/')));
        break;
      case 'archives':
        renderArchives();
        break;
      case 'tags':
        renderTags();
        break;
      case 'about':
        renderAbout();
        break;
      case 'editor':
        renderEditor();
        break;
      default:
        renderHome();
    }

    window.scrollTo(0, 0);
  }

  /* ── Home — Newspaper Layout ── */
  function renderHome() {
    document.title = SITE.title;

    if (postsData.length === 0) {
      contentEl().innerHTML = `
        <div class="view-container">
          <div class="newspaper">
            <div class="edition-bar">
              <span class="edition-line"></span>
              <span>${getTodayEdition()}</span>
              <span class="edition-line"></span>
            </div>
            <div class="newspaper-empty">\u6682\u65E0\u6587\u7AE0</div>
          </div>
        </div>`;
      return;
    }

    // Lead story = first (newest) post
    const lead = postsData[0];
    const leadTags = lead.tags.map(t => `<span class="tag">${t}</span>`).join('');

    let leadHTML = `
      <article class="lead-story scroll-reveal">
        <a href="#/post/${encodeURIComponent(lead.slug)}">
          <div class="lead-category">${lead.category}</div>
          <h2 class="lead-title">${lead.title}</h2>
          <p class="lead-excerpt">${lead.excerpt}</p>
          <div class="lead-meta">${formatDateCN(lead.date)} &middot; ${SITE.author}</div>
          <div class="lead-tags">${leadTags}</div>
        </a>
      </article>`;

    // Remaining stories in grid
    let gridHTML = '';
    if (postsData.length > 1) {
      const rest = postsData.slice(1);
      let items = '';
      rest.forEach((post, i) => {
        const isLastOdd = (rest.length % 2 === 1) && (i === rest.length - 1);
        items += `
          <article class="story scroll-reveal${isLastOdd ? ' full-width' : ''}">
            <a href="#/post/${encodeURIComponent(post.slug)}">
              <div class="story-category">${post.category}</div>
              <h3 class="story-title">${post.title}</h3>
              <p class="story-excerpt">${post.excerpt}</p>
              <div class="story-meta">${post.date}</div>
            </a>
          </article>`;
      });
      gridHTML = `
        <hr class="section-rule thick">
        <div class="section-header">\u66F4\u591A\u6587\u7AE0</div>
        <div class="stories-grid">${items}</div>`;
    }

    contentEl().innerHTML = `
      <div class="view-container">
        <div class="newspaper">
          <div class="edition-bar">
            <span class="edition-line"></span>
            <span>${getTodayEdition()} &middot; \u7B2C ${postsData.length} \u7BC7</span>
            <span class="edition-line"></span>
          </div>
          ${leadHTML}
          ${gridHTML}
        </div>
      </div>`;
    reobserve();
  }

  /* ── Post ── */
  async function renderPost(slug) {
    const post = postsData.find(p => p.slug === slug);
    if (!post) {
      contentEl().innerHTML = '<div class="view-container"><div class="article-header"><h1 class="article-title">\u6587\u7AE0\u672A\u627E\u5230</h1></div></div>';
      return;
    }
    document.title = `${post.title} | ${SITE.title}`;

    contentEl().innerHTML = '<div class="loading-spinner"></div>';

    try {
      const res = await fetch(`/posts/${encodeURIComponent(post.slug)}.md?` + Date.now());
      if (!res.ok) throw new Error('Failed to load');
      const md = await res.text();
      const html = marked.parse(md);

      const tags = post.tags.map(t => `<span class="tag">${t}</span>`).join('');
      contentEl().innerHTML = `
        <div class="view-container">
          <div class="article-back"><a href="#/">&larr; \u8FD4\u56DE\u9996\u9875</a></div>
          <header class="article-header">
            <div class="article-category">${post.category}</div>
            <h1 class="article-title">${post.title}</h1>
            <div class="article-meta">
              <span>${formatDateCN(post.date)}</span>
              <span>${SITE.author}</span>
            </div>
            <div class="article-tags">${tags}</div>
          </header>
          <div class="article-divider">
            <span class="article-divider-ornament">\u25C6</span>
          </div>
          <article class="article-body">${html}</article>
          <div class="article-reading-count">
            <span id="busuanzi_container_page_pv">\u9605\u8BFB\u91CF: <span id="busuanzi_value_page_pv">--</span></span>
          </div>
          <section class="comments-section" id="comments-section">
            <h3>\u8BC4\u8BBA</h3>
            <div id="giscus-container"></div>
          </section>
        </div>`;

      // Syntax highlighting
      document.querySelectorAll('.article-body pre code').forEach(block => {
        hljs.highlightElement(block);
      });

      // Load Giscus comments
      loadGiscus(post.slug);

    } catch (e) {
      contentEl().innerHTML = `<div class="view-container"><div class="article-header"><h1 class="article-title">\u52A0\u8F7D\u5931\u8D25</h1><p>${e.message}</p></div></div>`;
    }
  }

  /* ── Archives ── */
  function renderArchives() {
    document.title = `\u5F52\u6863 | ${SITE.title}`;
    const byYear = {};
    postsData.forEach(p => {
      const y = p.date.split('-')[0];
      (byYear[y] = byYear[y] || []).push(p);
    });

    let html = '<div class="view-container"><div class="archive-page"><h1>\u5F52\u6863</h1><hr class="page-title-rule">';
    Object.keys(byYear).sort((a, b) => b - a).forEach(year => {
      html += `<h2 class="archive-year">${year}</h2><ul class="archive-list">`;
      byYear[year].forEach(p => {
        html += `
          <li class="archive-item scroll-reveal">
            <span class="archive-item-date">${p.date}</span>
            <a class="archive-item-title" href="#/post/${encodeURIComponent(p.slug)}">${p.title}</a>
          </li>`;
      });
      html += '</ul>';
    });
    html += '</div></div>';
    contentEl().innerHTML = html;
    reobserve();
  }

  /* ── Tags ── */
  function renderTags() {
    document.title = `\u6807\u7B7E | ${SITE.title}`;
    const tagMap = {};
    postsData.forEach(p => {
      p.tags.forEach(t => {
        (tagMap[t] = tagMap[t] || []).push(p);
      });
    });

    const tagNames = Object.keys(tagMap).sort();
    let chips = '<div class="tags-cloud">';
    tagNames.forEach(t => {
      chips += `<span class="tag-chip" data-tag="${t}">${t}<span class="tag-count">(${tagMap[t].length})</span></span>`;
    });
    chips += '</div>';

    let lists = '';
    tagNames.forEach(t => {
      lists += `<div class="tag-posts" data-tag="${t}"><h2 class="archive-year">${t}</h2><ul class="archive-list">`;
      tagMap[t].forEach(p => {
        lists += `<li class="archive-item"><span class="archive-item-date">${p.date}</span><a class="archive-item-title" href="#/post/${encodeURIComponent(p.slug)}">${p.title}</a></li>`;
      });
      lists += '</ul></div>';
    });

    contentEl().innerHTML = `<div class="view-container"><div class="tags-page"><h1>\u6807\u7B7E</h1><hr class="page-title-rule">${chips}${lists}</div></div>`;

    // Tag chip click filter
    document.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        const isActive = chip.classList.contains('active');
        document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.tag-posts').forEach(el => el.style.display = '');
        if (!isActive) {
          chip.classList.add('active');
          document.querySelectorAll('.tag-posts').forEach(el => {
            el.style.display = el.dataset.tag === tag ? '' : 'none';
          });
        }
      });
    });
  }

  /* ── About ── */
  function renderAbout() {
    document.title = `\u5173\u4E8E | ${SITE.title}`;
    contentEl().innerHTML = `
      <div class="view-container">
        <div class="about-page">
          <h1>\u5173\u4E8E\u6211</h1>
          <hr class="page-title-rule">
          <div class="about-content">
            <p>\u4F60\u597D\uFF01\u6211\u662F <strong>${SITE.nickname}</strong>\uFF0C\u4E00\u540D\u673A\u5668\u4EBA\u5DE5\u7A0B\u5927\u5B66\u751F\u3002</p>
            <p>\u8FD9\u4E2A\u535A\u5BA2\u7528\u6765\u8BB0\u5F55\u6211\u7684\u5B66\u4E60\u7B14\u8BB0\u3001\u6280\u672F\u63A2\u7D22\u548C\u9879\u76EE\u7ECF\u5386\u3002\u5E0C\u671B\u8FD9\u4E9B\u5185\u5BB9\u5BF9\u4F60\u4E5F\u6709\u6240\u5E2E\u52A9\u3002</p>
            <p>\u76EE\u524D\u5173\u6CE8\u7684\u65B9\u5411\uFF1A\u673A\u5668\u4EBA\u6280\u672F\u3001\u5D4C\u5165\u5F0F\u5F00\u53D1\u3001Web \u524D\u7AEF\u3002</p>
            <p>\u5982\u679C\u4F60\u6709\u4EFB\u4F55\u95EE\u9898\u6216\u60F3\u6CD5\uFF0C\u6B22\u8FCE\u5728\u6587\u7AE0\u4E0B\u65B9\u7559\u8A00\u4EA4\u6D41\u3002</p>
          </div>
        </div>
      </div>`;
  }

  /* ── Editor (delegates to editor.js) ── */
  function renderEditor() {
    document.title = `\u7F16\u8F91\u5668 | ${SITE.title}`;
    if (window.BlogEditor) {
      window.BlogEditor.render(contentEl());
    } else {
      contentEl().innerHTML = '<div class="view-container"><p style="padding:3rem;text-align:center">\u7F16\u8F91\u5668\u6A21\u5757\u52A0\u8F7D\u4E2D\u2026</p></div>';
    }
  }

  /* ── Dark Mode ── */
  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    if (!btn) return;

    function applyTheme(dark) {
      document.body.classList.toggle('dark-theme', dark);
      document.documentElement.classList.toggle('dark-theme', dark);
      icon.textContent = dark ? '\u2609' : '\u263E';
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    }

    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved ? saved === 'dark' : prefersDark);

    btn.addEventListener('click', () => {
      applyTheme(!document.body.classList.contains('dark-theme'));
    });
  }

  /* ── Scroll Reveal (IntersectionObserver) ── */
  let observer;
  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
  }

  function reobserve() {
    if (!observer) return;
    setTimeout(() => {
      document.querySelectorAll('.scroll-reveal:not(.revealed)').forEach(el => {
        observer.observe(el);
      });
    }, 50);
  }

  /* ── Giscus Comments ── */
  function loadGiscus(slug) {
    const container = document.getElementById('giscus-container');
    if (!container || !SITE.giscus.repoId) return;

    const theme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', SITE.giscus.repo);
    script.setAttribute('data-repo-id', SITE.giscus.repoId);
    script.setAttribute('data-category', SITE.giscus.category);
    script.setAttribute('data-category-id', SITE.giscus.categoryId);
    script.setAttribute('data-mapping', 'specific');
    script.setAttribute('data-term', slug);
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-lang', 'zh-CN');
    script.crossOrigin = 'anonymous';
    script.async = true;
    container.appendChild(script);
  }

  /* ── Expose for other modules ── */
  window.BlogApp = {
    postsData: () => postsData,
    reloadPosts: loadPosts,
    SITE
  };

})();
