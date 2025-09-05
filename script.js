// Main application script
(function () {
  'use strict';

  // Tag color themes
  const TAG_THEMES = {
    'Trading 101': { accent: '#f59e0b', accent2: '#fbbf24', link: '#cc7722' },
    'DEX': { accent: '#0ea5a4', accent2: '#22d3ee', link: '#0ea5a4' },
    'Web3 Gaming': { accent: '#a855f7', accent2: '#f472b6', link: '#a855f7' }
  };

  // Helper functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function extractTweetId(url) {
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
  }

  // Main App Class
  class TradingLinksApp {
    constructor() {
      this.posts = [];
      this.referrals = [];
      this.activeTags = new Set();
      this.searchQuery = '';

      // Check if data is loaded
      if (typeof window.POSTS === 'undefined' || typeof window.REFERRALS === 'undefined') {
        console.error('Data files not loaded. Make sure posts.js and referrals.js are included.');
        this.showError();
        return;
      }

      this.init();
    }

    init() {
      this.loadData();
      this.setupEventListeners();
      this.applyTheme();
      this.render();
    }

    loadData() {
      // Validate and sanitize posts data
      if (Array.isArray(window.POSTS)) {
        this.posts = window.POSTS.map(post => ({
          title: String(post.title || ''),
          url: String(post.url || ''),
          tags: Array.isArray(post.tags) ? post.tags.map(t => String(t)) : [],
          date: post.date || '',
          summary: String(post.summary || '')
        }));
      }

      // Validate and sanitize referrals data
      if (Array.isArray(window.REFERRALS)) {
        this.referrals = window.REFERRALS.map(ref => ({
          name: String(ref.name || ''),
          url: String(ref.url || ''),
          blurb: String(ref.blurb || '')
        }));
      }
    }

    setupEventListeners() {
      // Search functionality
      const searchInput = document.getElementById('search');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          this.searchQuery = e.target.value.toLowerCase().trim();
          this.renderPosts();
        });
      }
    }

    applyTheme() {
      // Count tags to find most popular
      const tagCounts = {};
      this.posts.forEach(post => {
        post.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });

      // Get most popular tag
      const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
      const mostPopular = sortedTags[0] ? sortedTags[0][0] : 'Trading 101';

      // Apply theme
      const theme = TAG_THEMES[mostPopular] || TAG_THEMES['Trading 101'];
      const root = document.documentElement;
      root.style.setProperty('--accent', theme.accent);
      root.style.setProperty('--accent-2', theme.accent2);
      root.style.setProperty('--link', theme.link);
    }

    getAllTags() {
      const tags = new Set();
      this.posts.forEach(post => {
        post.tags.forEach(tag => tags.add(tag));
      });
      return Array.from(tags).sort();
    }

    getFilteredPosts() {
      return this.posts.filter(post => {
        // Check tags
        const matchesTags = this.activeTags.size === 0 ||
          post.tags.some(tag => this.activeTags.has(tag));

        // Check search query
        if (!this.searchQuery) return matchesTags;

        const searchText = `${post.title} ${post.summary} ${post.tags.join(' ')}`.toLowerCase();
        return matchesTags && searchText.includes(this.searchQuery);
      }).sort((a, b) => {
        // Sort by date, newest first
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
    }

    renderReferrals() {
      const container = document.getElementById('referrals');
      if (!container) return;

      if (this.referrals.length === 0) {
        container.innerHTML = '<div class="empty-state">No referrals available.</div>';
        return;
      }

      container.innerHTML = this.referrals.map(ref =>
        `<a href="${escapeHtml(ref.url)}" class="referral-link" target="_blank" rel="noopener noreferrer">
          <span class="referral-name">${escapeHtml(ref.name)}</span> --- ${escapeHtml(ref.blurb)}
        </a>`
      ).join('');
    }

    renderFilters() {
      const container = document.getElementById('filters');
      if (!container) return;

      const allTags = this.getAllTags();

      // Create filter buttons
      let html = `<button class="filter-btn" data-filter="all" aria-pressed="${this.activeTags.size === 0}">All</button>`;

      allTags.forEach(tag => {
        html += `<button class="filter-btn" data-tag="${escapeHtml(tag)}" aria-pressed="${this.activeTags.has(tag)}">${escapeHtml(tag)}</button>`;
      });

      container.innerHTML = html;

      // Add click handlers
      container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          if (btn.dataset.filter === 'all') {
            this.activeTags.clear();
          } else if (btn.dataset.tag) {
            const tag = btn.dataset.tag;
            if (this.activeTags.has(tag)) {
              this.activeTags.delete(tag);
            } else {
              this.activeTags.add(tag);
            }
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
      const totalPostsEl = document.getElementById('totalPosts');
      const activeFilterEl = document.getElementById('activeFilter');

      if (totalPostsEl) totalPostsEl.textContent = this.posts.length;
      if (activeFilterEl) {
        activeFilterEl.textContent = this.activeTags.size > 0
          ? Array.from(this.activeTags).join(', ')
          : 'All';
      }

      // Render posts or empty state
      if (filteredPosts.length === 0) {
        container.innerHTML = '<div class="empty-state">No posts found matching your criteria.</div>';
        return;
      }

      container.innerHTML = filteredPosts.map(post => {
        const tweetId = extractTweetId(post.url);
        const replyUrl = tweetId ? `https://x.com/intent/tweet?in_reply_to=${tweetId}` : post.url;
        const likeUrl = tweetId ? `https://x.com/intent/like?tweet_id=${tweetId}` : post.url;
        const retweetUrl = tweetId ? `https://x.com/intent/retweet?tweet_id=${tweetId}` : post.url;

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
            <div class="post-tags">
              ${post.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="post-actions">
              <a class="btn btn-primary" href="${escapeHtml(replyUrl)}" target="_blank" rel="noopener noreferrer">Comment</a>
              <a class="btn btn-secondary" href="${escapeHtml(likeUrl)}" target="_blank" rel="noopener noreferrer">Like</a>
              <a class="btn btn-outline" href="${escapeHtml(retweetUrl)}" target="_blank" rel="noopener noreferrer">Repost</a>
            </div>
          </article>
        `;
      }).join('');
    }

    showError() {
      const postsEl = document.getElementById('posts');
      const referralsEl = document.getElementById('referrals');
      const filtersEl = document.getElementById('filters');

      const errorMsg = '<div class="empty-state">Error loading data. Please check that all files are properly loaded.</div>';

      if (postsEl) postsEl.innerHTML = errorMsg;
      if (referralsEl) referralsEl.innerHTML = errorMsg;
      if (filtersEl) filtersEl.innerHTML = '';
    }

    render() {
      this.renderReferrals();
      this.renderFilters();
      this.renderPosts();
    }
  }

  // Initialize app when DOM is ready
  function initApp() {
    new TradingLinksApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();