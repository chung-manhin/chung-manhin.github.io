/**
 * editor-v2.js — 改进的博客编辑器，支持增删改查
 */
(function () {
  'use strict';

  const OWNER = 'WenxuanZhong';
  const REPO = 'WenxuanZhong.github.io';
  const BRANCH = 'master';

  // UTF-8 安全的 base64 解码
  function base64DecodeUnicode(str) {
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }

  // UTF-8 安全的 base64 编码
  function base64EncodeUnicode(str) {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary);
  }

  const BlogEditor = {
    currentMode: 'list', // 'list' | 'edit' | 'new'
    currentPost: null,
    allPosts: [],

    async render(container) {
      const token = localStorage.getItem('gh_token');

      if (!token) {
        this._renderTokenSetup(container);
        return;
      }

      if (this.currentMode === 'list') {
        await this._renderPostList(container);
      } else if (this.currentMode === 'edit' || this.currentMode === 'new') {
        this._renderEditor(container);
      }
    },

    _renderTokenSetup(container) {
      container.innerHTML = `
        <div class="view-container">
          <div class="token-setup">
            <h2>设置 GitHub Token</h2>
            <p>需要 GitHub Personal Access Token (PAT) 来管理文章。<br>
            Token 仅保存在浏览器中，不会上传到任何服务器。<br>
            需要 <code>repo</code> 权限。</p>
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
    },

    async _renderPostList(container) {
      const token = localStorage.getItem('gh_token');

      container.innerHTML = `
        <div class="view-container">
          <div class="editor-page">
            <div class="editor-top-bar">
              <h2 style="margin: 0; font-size: 1.2rem;">博客管理</h2>
              <div class="editor-actions">
                <button class="btn btn-secondary" id="editor-logout">退出</button>
                <button class="btn btn-primary" id="editor-new-post">✏️ 写新文章</button>
              </div>
            </div>
            <div class="posts-filter-bar">
              <input type="text" id="posts-search" class="posts-search-input" placeholder="🔍 搜索文章标题...">
              <select id="posts-sort" class="posts-sort-select">
                <option value="date-desc">日期 ↓</option>
                <option value="date-asc">日期 ↑</option>
                <option value="title-asc">标题 A-Z</option>
                <option value="title-desc">标题 Z-A</option>
              </select>
            </div>
            <div id="posts-list-container" class="posts-list">
              <div class="loading-spinner"></div>
            </div>
            <div id="editor-status" class="editor-status"></div>
          </div>
        </div>`;

      document.getElementById('editor-logout').addEventListener('click', () => {
        localStorage.removeItem('gh_token');
        this.render(container);
      });

      document.getElementById('editor-new-post').addEventListener('click', () => {
        this.currentMode = 'new';
        this.currentPost = null;
        this.render(container);
      });

      // 搜索功能
      document.getElementById('posts-search').addEventListener('input', (e) => {
        this._filterAndRenderPosts(e.target.value, document.getElementById('posts-sort').value);
      });

      // 排序功能
      document.getElementById('posts-sort').addEventListener('change', (e) => {
        this._filterAndRenderPosts(document.getElementById('posts-search').value, e.target.value);
      });

      try {
        await this._loadPosts(token);
        this._filterAndRenderPosts('', 'date-desc');
      } catch (err) {
        this._setStatus('error', '加载文章列表失败: ' + err.message);
      }
    },

    _filterAndRenderPosts(searchTerm, sortBy) {
      let filtered = this.allPosts;

      // 搜索过滤
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(p =>
          p.title.toLowerCase().includes(term) ||
          p.category.toLowerCase().includes(term) ||
          p.tags.some(t => t.toLowerCase().includes(term))
        );
      }

      // 排序
      filtered = [...filtered];
      if (sortBy === 'date-desc') {
        filtered.sort((a, b) => b.date.localeCompare(a.date));
      } else if (sortBy === 'date-asc') {
        filtered.sort((a, b) => a.date.localeCompare(b.date));
      } else if (sortBy === 'title-asc') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sortBy === 'title-desc') {
        filtered.sort((a, b) => b.title.localeCompare(a.title));
      }

      this._renderPostsTable(filtered);
    },

    async _loadPosts(token) {
      const res = await this._githubGet('posts.json', token);
      if (res) {
        const content = base64DecodeUnicode(res.content.replace(/\n/g, ''));
        this.allPosts = JSON.parse(content);
      } else {
        this.allPosts = [];
      }
    },

    _renderPostsTable(posts = this.allPosts) {
      const container = document.getElementById('posts-list-container');
      if (posts.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">没有找到文章</p>';
        return;
      }

      const html = `
        <table class="posts-table">
          <thead>
            <tr>
              <th>标题</th>
              <th>日期</th>
              <th>分类</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${posts.map((post) => {
              const idx = this.allPosts.findIndex(p => p.slug === post.slug);
              return `
              <tr>
                <td class="post-title">${this._escapeHtml(post.title)}</td>
                <td>${post.date}</td>
                <td>${this._escapeHtml(post.category)}</td>
                <td class="post-actions">
                  <button class="btn-small btn-edit" data-idx="${idx}">编辑</button>
                  <button class="btn-small btn-delete" data-idx="${idx}">删除</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`;

      container.innerHTML = html;

      // 绑定编辑按钮
      container.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', async () => {
          const idx = parseInt(btn.dataset.idx);
          await this._editPost(idx);
        });
      });

      // 绑定删除按钮
      container.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          const idx = parseInt(btn.dataset.idx);
          await this._deletePost(idx);
        });
      });
    },

    async _editPost(idx) {
      const post = this.allPosts[idx];
      const token = localStorage.getItem('gh_token');

      try {
        this._setStatus('loading', '加载文章内容...');
        const res = await this._githubGet(`posts/${post.slug}.md`, token);
        if (res) {
          const content = base64DecodeUnicode(res.content.replace(/\n/g, ''));
          this.currentPost = { ...post, content, idx };
          this.currentMode = 'edit';
          this.render(document.getElementById('app-content'));
        }
      } catch (err) {
        this._setStatus('error', '加载失败: ' + err.message);
      }
    },

    async _deletePost(idx) {
      if (!confirm('确定要删除这篇文章吗？')) return;

      const post = this.allPosts[idx];
      const token = localStorage.getItem('gh_token');

      try {
        this._setStatus('loading', '删除中...');

        // 1. 删除 markdown 文件
        const mdRes = await this._githubGet(`posts/${post.slug}.md`, token);
        if (mdRes) {
          await this._githubDelete(`posts/${post.slug}.md`, mdRes.sha, `Delete post: ${post.title}`, token);
        }

        // 2. 重新加载最新的 posts.json（关键：避免 SHA 冲突）
        const postsJsonRes = await this._githubGet('posts.json', token);
        let latestPosts = [];
        if (postsJsonRes) {
          const postsContent = base64DecodeUnicode(postsJsonRes.content.replace(/\n/g, ''));
          latestPosts = JSON.parse(postsContent);
        }

        // 3. 从列表中移除该文章
        latestPosts = latestPosts.filter(p => p.slug !== post.slug);

        // 4. 保存 posts.json（使用最新的 SHA）
        const postsJsonSha = postsJsonRes ? postsJsonRes.sha : undefined;
        const postsContent = JSON.stringify(latestPosts, null, 2);
        await this._githubPut('posts.json', postsContent, `Update posts.json: delete ${post.title}`, token, postsJsonSha);

        // 5. 更新本地缓存
        this.allPosts = latestPosts;

        this._setStatus('success', '删除成功！');
        setTimeout(() => {
          this.currentMode = 'list';
          this.render(document.getElementById('app-content'));
        }, 1000);
      } catch (err) {
        this._setStatus('error', '删除失败: ' + err.message);
      }
    },

    _renderEditor(container) {
      const isNew = this.currentMode === 'new';
      const post = this.currentPost || {};

      // 尝试从 localStorage 恢复草稿
      const draftKey = `draft_${post.slug || 'new'}`;
      const draft = localStorage.getItem(draftKey);
      const content = draft || post.content || '';

      container.innerHTML = `
        <div class="view-container">
          <div class="editor-page">
            <div class="editor-top-bar">
              <input type="text" class="editor-title-input" id="editor-title"
                placeholder="文章标题" value="${this._escapeHtml(post.title || '')}">
              <input type="text" class="editor-category-input" id="editor-category"
                placeholder="分类" value="${this._escapeHtml(post.category || '技术')}">
              <input type="text" class="editor-tags-input" id="editor-tags"
                placeholder="标签 (逗号分隔)" value="${(post.tags || []).join(', ')}">
              <div class="editor-view-toggle" id="editor-view-toggle">
                <button class="active" data-view="edit">编辑</button>
                <button data-view="split">分屏</button>
                <button data-view="preview">预览</button>
              </div>
              <div class="editor-actions">
                <button class="btn btn-secondary" id="editor-back">返回</button>
                <button class="btn btn-primary" id="editor-save">💾 保存</button>
              </div>
            </div>
            <div class="editor-body">
              <div class="editor-pane" id="editor-pane">
                <textarea class="editor-textarea" id="editor-content"
                  placeholder="在这里写 Markdown 内容...支持粘贴图片 (Ctrl+V) 和拖拽上传">${this._escapeHtml(content)}</textarea>
              </div>
              <div class="preview-pane" id="preview-pane" style="display:none;">
                <div class="preview-content" id="preview-content"></div>
              </div>
            </div>
            <div id="editor-status" class="editor-status"></div>
            <div class="draft-indicator" id="draft-indicator" style="display:none;">
              <span>📝 草稿已自动保存</span>
            </div>
            <div class="word-count" id="word-count">
              <span id="word-count-text">0 字</span>
            </div>
          </div>
          <div class="editor-mobile-toolbar" id="editor-toolbar">
            <button data-insert="**" data-wrap="true">B</button>
            <button data-insert="*" data-wrap="true">I</button>
            <button data-insert="## ">H2</button>
            <button data-insert="### ">H3</button>
            <button data-insert="[](url)">链接</button>
            <button id="image-upload-btn">📷 图片</button>
            <button data-insert="\`\`\`\n\n\`\`\`" data-cursor="-4">代码</button>
            <button data-insert="- ">列表</button>
          </div>
          <input type="file" id="image-file-input" accept="image/*" style="display:none" multiple>
        </div>`;

      this._bindEditorEvents();
    },

    _bindEditorEvents() {
      const textarea = document.getElementById('editor-content');
      const preview = document.getElementById('preview-content');
      const editorPane = document.getElementById('editor-pane');
      const previewPane = document.getElementById('preview-pane');
      const draftIndicator = document.getElementById('draft-indicator');
      const wordCountText = document.getElementById('word-count-text');

      let autoSaveTimer = null;
      let currentView = 'edit';

      // 草稿键
      const post = this.currentPost || {};
      const draftKey = `draft_${post.slug || 'new'}`;

      // 更新字数统计
      const updateWordCount = () => {
        const text = textarea.value;
        const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
        const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
        const total = chineseChars + englishWords;
        wordCountText.textContent = `${total} 字`;
      };

      // 实时预览
      const updatePreview = () => {
        if (currentView === 'edit') return;
        const md = textarea.value;
        preview.innerHTML = marked.parse(md);
        preview.querySelectorAll('pre code').forEach(block => {
          if (window.hljs) hljs.highlightElement(block);
        });
      };

      // 自动保存草稿
      const saveDraft = () => {
        localStorage.setItem(draftKey, textarea.value);
        if (draftIndicator) {
          draftIndicator.style.display = 'block';
          setTimeout(() => {
            draftIndicator.style.display = 'none';
          }, 2000);
        }
      };

      // 输入时触发预览和自动保存
      textarea.addEventListener('input', () => {
        updatePreview();
        updateWordCount();

        // 防抖自动保存
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(saveDraft, 1000);
      });

      // 初始化字数统计
      updateWordCount();

      // 视图切换
      const viewToggle = document.getElementById('editor-view-toggle');
      if (viewToggle) {
        viewToggle.querySelectorAll('button').forEach(btn => {
          btn.addEventListener('click', () => {
            currentView = btn.dataset.view;
            viewToggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (currentView === 'edit') {
              editorPane.style.display = '';
              previewPane.style.display = 'none';
              editorPane.style.width = '';
              editorPane.style.flex = '1';
            } else if (currentView === 'preview') {
              editorPane.style.display = 'none';
              previewPane.style.display = '';
              previewPane.style.width = '';
              previewPane.style.flex = '1';
              updatePreview();
            } else if (currentView === 'split') {
              editorPane.style.display = '';
              previewPane.style.display = '';
              editorPane.style.width = '50%';
              previewPane.style.width = '50%';
              editorPane.style.flex = '';
              previewPane.style.flex = '';
              updatePreview();
            }
          });
        });
      }

      // 快捷键支持
      textarea.addEventListener('keydown', (e) => {
        // Ctrl+S 保存
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          this._savePost();
          return;
        }

        // Ctrl+B 加粗
        if (e.ctrlKey && e.key === 'b') {
          e.preventDefault();
          this._wrapText(textarea, '**');
          return;
        }

        // Ctrl+I 斜体
        if (e.ctrlKey && e.key === 'i') {
          e.preventDefault();
          this._wrapText(textarea, '*');
          return;
        }
      });

      // 粘贴图片上传
      textarea.addEventListener('paste', async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageFiles = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            e.preventDefault();
            const file = items[i].getAsFile();
            if (file) imageFiles.push(file);
          }
        }

        if (imageFiles.length > 0) {
          await this._uploadMultipleImages(imageFiles, textarea);
        }
      });

      // 拖拽上传图片
      textarea.addEventListener('dragover', (e) => {
        e.preventDefault();
        textarea.style.background = 'var(--code-bg)';
      });

      textarea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        textarea.style.background = '';
      });

      textarea.addEventListener('drop', async (e) => {
        e.preventDefault();
        textarea.style.background = '';

        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
          await this._uploadMultipleImages(files, textarea);
        }
      });

      document.getElementById('editor-back').addEventListener('click', () => {
        if (textarea.value && confirm('有未保存的内容，确定要离开吗？')) {
          localStorage.removeItem(draftKey);
          this.currentMode = 'list';
          this.render(document.getElementById('app-content'));
        } else if (!textarea.value) {
          localStorage.removeItem(draftKey);
          this.currentMode = 'list';
          this.render(document.getElementById('app-content'));
        }
      });

      document.getElementById('editor-save').addEventListener('click', () => {
        this._savePost();
        // 保存成功后清除草稿
        localStorage.removeItem(draftKey);
      });

      // 工具栏按钮
      document.querySelectorAll('#editor-toolbar button').forEach(btn => {
        if (btn.id === 'image-upload-btn') return;

        btn.addEventListener('click', () => {
          const insert = btn.dataset.insert;
          const wrap = btn.dataset.wrap === 'true';
          const cursorOffset = parseInt(btn.dataset.cursor || '0');
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const selected = textarea.value.substring(start, end);

          if (wrap && selected) {
            textarea.setRangeText(insert + selected + insert, start, end, 'end');
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

      // 图片上传按钮
      const imageUploadBtn = document.getElementById('image-upload-btn');
      const imageFileInput = document.getElementById('image-file-input');

      imageUploadBtn.addEventListener('click', () => imageFileInput.click());

      imageFileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;
        await this._uploadMultipleImages(files, textarea);
        imageFileInput.value = '';
      });
    },

    _wrapText(textarea, wrapper) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = textarea.value.substring(start, end);

      if (selected) {
        textarea.setRangeText(wrapper + selected + wrapper, start, end, 'end');
      }
      textarea.focus();
      textarea.dispatchEvent(new Event('input'));
    },

    async _uploadMultipleImages(files, textarea) {
      this._setStatus('loading', `正在上传 ${files.length} 张图片...`);

      try {
        const token = localStorage.getItem('gh_token');
        const uploadedUrls = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          this._setStatus('loading', `上传中 ${i + 1}/${files.length}: ${file.name}`);
          const url = await this._uploadImage(file, token);
          uploadedUrls.push({ name: file.name, url });
        }

        const start = textarea.selectionStart;
        const imageMarkdown = uploadedUrls.map(img =>
          `![${img.name}](${img.url})`
        ).join('\n\n');

        textarea.setRangeText(imageMarkdown, start, start, 'end');
        textarea.focus();
        textarea.dispatchEvent(new Event('input'));

        this._setStatus('success', `成功上传 ${files.length} 张图片！`);
      } catch (err) {
        this._setStatus('error', '上传失败: ' + err.message);
      }
    },

    async _savePost() {
      const token = localStorage.getItem('gh_token');
      const title = document.getElementById('editor-title').value.trim();
      const category = document.getElementById('editor-category').value.trim() || '技术';
      const tags = document.getElementById('editor-tags').value.split(',').map(t => t.trim()).filter(Boolean);
      const content = document.getElementById('editor-content').value;

      if (!title) {
        this._setStatus('error', '请输入文章标题');
        return;
      }
      if (!content) {
        this._setStatus('error', '请输入文章内容');
        return;
      }

      this._setStatus('loading', '保存中...');

      try {
        const isNew = this.currentMode === 'new';
        const today = new Date().toISOString().split('T')[0];
        const slug = isNew ? `${today}-${title}` : this.currentPost.slug;
        const filePath = `posts/${slug}.md`;
        const excerpt = content.replace(/[#*`>\[\]!\-]/g, '').trim().substring(0, 100) + '…';

        // 1. 保存 markdown 文件
        const mdRes = await this._githubGet(filePath, token);
        const mdSha = mdRes ? mdRes.sha : undefined;
        await this._githubPut(filePath, content, `${isNew ? 'Add' : 'Update'} post: ${title}`, token, mdSha);

        // 2. 重新加载最新的 posts.json（关键：避免 SHA 冲突）
        const postsJsonRes = await this._githubGet('posts.json', token);
        let latestPosts = [];
        if (postsJsonRes) {
          const postsContent = base64DecodeUnicode(postsJsonRes.content.replace(/\n/g, ''));
          latestPosts = JSON.parse(postsContent);
        }

        // 3. 更新或添加文章
        const postData = { slug, title, date: isNew ? today : (this.currentPost?.date || today), category, tags, excerpt };

        if (isNew) {
          latestPosts.push(postData);
        } else {
          const idx = latestPosts.findIndex(p => p.slug === slug);
          if (idx >= 0) {
            latestPosts[idx] = postData;
          } else {
            latestPosts.push(postData);
          }
        }

        latestPosts.sort((a, b) => b.date.localeCompare(a.date));

        // 4. 保存 posts.json（使用最新的 SHA）
        const postsJsonSha = postsJsonRes ? postsJsonRes.sha : undefined;
        const postsContent = JSON.stringify(latestPosts, null, 2);
        await this._githubPut('posts.json', postsContent, `Update posts.json: ${isNew ? 'add' : 'update'} ${title}`, token, postsJsonSha);

        // 5. 更新本地缓存
        this.allPosts = latestPosts;

        this._setStatus('success', '保存成功！');
        setTimeout(() => {
          this.currentMode = 'list';
          this.render(document.getElementById('app-content'));
        }, 1000);

      } catch (err) {
        this._setStatus('error', '保存失败: ' + err.message);
      }
    },

    async _uploadImage(file, token) {
      if (!file.type.startsWith('image/')) {
        throw new Error('只能上传图片文件');
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error('图片大小不能超过 5MB');
      }

      const timestamp = Date.now();
      const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const path = `image/${filename}`;

      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const body = {
        message: `Upload image: ${filename}`,
        content: base64,
        branch: BRANCH
      };

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
        throw new Error(err.message || `上传失败: ${res.status}`);
      }

      const result = await res.json();
      return result.content.download_url;
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
        content: base64EncodeUnicode(content),
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
    },

    async _githubDelete(path, sha, message, token) {
      const body = { message, sha, branch: BRANCH };

      const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `GitHub DELETE ${path}: ${res.status}`);
      }
      return res.json();
    },

    _setStatus(type, msg) {
      const el = document.getElementById('editor-status');
      if (!el) return;
      el.className = `editor-status ${type}`;
      el.textContent = msg;
    },

    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  window.BlogEditor = BlogEditor;
})();
