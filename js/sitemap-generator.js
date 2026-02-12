/**
 * sitemap-generator.js - 动态生成 sitemap.xml
 * 在编辑器中点击"生成 Sitemap"按钮时调用
 */
(function () {
  'use strict';

  const SitemapGenerator = {
    async generate() {
      try {
        const res = await fetch('/posts.json?' + Date.now());
        const posts = await res.json();

        const baseUrl = 'https://wenxuanzhong.github.io';
        const now = new Date().toISOString().split('T')[0];

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

        // 首页
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += '    <changefreq>daily</changefreq>\n';
        xml += '    <priority>1.0</priority>\n';
        xml += '  </url>\n';

        // 归档页
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/#/archives</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';

        // 标签页
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/#/tags</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';

        // 关于页
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/#/about</loc>\n`;
        xml += `    <lastmod>${now}</lastmod>\n`;
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += '    <priority>0.7</priority>\n';
        xml += '  </url>\n';

        // 所有文章
        posts.forEach(post => {
          xml += '  <url>\n';
          xml += `    <loc>${baseUrl}/#/post/${encodeURIComponent(post.slug)}</loc>\n`;
          xml += `    <lastmod>${post.date}</lastmod>\n`;
          xml += '    <changefreq>monthly</changefreq>\n';
          xml += '    <priority>0.9</priority>\n';
          xml += '  </url>\n';
        });

        xml += '</urlset>';

        return xml;
      } catch (err) {
        console.error('Failed to generate sitemap:', err);
        throw err;
      }
    },

    async save(token) {
      const xml = await this.generate();
      const owner = 'WenxuanZhong';
      const repo = 'WenxuanZhong.github.io';

      // 获取当前 sitemap.xml 的 SHA（如果存在）
      let sha = null;
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/sitemap.xml`, {
          headers: { 'Authorization': `token ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          sha = data.sha;
        }
      } catch (e) {
        // 文件不存在，首次创建
      }

      // 上传到 GitHub
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/sitemap.xml`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update sitemap.xml',
          content: btoa(unescape(encodeURIComponent(xml))),
          sha: sha
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save sitemap.xml');
      }

      return xml;
    }
  };

  window.SitemapGenerator = SitemapGenerator;
})();
