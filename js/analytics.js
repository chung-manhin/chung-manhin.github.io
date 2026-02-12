/**
 * analytics.js - 简单的访问统计系统（基于浏览器指纹去重）
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'blog_visitor_id';
  const LAST_VISIT_KEY = 'blog_last_visit';
  const STATS_KEY = 'blog_stats';
  const DEDUPE_HOURS = 24; // 24小时内去重

  const Analytics = {
    async init() {
      try {
        // 生成或获取访客ID
        const visitorId = this.getOrCreateVisitorId();

        // 检查是否需要计数
        if (this.shouldCount(visitorId)) {
          await this.recordVisit(visitorId);
        }

        // 显示统计数据
        await this.displayStats();
      } catch (err) {
        console.error('Analytics error:', err);
        // 失败时显示默认值
        this.displayDefaultStats();
      }
    },

    // 生成浏览器指纹
    generateFingerprint() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint', 2, 2);

      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|');

      // 简单哈希
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    },

    getOrCreateVisitorId() {
      let visitorId = localStorage.getItem(STORAGE_KEY);
      if (!visitorId) {
        visitorId = this.generateFingerprint();
        localStorage.setItem(STORAGE_KEY, visitorId);
      }
      return visitorId;
    },

    shouldCount(visitorId) {
      const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
      if (!lastVisit) return true;

      const lastVisitData = JSON.parse(lastVisit);
      const hoursSinceLastVisit = (Date.now() - lastVisitData.timestamp) / (1000 * 60 * 60);

      // 如果是同一个访客且在去重时间内，不计数
      if (lastVisitData.visitorId === visitorId && hoursSinceLastVisit < DEDUPE_HOURS) {
        return false;
      }

      return true;
    },

    async recordVisit(visitorId) {
      // 记录本次访问
      localStorage.setItem(LAST_VISIT_KEY, JSON.stringify({
        visitorId,
        timestamp: Date.now()
      }));

      // 获取当前统计数据
      let stats = this.getLocalStats();

      // 更新统计
      stats.pv += 1; // 总访问量

      // 检查是否是新的独立访客
      if (!stats.visitors.includes(visitorId)) {
        stats.visitors.push(visitorId);
        stats.uv += 1;
      }

      // 保存到 localStorage
      this.saveLocalStats(stats);

      // 尝试同步到 GitHub（可选，避免阻塞）
      this.syncToGitHub(stats).catch(() => {
        // 同步失败不影响本地统计
      });
    },

    getLocalStats() {
      const stored = localStorage.getItem(STATS_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          // 解析失败，返回默认值
        }
      }

      return {
        pv: 0,
        uv: 0,
        visitors: [],
        lastUpdate: Date.now()
      };
    },

    saveLocalStats(stats) {
      stats.lastUpdate = Date.now();
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    },

    async syncToGitHub(stats) {
      // 这里可以实现同步到 GitHub Gist 或 Issues
      // 为了简单起见，暂时只使用本地存储
      // 如果需要跨设备统计，可以使用 GitHub API
      return Promise.resolve();
    },

    async displayStats() {
      const stats = this.getLocalStats();

      const container = document.getElementById('busuanzi_container_site_pv');
      if (container) {
        container.innerHTML = `
          <span class="stats-item">
            <span class="stats-icon">👁️</span>
            <span id="site_pv">${stats.pv}</span> 次访问
          </span>
          <span class="stats-sep">•</span>
          <span class="stats-item">
            <span class="stats-icon">👥</span>
            <span id="site_uv">${stats.uv}</span> 位访客
          </span>
        `;
      }
    },

    displayDefaultStats() {
      const container = document.getElementById('busuanzi_container_site_pv');
      if (container) {
        container.innerHTML = `
          <span class="stats-item">
            <span class="stats-icon">👁️</span>
            <span>--</span> 次访问
          </span>
          <span class="stats-sep">•</span>
          <span class="stats-item">
            <span class="stats-icon">👥</span>
            <span>--</span> 位访客
          </span>
        `;
      }
    }
  };

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Analytics.init());
  } else {
    Analytics.init();
  }

  window.BlogAnalytics = Analytics;
})();
