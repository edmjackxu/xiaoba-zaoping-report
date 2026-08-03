/**
 * 小八早评 - 共享渲染引擎
 * 
 * 功能：
 * - loadData(url): 拉取 JSON 数据
 * - renderStats(data): 渲染统计卡片
 * - renderItemList(items, containerId): 渲染内容列表
 * - renderDoubaoReply(item): 渲染豆包回复卡片
 * - filterByType(type): 按类型筛选
 */

(function () {
  'use strict';

  // ========== 数据加载 ==========

  /**
   * 加载 JSON 数据（带缓存破坏参数）
   * @param {string} url - JSON 文件 URL
   * @returns {Promise<object>}
   */
  async function loadData(url) {
    const cacheBuster = '?t=' + Date.now();
    const resp = await fetch(url + cacheBuster);
    if (!resp.ok) {
      throw new Error('加载数据失败: ' + resp.status + ' ' + resp.statusText);
    }
    return resp.json();
  }

  // ========== HTML 工具 ==========

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  // ========== 渲染 ==========

  /**
   * 渲染统计卡片
   * @param {object} stats - { articles, videos, doubaoReplies, total }
   */
  function renderStats(stats) {
    const el = document.getElementById('stats-container');
    if (!el) return;

    el.innerHTML = `
      <div class="stat-item">
        <div class="number">${stats.videos || 0}</div>
        <div class="label">🎬 视频</div>
      </div>
      <div class="stat-item">
        <div class="number">${stats.articles || 0}</div>
        <div class="label">📄 文章</div>
      </div>
      <div class="stat-item">
        <div class="number">${stats.doubaoReplies || 0}</div>
        <div class="label">🤖 豆包回复</div>
      </div>
      <div class="stat-item">
        <div class="number">${stats.total || 0}</div>
        <div class="label">📊 总计</div>
      </div>
    `;
  }

  /**
   * 渲染博主导航条
   * @param {Array} items - 筛选后的内容条目
   */
  function renderCreatorNav(items) {
    var navEl = document.getElementById('creator-nav');
    if (!navEl) return;

    // 获取去重博主名并排序
    var creators = [];
    var seen = {};
    items.forEach(function (item) {
      var name = item.creator || '未知博主';
      if (!seen[name]) {
        seen[name] = true;
        creators.push(name);
      }
    });
    creators.sort();

    if (creators.length <= 1) {
      navEl.innerHTML = '';
      return;
    }

    var html = '<div class="creator-nav">';
    creators.forEach(function (name) {
      var anchor = 'creator-' + name;
      html += '<a href="#' + escapeHtml(anchor) + '">' + escapeHtml(name) + '</a>';
    });
    html += '</div>';

    navEl.innerHTML = html;
  }

  /**
   * 渲染内容列表（按博主分组）
   * @param {Array} items - 内容条目数组
   * @param {string} containerId - 容器元素 ID
   * @param {object} options - 渲染选项
   * @param {boolean} options.showDoubaoOnly - 仅显示有豆包回复的
   * @param {string} options.filterType - 按类型筛选: 'all' | 'video' | 'article'
   */
  function renderItemList(items, containerId, options) {
    var el = document.getElementById(containerId);
    if (!el) return;

    options = options || {};
    var showDoubaoOnly = options.showDoubaoOnly || false;
    var filterType = options.filterType || 'all';

    // 筛选
    var filtered = items;
    if (filterType === 'video') {
      filtered = items.filter(function (i) { return i.type === 'video'; });
    } else if (filterType === 'article') {
      filtered = items.filter(function (i) { return i.type === 'article'; });
    } else if (filterType === 'doubao') {
      filtered = items.filter(function (i) { return i.doubaoReply; });
    }

    if (showDoubaoOnly) {
      filtered = filtered.filter(function (i) { return i.doubaoReply; });
    }

    // 更新博主导航条
    renderCreatorNav(filtered);

    if (filtered.length === 0) {
      el.innerHTML = '<div class="empty">暂无内容</div>';
      return;
    }

    // 按博主分组
    var creatorGroups = {};
    var creatorOrder = [];
    filtered.forEach(function (item) {
      var name = item.creator || '未知博主';
      if (!creatorGroups[name]) {
        creatorGroups[name] = [];
        creatorOrder.push(name);
      }
      creatorGroups[name].push(item);
    });

    // 博主名排序（alphabetical）
    creatorOrder.sort();

    var html = '';
    var cardIndex = 0;

    creatorOrder.forEach(function (creatorName) {
      var groupItems = creatorGroups[creatorName];
      var videos = groupItems.filter(function (i) { return i.type === 'video'; });
      var articles = groupItems.filter(function (i) { return i.type === 'article'; });
      var anchorId = 'creator-' + creatorName;

      html += '<div class="creator-section" id="' + escapeHtml(anchorId) + '">';
      html += '<h2>👤 ' + escapeHtml(creatorName) + '</h2>';

      if (videos.length > 0) {
        html += '<div class="section"><h3>🎬 视频 <span class="count">' + videos.length + '</span></h3><div class="item-list">';
        videos.forEach(function (item) {
          html += renderItemCard(item, 'v-' + cardIndex++);
        });
        html += '</div></div>';
      }

      if (articles.length > 0) {
        html += '<div class="section"><h3>📄 文章 <span class="count">' + articles.length + '</span></h3><div class="item-list">';
        articles.forEach(function (item) {
          html += renderItemCard(item, 'a-' + cardIndex++);
        });
        html += '</div></div>';
      }

      html += '</div>';
    });

    el.innerHTML = html;
  }

  /**
   * 渲染单条内容卡片
   */
  function renderItemCard(item, index) {
    const hasDoubao = !!item.doubaoReply;
    const typeBadge = item.type === 'video'
      ? '<span class="item-badge badge-video">视频</span>'
      : '<span class="item-badge badge-article">文章</span>';
    const doubaoBadge = hasDoubao
      ? '<span class="item-badge badge-doubao">🤖 豆包</span>'
      : '';

    const dateDisplay = item.publishTime || item.date || '';
    const formattedDate = dateDisplay ? formatDate(dateDisplay) : '';

    const creatorDisplay = item.creator ? `<span class="item-creator">👤 ${escapeHtml(item.creator)}</span>` : '';

    const idx = index !== undefined ? index : Math.random().toString(36).slice(2);

    let card = `
      <div class="item${hasDoubao ? ' has-doubao' : ''}" id="item-${idx}">
        <div class="item-header">
          <div class="item-title">${escapeHtml(item.title || '无标题')}<button class="tts-btn" data-target="item-${idx}">🔊 朗读</button></div>
          <div>${typeBadge}${doubaoBadge}</div>
        </div>`;

    if (formattedDate || creatorDisplay) {
      card += `<div class="item-date">${creatorDisplay}${formattedDate ? '📅 ' + formattedDate : ''}</div>`;
    }

    if (hasDoubao) {
      card += renderDoubaoReply(item.doubaoReply);
    }

    if (item.summary) {
      card += `<div class="item-summary">${escapeHtml(item.summary)}</div>`;
    }

    card += `
        <a class="item-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
          查看详情 →
        </a>
      </div>`;

    return card;
  }

  /**
   * 渲染豆包回复卡片
   */
  function renderDoubaoReply(reply) {
    if (!reply) return '';

    // 兼容旧格式：纯字符串
    if (typeof reply === 'string') {
      return `
        <div class="doubao-reply">
          <div class="doubao-reply-header">🤖 豆包回复：</div>
          <div class="doubao-reply-content">${escapeHtml(reply)}</div>
        </div>`;
    }

    // 新格式：回复对象数组
    if (!Array.isArray(reply) || reply.length === 0) return '';

    let html = '<div class="doubao-reply"><div class="doubao-reply-header">🤖 豆包回复：</div>';
    reply.forEach(function (r) {
      if (r.askText) {
        html += `<div class="doubao-reply-question">💬 ${escapeHtml(r.askUser || '网友')}：${escapeHtml(r.askText)}</div>`;
      }
      html += `<div class="doubao-reply-content">${escapeHtml(r.doubaoReply || r.content || '')}</div>`;
      if (r.diggCount) {
        html += `<div class="doubao-reply-meta">👍 ${r.diggCount}</div>`;
      }
    });
    html += '</div>';
    return html;
  }

  /**
   * 渲染更新时间
   */
  function renderMeta(meta) {
    const el = document.getElementById('meta-container');
    if (!el || !meta) return;

    let text = '';
    if (meta.updatedAt) {
      text += '更新时间：' + new Date(meta.updatedAt).toLocaleString('zh-CN');
    }
    if (meta.status) {
      text += ' <span class="status-badge status-' + meta.status + '">' + meta.statusText + '</span>';
    }
    el.innerHTML = text;
  }

  // ========== TTS 朗读 ==========

  /**
   * 设置朗读按钮事件（事件委托）
   */
  function setupTTS() {
    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.tts-btn');
      if (!btn) return;

      const targetId = btn.dataset.target;
      const card = document.getElementById(targetId);
      if (!card) return;

      // 如果正在朗读，停止
      if (btn.classList.contains('speaking')) {
        speechSynthesis.cancel();
        btn.classList.remove('speaking');
        btn.textContent = '🔊 朗读';
        return;
      }

      // 停止其他朗读
      speechSynthesis.cancel();
      document.querySelectorAll('.tts-btn.speaking').forEach(b => {
        b.classList.remove('speaking');
        b.textContent = '🔊 朗读';
      });

      // 提取文本（排除按钮文字和链接）
      const text = card.textContent.replace(/🔊 朗读|⏹ 停止|查看详情 →/g, '').trim();
      if (!text) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = 1.0;

      utterance.onstart = function () {
        btn.classList.add('speaking');
        btn.textContent = '⏹ 停止';
      };

      utterance.onend = function () {
        btn.classList.remove('speaking');
        btn.textContent = '🔊 朗读';
      };

      utterance.onerror = function () {
        btn.classList.remove('speaking');
        btn.textContent = '🔊 朗读';
      };

      speechSynthesis.speak(utterance);
    });

    // 页面卸载时取消朗读
    window.addEventListener('beforeunload', function () {
      speechSynthesis.cancel();
    });
  }

  // ========== 返回顶部 ==========

  /**
   * 设置返回顶部按钮交互
   */
  function setupBackToTop() {
    var btn = document.getElementById('back-to-top');
    if (!btn) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 300) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });

    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ========== 筛选 ==========

  /**
   * 设置筛选按钮交互
   * @param {Array} items - 所有内容条目
   * @param {string} containerId - 内容容器 ID
   * @param {object} options - 额外选项
   */
  function setupFilters(items, containerId, options) {
    const filterBar = document.getElementById('filter-bar');
    if (!filterBar) return;

    filterBar.addEventListener('click', function (e) {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;

      // 更新 active 状态
      filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const type = btn.dataset.filter || 'all';
      renderItemList(items, containerId, { ...options, filterType: type });
    });
  }

  // ========== 导出到全局 ==========
  window.XiaobaReport = {
    loadData: loadData,
    renderStats: renderStats,
    renderItemList: renderItemList,
    renderCreatorNav: renderCreatorNav,
    renderDoubaoReply: renderDoubaoReply,
    renderMeta: renderMeta,
    setupFilters: setupFilters,
    setupTTS: setupTTS,
    setupBackToTop: setupBackToTop,
    escapeHtml: escapeHtml,
    formatDate: formatDate
  };
})();
