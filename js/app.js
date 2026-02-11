/**
 * app.js — SPA core: router, rendering, dark mode, animations, comments
 * Clean modern blog theme
 */
(function () {
  'use strict';

  const SITE = {
    title: "chung-manhin's blog",
    author: 'chung-manhin',
    nickname: 'wenxuan',
    subtitle: '学习笔记',
    description: '机器人工程大学生的学习笔记与技术记录。',
    avatar: '/image/11.jpg',
    giscus: {
      repo: 'chung-manhin/chung-manhin.github.io',
      repoId: 'R_kgDOPNngSw',
      category: 'Announcements',
      categoryId: 'DIC_kwDOPNngS84C2NM0',
    }
  };

  let postsData = [];
  const contentEl = () => document.getElementById('app-content');

  document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
    initStickyHeader();
    initReadingProgress();
    await loadPosts();
    initScrollReveal();
    window.addEventListener('hashchange', onRoute);
    onRoute();
  });

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

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.getFullYear() + '\u5E74' + (d.getMonth() + 1) + '\u6708' + d.getDate() + '\u65E5';
  }

  /* ── Sticky Header (simple — no resize, just blur) ── */
  function initStickyHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        header.classList.toggle('scrolled', window.scrollY > 10);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ── Reading Progress ── */
  function initReadingProgress() {
    const bar = document.getElementById('reading-progress');
    if (!bar) return;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = h > 0 ? Math.min(window.scrollY / h * 100, 100) + '%' : '0%';
        ticking = false;
      });
    }, { passive: true });
    window.addEventListener('hashchange', () => { bar.style.width = '0%'; });
  }

  /* ── Router ── */
  function onRoute() {
    const hash = location.hash || '#/';
    const parts = hash.replace('#/', '').split('/');
    const route = parts[0] || '';

    document.querySelectorAll('.header-nav a, .mobile-tab-bar a').forEach(a => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('active', href === hash || (hash === '#/' && href === '#/'));
    });

    switch (route) {
      case '': renderHome(); break;
      case 'post': renderPost(decodeURIComponent(parts.slice(1).join('/'))); break;
      case 'archives': renderArchives(); break;
      case 'tags': renderTags(); break;
      case 'about': renderAbout(); break;
      case 'editor': renderEditor(); break;
      default: renderHome();
    }
    window.scrollTo(0, 0);
  }

  /* ── Home — Clean Post List ── */
  function renderHome() {
    document.title = SITE.title;

    if (postsData.length === 0) {
      contentEl().innerHTML = '<div class="view-container"><div class="post-list"><div class="post-list-empty">\u6682\u65E0\u6587\u7AE0</div></div></div>';
      return;
    }

    let cards = '';
    postsData.forEach((post, i) => {
      const tags = post.tags.map(t => `<span class="tag">${t}</span>`).join('');
      cards += `
        <article class="post-card${i === 0 ? ' featured' : ''} scroll-reveal">
          <a href="#/post/${encodeURIComponent(post.slug)}">
            <div class="post-card-meta">
              <span class="post-card-category">${post.category}</span>
              <span>${formatDate(post.date)}</span>
            </div>
            <h2 class="post-card-title">${post.title}</h2>
            <p class="post-card-excerpt">${post.excerpt}</p>
            <div class="post-card-tags">${tags}</div>
          </a>
        </article>`;
    });

    contentEl().innerHTML = `
      <div class="view-container">
        <div class="post-list">
          <div class="post-list-header">Posts</div>
          ${cards}
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

      // Prev / Next post navigation
      const idx = postsData.indexOf(post);
      const newer = idx > 0 ? postsData[idx - 1] : null;
      const older = idx < postsData.length - 1 ? postsData[idx + 1] : null;
      let postNav = '<nav class="post-nav">';
      postNav += older
        ? `<a class="post-nav-item post-nav-prev" href="#/post/${encodeURIComponent(older.slug)}"><span class="post-nav-label">\u2190 \u4E0A\u4E00\u7BC7</span><span class="post-nav-title">${older.title}</span></a>`
        : '<span class="post-nav-item"></span>';
      postNav += newer
        ? `<a class="post-nav-item post-nav-next" href="#/post/${encodeURIComponent(newer.slug)}"><span class="post-nav-label">\u4E0B\u4E00\u7BC7 \u2192</span><span class="post-nav-title">${newer.title}</span></a>`
        : '<span class="post-nav-item"></span>';
      postNav += '</nav>';

      contentEl().innerHTML = `
        <div class="view-container">
          <div class="article-back"><a href="#/">&larr; \u8FD4\u56DE</a></div>
          <header class="article-header">
            <div class="article-category">${post.category}</div>
            <h1 class="article-title">${post.title}</h1>
            <div class="article-meta">
              <span>${formatDate(post.date)}</span>
              <span>${SITE.author}</span>
            </div>
            <div class="article-tags">${tags}</div>
          </header>
          <article class="article-body">${html}</article>
          <div class="article-reading-count">
            <span id="busuanzi_container_page_pv">\u9605\u8BFB <span id="busuanzi_value_page_pv">--</span></span>
          </div>
          ${postNav}
          <section class="comments-section" id="comments-section">
            <h3>\u8BC4\u8BBA</h3>
            <div id="giscus-container"></div>
          </section>
        </div>`;

      // Code copy buttons
      document.querySelectorAll('.article-body pre code').forEach(block => {
        hljs.highlightElement(block);
        const pre = block.parentElement;
        pre.style.position = 'relative';
        const btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.textContent = '\u590D\u5236';
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(block.textContent).then(() => {
            btn.textContent = '\u2713 \u5DF2\u590D\u5236';
            setTimeout(() => { btn.textContent = '\u590D\u5236'; }, 1500);
          });
        });
        pre.appendChild(btn);
      });

      // Image lightbox
      document.querySelectorAll('.article-body img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => openLightbox(img.src));
      });

      loadGiscus(post.slug);
    } catch (e) {
      contentEl().innerHTML = `<div class="view-container"><div class="article-header"><h1 class="article-title">\u52A0\u8F7D\u5931\u8D25</h1><p>${e.message}</p></div></div>`;
    }
  }

  /* ── Lightbox ── */
  function openLightbox(src) {
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `<img src="${src}" class="lightbox-img">`;
    overlay.addEventListener('click', () => {
      overlay.classList.add('closing');
      setTimeout(() => overlay.remove(), 250);
    });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { overlay.click(); document.removeEventListener('keydown', esc); }
    });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));
  }

  /* ── Archives ── */
  function renderArchives() {
    document.title = `\u5F52\u6863 | ${SITE.title}`;
    const byYear = {};
    postsData.forEach(p => {
      const y = p.date.split('-')[0];
      (byYear[y] = byYear[y] || []).push(p);
    });

    let html = '<div class="view-container"><div class="archive-page"><h1>\u5F52\u6863</h1>';
    Object.keys(byYear).sort((a, b) => b - a).forEach(year => {
      html += `<h2 class="archive-year">${year}</h2><ul class="archive-list">`;
      byYear[year].forEach(p => {
        html += `<li class="archive-item scroll-reveal"><span class="archive-item-date">${p.date}</span><a class="archive-item-title" href="#/post/${encodeURIComponent(p.slug)}">${p.title}</a></li>`;
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
    postsData.forEach(p => { p.tags.forEach(t => { (tagMap[t] = tagMap[t] || []).push(p); }); });

    const tagNames = Object.keys(tagMap).sort();
    let chips = '<div class="tags-cloud">';
    tagNames.forEach(t => { chips += `<span class="tag-chip" data-tag="${t}">${t}<span class="tag-count">(${tagMap[t].length})</span></span>`; });
    chips += '</div>';

    let lists = '';
    tagNames.forEach(t => {
      lists += `<div class="tag-posts" data-tag="${t}"><h2 class="archive-year">${t}</h2><ul class="archive-list">`;
      tagMap[t].forEach(p => { lists += `<li class="archive-item"><span class="archive-item-date">${p.date}</span><a class="archive-item-title" href="#/post/${encodeURIComponent(p.slug)}">${p.title}</a></li>`; });
      lists += '</ul></div>';
    });

    contentEl().innerHTML = `<div class="view-container"><div class="tags-page"><h1>\u6807\u7B7E</h1>${chips}${lists}</div></div>`;

    document.querySelectorAll('.tag-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        const isActive = chip.classList.contains('active');
        document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.tag-posts').forEach(el => el.style.display = '');
        if (!isActive) {
          chip.classList.add('active');
          document.querySelectorAll('.tag-posts').forEach(el => { el.style.display = el.dataset.tag === tag ? '' : 'none'; });
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
          <h1>\u5173\u4E8E</h1>
          <div class="about-content">
            <p>\u4F60\u597D\uFF01\u6211\u662F <strong>${SITE.nickname}</strong>\uFF0C\u4E00\u540D\u673A\u5668\u4EBA\u5DE5\u7A0B\u5927\u5B66\u751F\u3002</p>
            <p>\u8FD9\u4E2A\u535A\u5BA2\u7528\u6765\u8BB0\u5F55\u6211\u7684\u5B66\u4E60\u7B14\u8BB0\u3001\u6280\u672F\u63A2\u7D22\u548C\u9879\u76EE\u7ECF\u5386\u3002\u5E0C\u671B\u8FD9\u4E9B\u5185\u5BB9\u5BF9\u4F60\u4E5F\u6709\u6240\u5E2E\u52A9\u3002</p>

            <h2>\u6280\u672F\u6808</h2>
            <div class="about-skills">
              <span class="about-skill">\uD83E\uDD16 ROS2</span>
              <span class="about-skill">\uD83D\uDD27 STM32 / \u5D4C\u5165\u5F0F</span>
              <span class="about-skill">\uD83D\uDC0D Python</span>
              <span class="about-skill">\u2699\uFE0F C/C++</span>
              <span class="about-skill">\uD83C\uDF10 HTML/CSS/JS</span>
              <span class="about-skill">\uD83D\uDCE6 Git</span>
              <span class="about-skill">\uD83D\uDC27 Linux</span>
              <span class="about-skill">\uD83D\uDCC8 MATLAB</span>
            </div>

            <h2>\u5173\u6CE8\u65B9\u5411</h2>
            <ul>
              <li>\u673A\u5668\u4EBA\u6280\u672F\uFF1ASLAM\u3001\u8FD0\u52A8\u5B66\u3001\u63A7\u5236\u7B97\u6CD5</li>
              <li>\u5D4C\u5165\u5F0F\u5F00\u53D1\uFF1ASTM32\u3001\u4E32\u53E3\u901A\u4FE1\u3001PID \u63A7\u5236</li>
              <li>Web \u524D\u7AEF\uFF1A\u6027\u80FD\u4F18\u5316\u3001\u52A8\u753B\u3001\u5DE5\u7A0B\u5316</li>
            </ul>

            <h2>\u8054\u7CFB</h2>
            <p>
              <a href="https://github.com/chung-manhin" target="_blank" rel="noopener">GitHub</a>
              <span style="margin: 0 0.5rem; opacity: 0.3">|</span>
              \u6587\u7AE0\u4E0B\u65B9\u7559\u8A00\u4EA4\u6D41
            </p>
          </div>
        </div>
      </div>`;
  }

  /* ── Editor ── */
  function renderEditor() {
    document.title = `\u7F16\u8F91\u5668 | ${SITE.title}`;
    if (window.BlogEditor) { window.BlogEditor.render(contentEl()); }
    else { contentEl().innerHTML = '<div class="view-container"><p style="padding:3rem;text-align:center">\u7F16\u8F91\u5668\u6A21\u5757\u52A0\u8F7D\u4E2D\u2026</p></div>'; }
  }

  /* ── Dark Mode ── */
  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    const mobileBtn = document.getElementById('mobile-theme-toggle');
    const mobileIcon = document.getElementById('mobile-theme-icon');
    if (!btn) return;

    function applyTheme(dark) {
      document.body.classList.toggle('dark-theme', dark);
      document.documentElement.classList.toggle('dark-theme', dark);
      const sym = dark ? '\u2609' : '\u263E';
      icon.textContent = sym;
      if (mobileIcon) mobileIcon.textContent = sym;
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    }

    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved ? saved === 'dark' : prefersDark);

    btn.addEventListener('click', () => {
      applyTheme(!document.body.classList.contains('dark-theme'));
    });

    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        applyTheme(!document.body.classList.contains('dark-theme'));
      });
    }
  }

  /* ── Scroll Reveal ── */
  let observer;

  function initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
        } else {
          entry.target.classList.remove('revealed');
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  }

  function reobserve() {
    if (!observer) return;
    setTimeout(() => {
      document.querySelectorAll('.scroll-reveal:not(.revealed)').forEach(el => observer.observe(el));
    }, 30);
  }

  /* ── Giscus ── */
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

  window.BlogApp = { postsData: () => postsData, reloadPosts: loadPosts, SITE };
})();
