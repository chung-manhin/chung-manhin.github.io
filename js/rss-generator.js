/**
 * rss-generator.js - 动态生成 RSS feed
 * 在编辑器中点击"生成 RSS"按钮时调用
 */
(function () {
  'use strict';

  const RSSGenerator = {
    async generate() {
      try {
        const res = await fetch('/posts.json?' + Date.now());
        const posts = await res.json();
        posts.sort((a, b) => b.date.localeCompare(a.date));

        const baseUrl = 'https://wenxuanzhong.github.io';
        const now = new Date().toUTCString();

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
        xml += '  <channel>\n';
        xml += '    <title>WZ\'s Log</title>\n';
        xml += `    <link>${baseUrl}/</link>\n`;
        xml += '    <description>机器人工程大学生的学习笔记与技术记录。</description>\n';
        xml += '    <language>zh-CN</language>\n';
        xml += `    <lastBuildDate>${now}</lastBuildDate>\n`;
        xml += `    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>\n`;

        // 只包含最近 20 篇文章
        posts.slice(0, 20).forEach(post => {
          const postUrl = `${baseUrl}/#/post/${encodeURIComponent(post.slug)}`;
          const pubDate = new Date(post.date + 'T00:00:00').toUTCString();

          xml += '    <item>\n';
          xml += `      <title>${this.escapeXml(post.title)}</title>\n`;
          xml += `      <link>${postUrl}</link>\n`;
          xml += `      <guid>${postUrl}</guid>\n`;
          xml += `      <pubDate>${pubDate}</pubDate>\n`;
          xml += `      <description>${this.escapeXml(post.excerpt)}</description>\n`;
          xml += `      <category>${this.escapeXml(post.category)}</category>\n`;
          post.tags.forEach(tag => {
            xml += `      <category>${this.escapeXml(tag)}</category>\n`;
          });
          xml += '    </item>\n';
        });

        xml += '  </channel>\n';
        xml += '</rss>';

        return xml;
      } catch (err) {
        console.error('Failed to generate RSS:', err);
        throw err;
      }
    },

    escapeXml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },

    async save(token) {
      const xml = await this.generate();
      const owner = 'WenxuanZhong';
      const repo = 'WenxuanZhong.github.io';

      // 获取当前 rss.xml 的 SHA（如果存在）
      let sha = null;
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/rss.xml`, {
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
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/rss.xml`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update rss.xml',
          content: btoa(unescape(encodeURIComponent(xml))),
          sha: sha
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save rss.xml');
      }

      return xml;
    }
  };

  window.RSSGenerator = RSSGenerator;
})();
