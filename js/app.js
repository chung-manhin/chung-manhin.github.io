/**
 * app.js — SPA core: router, rendering, dark mode, animations, comments, stats
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
    // Giscus config — update these after enabling GitHub Discussions
    giscus: {
      repo: 'chung-manhin/chung-manhin.github.io',
      repoId: '',      // fill in after enabling Discussions
      category: 'Announcements',
      categoryId: '',   // fill in after enabling Discussions
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
    // Init search after loading
    if (window.BlogSearch) window.BlogSearch.init(postsData);
  }

  /* ── Router ── */
  function onRoute() {
    const hash = location.hash || '#/';
    const parts = hash.replace('#/', '').split('/');
    const route = parts[0] || '';

    // Update active nav links
    document.querySelectorAll('.nav-links a, .mobile-tab-bar a').forEach(a => {
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

  /* ── Home ── */
  function renderHome() {
    document.title = SITE.title;
    let cards = '';
    postsData.forEach((post, i) => {
      const tags = post.tags.map(t => `<span class="tag">${t}</span>`).join('');
      cards += `
        <div class="post-card scroll-reveal" onclick="location.hash='#/post/${encodeURIComponent(post.slug)}'" style="animation-delay: ${i * 0.08}s">
          <div class="post-card-date">${post.date}</div>
          <div class="post-card-title">${post.title}</div>
          <div class="post-card-excerpt">${post.excerpt}</div>
          <div class="post-card-footer">
            <div class="post-card-tags">${tags}</div>
            <span class="post-card-arrow">&rarr;</span>
          </div>
        </div>`;
    });

    contentEl().innerHTML = `
      <div class="view-container">
        <section class="hero">
          <img class="hero-avatar" src="${SITE.avatar}" alt="${SITE.nickname} avatar" width="110" height="110">
          <h1>${SITE.nickname}</h1>
          <p class="subtitle">${SITE.subtitle}</p>
          <p class="hero-desc">${SITE.description}</p>
        </section>
        <section class="posts-section">
          <h2 class="section-title">最新文章</h2>
          <div class="posts-grid">${cards || '<p style="color:var(--color-text-secondary)">暂无文章</p>'}</div>
        </section>
      </div>`;
    reobserve();
  }

  /* ── Post ── */
  async function renderPost(slug) {
    const post = postsData.find(p => p.slug === slug);
    if (!post) {
      contentEl().innerHTML = '<div class="view-container"><div class="article-header"><h1 class="article-title">文章未找到</h1></div></div>';
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
          <div class="article-back"><a href="#/">&larr; 返回首页</a></div>
          <header class="article-header">
            <div class="article-category">${post.category}</div>
            <h1 class="article-title">${post.title}</h1>
            <div class="article-meta">
              <span>${post.date}</span>
              <span>${SITE.author}</span>
            </div>
            <div class="article-tags">${tags}</div>
            <div class="article-divider"></div>
          </header>
          <article class="article-body">${html}</article>
          <div class="article-reading-count">
            <span id="busuanzi_container_page_pv">阅读量: <span id="busuanzi_value_page_pv">--</span></span>
          </div>
          <section class="comments-section" id="comments-section">
            <h3>评论</h3>
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
      contentEl().innerHTML = `<div class="view-container"><div class="article-header"><h1 class="article-title">加载失败</h1><p>${e.message}</p></div></div>`;
    }
  }

  /* ── Archives ── */
  function renderArchives() {
    document.title = `归档 | ${SITE.title}`;
    const byYear = {};
    postsData.forEach(p => {
      const y = p.date.split('-')[0];
      (byYear[y] = byYear[y] || []).push(p);
    });

    let html = '<div class="view-container"><div class="archive-page"><h1>归档</h1>';
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
    document.title = `标签 | ${SITE.title}`;
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

    contentEl().innerHTML = `<div class="view-container"><div class="tags-page"><h1>标签</h1>${chips}${lists}</div></div>`;

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
    document.title = `关于 | ${SITE.title}`;
    contentEl().innerHTML = `
      <div class="view-container">
        <div class="about-page">
          <h1>关于我</h1>
          <div class="about-content">
            <p>你好！我是 <strong>${SITE.nickname}</strong>，一名机器人工程大学生。</p>
            <p>这个博客用来记录我的学习笔记、技术探索和项目经历。希望这些内容对你也有所帮助。</p>
            <p>目前关注的方向：机器人技术、嵌入式开发、Web 前端。</p>
            <p>如果你有任何问题或想法，欢迎在文章下方留言交流。</p>
          </div>
        </div>
      </div>`;
  }

  /* ── Editor (delegates to editor.js) ── */
  function renderEditor() {
    document.title = `编辑器 | ${SITE.title}`;
    if (window.BlogEditor) {
      window.BlogEditor.render(contentEl());
    } else {
      contentEl().innerHTML = '<div class="view-container"><p style="padding:3rem;text-align:center">编辑器模块加载中…</p></div>';
    }
  }

  /* ── Dark Mode ── */
  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    if (!btn) return;

    function applyTheme(dark) {
      document.body.classList.toggle('dark-theme', dark);
      icon.textContent = dark ? '☀️' : '🌙';
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    }

    // Initial state
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
