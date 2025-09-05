// Main application script
(function () {
  'use strict';

  // Tag color configuration
  const TAG_COLORS = {
    'Trading 101': { bg: '#ffe9b3', text: '#d35400' },
    'DEX': { bg: '#d5f4e6', text: '#138d75' },
    'Web3 Gaming': { bg: '#fadbd8', text: '#c0392b' }
  };

  // Helper functions
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? '' :
      date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const extractTweetId = (url) => url.match(/status\/(\d+)/)?.[1] || null;

  // Main App Class
  class SkippyDooApps {
    constructor() {
      this.posts = [];
      this.referrals = [];
      this.activeTags = new Set();
      this.searchQuery = '';

      if (!window.POSTS || !window.REFERRALS) {
        console.error('Data files not loaded');
        this.showError();
        return;
      }

      this.init();
    }

    init() {
      this.loadData();
      this.setupEventListeners();
      this.render();
    }

    loadData() {
      this.posts = (window.POSTS || []).map(post => ({
        title: String(post.title || ''),
        url: String(post.url || ''),
        tags: Array.isArray(post.tags) ? post.tags : [],
        date: post.date || '',
        summary: String(post.summary || '')
      }));

      this.referrals = (window.REFERRALS || []).map(ref => ({
        name: String(ref.name || ''),
        url: String(ref.url || ''),
        blurb: String(ref.blurb || '')
      }));
    }

    setupEventListeners() {
      const searchInput = document.getElementById('search');
      searchInput?.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderPosts();
      });
    }

    getFilteredPosts() {
      return this.posts.filter(post => {
        const matchesTags = this.activeTags.size === 0 ||
          post.tags.some(tag => this.activeTags.has(tag));

        if (!this.searchQuery) return matchesTags;

        const searchText = `${post.title} ${post.summary} ${post.tags.join(' ')}`.toLowerCase();
        return matchesTags && searchText.includes(this.searchQuery);
      }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    renderReferrals() {
      const container = document.getElementById('referrals');
      if (!container) return;

      container.innerHTML = this.referrals.length === 0
        ? '<div class="empty-state">No referrals available.</div>'
        : this.referrals.map(ref =>
          `<a href="${escapeHtml(ref.url)}" class="referral-link" target="_blank" rel="noopener noreferrer">
              <span class="referral-name">${escapeHtml(ref.name)}</span> — ${escapeHtml(ref.blurb)}
            </a>`
        ).join('');
    }

    renderFilters() {
      const container = document.getElementById('filters');
      if (!container) return;

      const tags = [...new Set(this.posts.flatMap(p => p.tags))].sort();

      container.innerHTML = `
        <button class="filter-btn" data-filter="all" aria-pressed="${this.activeTags.size === 0}">All</button>
        ${tags.map(tag =>
        `<button class="filter-btn" data-tag="${escapeHtml(tag)}" aria-pressed="${this.activeTags.has(tag)}">${escapeHtml(tag)}</button>`
      ).join('')}
      `;

      container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.filter === 'all') {
            this.activeTags.clear();
          } else if (btn.dataset.tag) {
            const tag = btn.dataset.tag;
            this.activeTags.has(tag) ? this.activeTags.delete(tag) : this.activeTags.add(tag);
          }
          this.render();
        });
      });
    }

    renderPosts() {
      const container = document.getElementById('posts');
      if (!container) return;

      const filteredPosts = this.getFilteredPosts();

      // Update stats
      const totalEl = document.getElementById('totalPosts');
      const filterEl = document.getElementById('activeFilter');
      if (totalEl) totalEl.textContent = this.posts.length;
      if (filterEl) filterEl.textContent = this.activeTags.size > 0 ? [...this.activeTags].join(', ') : 'All';

      if (filteredPosts.length === 0) {
        container.innerHTML = '<div class="empty-state">No posts found matching your criteria.</div>';
        return;
      }

      container.innerHTML = filteredPosts.map(post => {
        const tweetId = extractTweetId(post.url);
        const likeUrl = tweetId ? `https://x.com/intent/like?tweet_id=${tweetId}` : '#';
        const shareUrl = tweetId ? `https://x.com/intent/retweet?tweet_id=${tweetId}` : '#';

        const tagsHtml = post.tags.map(tag => {
          const colors = TAG_COLORS[tag] || { bg: 'var(--tag-pill)', text: 'var(--text)' };
          return `<span class="tag" style="background: ${colors.bg}; color: ${colors.text};">${escapeHtml(tag)}</span>`;
        }).join('');

        return `
          <article class="post-card">
            <h3 class="post-title">
              <a href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(post.title)}
              </a>
            </h3>
            <div class="post-meta">
              <time datetime="${escapeHtml(post.date)}">${formatDate(post.date)}</time>
            </div>
            <p class="post-summary">${escapeHtml(post.summary)}</p>
            <div class="post-tags">${tagsHtml}</div>
            <div class="post-actions">
              <a class="btn btn-primary" href="${escapeHtml(post.url)}" target="_blank" rel="noopener noreferrer">Go to</a>
              <a class="btn btn-secondary" href="${escapeHtml(likeUrl)}" target="_blank" rel="noopener noreferrer">Like</a>
              <a class="btn btn-outline" href="${escapeHtml(shareUrl)}" target="_blank" rel="noopener noreferrer">Share</a>
            </div>
          </article>
        `;
      }).join('');
    }

    showError() {
      ['posts', 'referrals'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="empty-state">Error loading data.</div>';
      });
      const filters = document.getElementById('filters');
      if (filters) filters.innerHTML = '';
    }

    render() {
      this.renderReferrals();
      this.renderFilters();
      this.renderPosts();
    }
  }

  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new SkippyDooApps());
  } else {
    new SkippyDooApps();
  }
})();