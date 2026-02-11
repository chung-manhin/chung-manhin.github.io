/**
 * editor.js — Online Markdown editor with GitHub API integration
 */
(function () {
  'use strict';

  const OWNER = 'chung-manhin';
  const REPO = 'chung-manhin.github.io';
  const BRANCH = 'master';

  let currentView = 'edit'; // 'edit' | 'preview'

  const BlogEditor = {
    render(container) {
      const token = localStorage.getItem('gh_token');

      if (!token) {
        container.innerHTML = `
          <div class="view-container">
            <div class="token-setup">
              <h2>设置 GitHub Token</h2>
              <p>需要 GitHub Personal Access Token (PAT) 来发布文章。<br>
              Token 仅保存在浏览器 localStorage 中，不会上传到任何服务器。<br>
              需要 <code>repo</code> 权限 (Contents: Read and write)。</p>
              <input type="password" id="token-input" placeholder="ghp_xxxxxxxxxxxx">
              <div><button class="btn btn-primary" id="token-save">保存 Token</button></div>
              <div id="token-status" class="editor-status"></div>
            </div>
          </div>`;

        document.getElementById('token-save').addEventListener('click', () => {
          const val = document.getElementById('token-input').value.trim();
          if (!val) return;
          localStorage.setItem('gh_token', val);
          this.render(container);
        });
        return;
      }

      container.innerHTML = `
        <div class="view-container">
          <div class="editor-page">
            <div class="editor-top-bar">
              <input type="text" class="editor-title-input" id="editor-title" placeholder="文章标题">
              <input type="text" class="editor-tags-input" id="editor-tags" placeholder="标签 (逗号分隔)">
              <input type="text" class="editor-category-input" id="editor-category" placeholder="分类" value="技术">
              <div class="editor-view-toggle" id="editor-view-toggle">
                <button class="active" data-view="edit">编辑</button>
                <button data-view="preview">预览</button>
              </div>
              <div class="editor-actions">
                <button class="btn btn-secondary" id="editor-clear-token">退出</button>
                <button class="btn btn-primary" id="editor-publish">发布</button>
              </div>
            </div>
            <div class="editor-body">
              <div class="editor-pane" id="editor-pane">
                <label>Markdown</label>
                <textarea class="editor-textarea" id="editor-content" placeholder="在这里写 Markdown 内容…"></textarea>
              </div>
              <div class="preview-pane" id="preview-pane">
                <label>预览</label>
                <div class="preview-content" id="preview-content"></div>
              </div>
            </div>
            <div id="editor-status" class="editor-status"></div>
          </div>
          <div class="editor-mobile-toolbar" id="editor-toolbar">
            <button data-insert="**" data-wrap="true">B</button>
            <button data-insert="*" data-wrap="true">I</button>
            <button data-insert="## ">H2</button>
            <button data-insert="### ">H3</button>
            <button data-insert="[](url)">链接</button>
            <button data-insert="![](url)">图片</button>
            <button data-insert="\`\`\`\n\n\`\`\`" data-cursor="-4">代码</button>
            <button data-insert="- ">列表</button>
          </div>
        </div>`;

      this._bindEvents();
    },

    _bindEvents() {
      const textarea = document.getElementById('editor-content');
      const preview = document.getElementById('preview-content');

      // Live preview
      textarea.addEventListener('input', () => {
        const md = textarea.value;
        preview.innerHTML = marked.parse(md);
        preview.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
      });

      // Publish
      document.getElementById('editor-publish').addEventListener('click', () => this._publish());

      // Clear token
      document.getElementById('editor-clear-token').addEventListener('click', () => {
        localStorage.removeItem('gh_token');
        this.render(document.getElementById('app-content'));
      });

      // Mobile view toggle
      const toggle = document.getElementById('editor-view-toggle');
      if (toggle) {
        toggle.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', () => {
            currentView = btn.dataset.view;
            toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const editorPane = document.getElementById('editor-pane');
            const previewPane = document.getElementById('preview-pane');
            if (window.innerWidth <= 768) {
              editorPane.classList.toggle('hidden-mobile', currentView !== 'edit');
              previewPane.classList.toggle('hidden-mobile', currentView !== 'preview');
            }
          });
        });
      }

      // Mobile toolbar shortcuts
      document.querySelectorAll('#editor-toolbar button').forEach(btn => {
        btn.addEventListener('click', () => {
          const insert = btn.dataset.insert;
          const wrap = btn.dataset.wrap === 'true';
          const cursorOffset = parseInt(btn.dataset.cursor || '0');
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const selected = textarea.value.substring(start, end);

          if (wrap && selected) {
            const newText = insert + selected + insert;
            textarea.setRangeText(newText, start, end, 'end');
          } else {
            textarea.setRangeText(insert, start, end, 'end');
            if (cursorOffset) {
              textarea.selectionStart = textarea.selectionEnd = textarea.selectionEnd + cursorOffset;
            }
          }
          textarea.focus();
          textarea.dispatchEvent(new Event('input'));
        });
      });
    },

    _setStatus(type, msg) {
      const el = document.getElementById('editor-status');
      if (!el) return;
      el.className = `editor-status ${type}`;
      el.textContent = msg;
    },

    async _publish() {
      const token = localStorage.getItem('gh_token');
      const title = document.getElementById('editor-title').value.trim();
      const tags = document.getElementById('editor-tags').value.split(',').map(t => t.trim()).filter(Boolean);
      const category = document.getElementById('editor-category').value.trim() || '技术';
      const content = document.getElementById('editor-content').value;

      if (!title) {
        this._setStatus('error', '请输入文章标题');
        return;
      }
      if (!content) {
        this._setStatus('error', '请输入文章内容');
        return;
      }

      this._setStatus('loading', '正在发布…');

      const today = new Date().toISOString().split('T')[0];
      const slug = `${today}-${title}`;
      const filePath = `posts/${slug}.md`;
      const excerpt = content.replace(/[#*`>\[\]!\-]/g, '').trim().substring(0, 100) + '…';

      try {
        // 1. Upload the markdown file
        await this._githubPut(filePath, content, `Add post: ${title}`, token);

        // 2. Update posts.json
        const postsJsonRes = await this._githubGet('posts.json', token);
        let postsArr = [];
        if (postsJsonRes) {
          postsArr = JSON.parse(atob(postsJsonRes.content.replace(/\n/g, '')));
        }
        postsArr.push({ slug, title, date: today, category, tags, excerpt });
        postsArr.sort((a, b) => b.date.localeCompare(a.date));

        const postsJsonSha = postsJsonRes ? postsJsonRes.sha : undefined;
        await this._githubPut('posts.json', JSON.stringify(postsArr, null, 2) + '\n', `Update posts.json: add ${title}`, token, postsJsonSha);

        this._setStatus('success', '发布成功！页面将在几秒后刷新。');

        // Reload posts
        setTimeout(async () => {
          if (window.BlogApp) await window.BlogApp.reloadPosts();
          location.hash = '#/post/' + encodeURIComponent(slug);
        }, 1500);

      } catch (e) {
        this._setStatus('error', '发布失败: ' + e.message);
      }
    },

    async _githubGet(path, token) {
      const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub GET ${path}: ${res.status}`);
      return res.json();
    },

    async _githubPut(path, content, message, token, sha) {
      const body = {
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: BRANCH
      };
      if (sha) body.sha = sha;

      const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `GitHub PUT ${path}: ${res.status}`);
      }
      return res.json();
    }
  };

  window.BlogEditor = BlogEditor;
})();
