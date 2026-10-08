// FlixRatings - Content Script (Modern Netflix Integration v0.5.0)

(() => {
  'use strict';

  let config = {
    showCardBadges: true,
    showBobRatings: true,
    showModalRatings: true,
    highlightMasterpieces: true,
    badgePosition: 'top-right',
    showRt: true,
    showMetacritic: true
  };

  chrome.storage.local.get([
    'showCardBadges',
    'showBobRatings',
    'showModalRatings',
    'highlightMasterpieces',
    'badgePosition',
    'showRt',
    'showMetacritic'
  ], (items) => {
    config = { ...config, ...items };
    applyConfigUpdates();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      for (const [key, change] of Object.entries(changes)) {
        if (key in config) {
          config[key] = change.newValue;
        }
      }
      applyConfigUpdates();
    }
  });

  function applyConfigUpdates() {
    document.querySelectorAll('.flixratings-card-badge').forEach(badge => {
      badge.style.display = config.showCardBadges ? 'inline-flex' : 'none';
      if (config.badgePosition === 'top-left') {
        badge.classList.add('badge-left');
      } else {
        badge.classList.remove('badge-left');
      }

      const rtSep = badge.querySelector('.flix-rt-sep');
      const rtScore = badge.querySelector('.rt-score');
      if (rtSep && rtScore) {
        const disp = (config.showRt !== false) ? '' : 'none';
        rtSep.style.display = disp;
        rtScore.style.display = disp;
      }

      const mcSep = badge.querySelector('.flix-mc-sep');
      const mcScore = badge.querySelector('.mc-score');
      if (mcSep && mcScore) {
        const disp = (config.showMetacritic !== false) ? '' : 'none';
        mcSep.style.display = disp;
        mcScore.style.display = disp;
      }
    });

    document.querySelectorAll('.flixratings-bob-row').forEach(row => {
      row.style.display = config.showBobRatings ? 'flex' : 'none';
      const pillRt = row.querySelector('.pill-rt');
      if (pillRt) {
        pillRt.style.display = (config.showRt !== false) ? 'inline-flex' : 'none';
      }
      const pillMeta = row.querySelector('.pill-meta');
      if (pillMeta) {
        pillMeta.style.display = (config.showMetacritic !== false) ? 'inline-flex' : 'none';
      }
    });

    document.querySelectorAll('.flixratings-modal-section').forEach(sec => {
      sec.style.display = config.showModalRatings ? 'flex' : 'none';
    });
  }

  // Blacklist of UI button labels and non-movie strings
  const UI_BLACKLIST = new Set([
    'riproduci', 'play', 'guarda', 'guarda ora', 'guarda subito', 'watch', 'watch now',
    'altre info', 'altre informazioni', 'più informazioni', 'more info', 'dettagli', 'info',
    'la mia lista', 'aggiungi a la mia lista', 'rimuovi da la mia lista', 'my list', 'add to list',
    'mi piace', 'non fa per me', 'adoro questo titolo', 'like', 'dislike',
    'audio spaziale', 'audio descrittivo', '5.1', 'dolby atmos', 'dolby vision',
    'vm14', 'vm18', 'vm12', 'vm6', 't', '13+', '16+', '18+', 'all', 'tv-ma', 'tv-14', 'pg-13',
    'top 10', 'nuovo', 'nuova uscita', 'nuovi episodi', 'new', 'recently added',
    'episodi', 'episodio', 'episodes', 'stagioni', 'stagione',
    'netflix', 'original', 'film', 'serie', 'trailer', 'chiudi', 'close',
    'prossimo', 'precedente', 'next', 'previous'
  ]);

  function isValidTitle(text) {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (trimmed.length < 2) return false;
    const lower = trimmed.toLowerCase();
    if (UI_BLACKLIST.has(lower)) return false;
    if (/^(riproduci|play|altre info|più info|aggiungi|rimuovi|guarda|continua a guardare)\b/i.test(lower)) return false;
    return true;
  }

  function cleanTitle(raw) {
    if (!raw) return '';
    let title = raw.trim();

    // Strip Netflix phrases
    title = title.replace(/\s*[-–—|]\s*(?:Netflix|Guarda ora|Guarda subito|Watch now|Sito ufficiale).*$/i, '');
    
    // Strip season / part labels: "Stranger Things: Season 4", "La Casa di Carta: Parte 3"
    title = title.replace(/\s*[:\-\(]\s*(?:Stagione|Parte|Part|Season|Vol\.?|Volume|Capitolo|Chapter)\s*\d+.*$/i, '');
    
    // Strip year in parenthesis: "Titolo (2022)"
    title = title.replace(/\s*\(\d{4}\)$/, '');

    return title.trim();
  }

  // Extract title from card element
  function extractTitle(card) {
    if (!card) return '';

    // If card is explicitly a cloud game, skip
    if (card.getAttribute('data-uia') === 'cloud-game-card' || card.classList.contains('cloud-game-card')) {
      return '';
    }

    // 1. Direct aria-label on card (matches modern Netflix Hawkins standard-card and progress-card)
    const directAria = card.getAttribute('aria-label');
    if (directAria) {
      const cleaned = cleanTitle(directAria);
      if (isValidTitle(cleaned)) return cleaned;
    }

    // 2. Child anchor with aria-label
    const innerLink = card.querySelector('a[aria-label]:not([aria-label="Play"]):not([aria-label="Riproduci"])');
    if (innerLink) {
      const label = innerLink.getAttribute('aria-label');
      const cleaned = cleanTitle(label);
      if (isValidTitle(cleaned)) return cleaned;
    }

    // 3. Fallback text element
    const fallback = card.querySelector('.fallback-text, [class*="fallback-text"]');
    if (fallback && fallback.textContent) {
      const cleaned = cleanTitle(fallback.textContent);
      if (isValidTitle(cleaned)) return cleaned;
    }

    // 4. Image alt text (if non-empty)
    const img = card.querySelector('img[alt]');
    if (img) {
      const alt = img.getAttribute('alt');
      if (alt && alt.trim().length > 1) {
        const cleaned = cleanTitle(alt);
        if (isValidTitle(cleaned)) return cleaned;
      }
    }

    return '';
  }

  function getRatingClass(score) {
    const num = parseFloat(score);
    if (isNaN(num)) return 'flixratings-mid';
    if (num >= 8.0) return 'flixratings-masterpiece';
    if (num >= 7.0) return 'flixratings-high';
    if (num >= 5.5) return 'flixratings-mid';
    return 'flixratings-low';
  }

  function formatMetacritic(val) {
    if (!val) return null;
    const match = String(val).match(/\d+/);
    if (!match) return null;
    const num = parseInt(match[0], 10);
    if (isNaN(num)) return null;
    let grade = 'mid';
    if (num >= 61) grade = 'high';
    else if (num >= 40) grade = 'mid';
    else grade = 'low';
    return { num, grade, raw: val };
  }

  // Request rating from service worker
  async function fetchRating(title) {
    return new Promise(resolve => {
      chrome.runtime.sendMessage({ type: 'GET_RATING', title }, response => {
        if (chrome.runtime.lastError || !response || !response.success) {
          resolve(null);
        } else {
          resolve(response.rating);
        }
      });
    });
  }

  // Process a card in the feed
  async function processCard(card) {
    if (card.querySelector('.flixratings-card-badge')) return;

    const title = extractTitle(card);
    if (!title) return;

    if (card.dataset.flixProcessing === title) return;
    card.dataset.flixProcessing = title;

    const rating = await fetchRating(title);
    card.dataset.flixProcessing = '';

    if (!rating || !rating.found || !rating.imdbRating) return;
    if (!card.isConnected) return;
    if (card.querySelector('.flixratings-card-badge')) return;

    requestAnimationFrame(() => {
      if (card.querySelector('.flixratings-card-badge')) return;

      const badge = document.createElement('div');
      badge.className = `flixratings-card-badge ${getRatingClass(rating.imdbRating)}`;
      if (config.badgePosition === 'top-left') {
        badge.classList.add('badge-left');
      }
      if (!config.showCardBadges) {
        badge.style.display = 'none';
      }

      let inner = `
        <span class="imdb-icon">IMDb</span>
        <span class="rating-num">${rating.imdbRating}</span>
      `;

      if (rating.rottenTomatoes) {
        const rtDisp = (config.showRt !== false) ? '' : 'style="display:none;"';
        inner += `
          <span class="badge-critics-sep flix-rt-sep" ${rtDisp}></span>
          <span class="rt-score" title="Rotten Tomatoes: ${rating.rottenTomatoes}" ${rtDisp}>🍅 ${rating.rottenTomatoes}</span>
        `;
      }

      if (rating.metacritic) {
        const mc = formatMetacritic(rating.metacritic);
        if (mc) {
          const mcDisp = (config.showMetacritic !== false) ? '' : 'style="display:none;"';
          inner += `
            <span class="badge-critics-sep flix-mc-sep" ${mcDisp}></span>
            <span class="mc-score mc-${mc.grade}" title="Metacritic: ${mc.num}/100" ${mcDisp}>
              <span class="mc-tag">MC</span>
              <span class="mc-val">${mc.num}</span>
            </span>
          `;
        }
      }

      badge.innerHTML = inner;

      let tooltip = `${rating.title} (${rating.year || 'N/A'})\nValutazione IMDb: ${rating.imdbRating}/10`;
      if (rating.rottenTomatoes) tooltip += `\nRotten Tomatoes: ${rating.rottenTomatoes}`;
      if (rating.metacritic) tooltip += `\nMetacritic: ${rating.metacritic}`;
      tooltip += `\nClicca per aprire la scheda IMDb`;
      badge.title = tooltip;

      const imdbUrl = rating.imdbId 
        ? `https://www.imdb.com/title/${rating.imdbId}/`
        : `https://www.imdb.com/find?q=${encodeURIComponent(rating.title)}`;

      // Click opens IMDb without triggering Netflix modal or video
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        window.open(imdbUrl, '_blank', 'noopener,noreferrer');
      });

      // Ensure relative positioning on card container
      if (window.getComputedStyle(card).position === 'static') {
        card.style.position = 'relative';
      }
      card.appendChild(badge);
    });
  }

  // Process Bob Card (hover mini preview)
  async function processBobCard(bobCard) {
    if (bobCard.querySelector('.flixratings-bob-row')) return;

    const title = extractTitle(bobCard);
    if (!title) return;

    if (bobCard.dataset.flixBobProcessing === title) return;
    bobCard.dataset.flixBobProcessing = title;

    const rating = await fetchRating(title);
    bobCard.dataset.flixBobProcessing = '';

    if (!rating || !rating.found || !rating.imdbRating) return;
    if (!bobCard.isConnected) return;

    requestAnimationFrame(() => {
      if (bobCard.querySelector('.flixratings-bob-row')) return;

      const metaContainer = bobCard.querySelector('.bob-metadata-wrapper, .meta, .bob-overview, [class*="metadata"]') || bobCard;

      const bobRow = document.createElement('div');
      bobRow.className = 'flixratings-bob-row';
      if (!config.showBobRatings) {
        bobRow.style.display = 'none';
      }

      const imdbUrl = rating.imdbId 
        ? `https://www.imdb.com/title/${rating.imdbId}/`
        : `https://www.imdb.com/find?q=${encodeURIComponent(rating.title)}`;

      let pillsHtml = `
        <a href="${imdbUrl}" target="_blank" rel="noopener noreferrer" class="flixratings-pill pill-imdb" title="Apri su IMDb: ${rating.title}">
          <span class="imdb-tag">IMDb</span>
          <span>${rating.imdbRating}/10</span>
          ${rating.imdbVotes ? `<span style="opacity:0.75;font-size:10px;">(${rating.imdbVotes})</span>` : ''}
        </a>
      `;

      if (rating.rottenTomatoes) {
        const rtDisp = (config.showRt !== false) ? '' : 'style="display:none;"';
        pillsHtml += `
          <span class="flixratings-pill pill-rt" title="Rotten Tomatoes Score" ${rtDisp}>
            <span>🍅</span>
            <span>${rating.rottenTomatoes}</span>
          </span>
        `;
      }

      if (rating.metacritic) {
        const mcDisp = (config.showMetacritic !== false) ? '' : 'style="display:none;"';
        const mc = formatMetacritic(rating.metacritic);
        const scoreDisplay = mc ? `${mc.num}/100` : rating.metacritic;
        pillsHtml += `
          <span class="flixratings-pill pill-meta" title="Metacritic Score" ${mcDisp}>
            <span class="meta-tag">MC</span>
            <span>${scoreDisplay}</span>
          </span>
        `;
      }

      if (rating.awards) {
        pillsHtml += `
          <div class="flixratings-awards-text">
            <span>🏆</span>
            <span>${rating.awards}</span>
          </div>
        `;
      }

      bobRow.innerHTML = pillsHtml;
      bobRow.addEventListener('click', (e) => e.stopPropagation());

      if (metaContainer.firstChild) {
        metaContainer.insertBefore(bobRow, metaContainer.firstChild);
      } else {
        metaContainer.appendChild(bobRow);
      }
    });
  }

  // Scan all cards in feed
  function scanFeed() {
    const cardSelectors = [
      'a[data-uia="standard-card"]',
      'a[data-uia="progress-card"]',
      'a[data-uia*="-card"]:not([data-uia="cloud-game-card"])',
      'a[href*="jbv="]',
      '.title-card',
      '.galleryLockup',
      '[data-uia="movie-reference"]',
      '.slider-item'
    ];

    const cards = document.querySelectorAll(cardSelectors.join(','));
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];

      // Avoid outer wrappers if inner standard-card exists
      if (card.classList.contains('slider-item') && card.querySelector('a[data-uia*="-card"], .title-card')) {
        continue;
      }

      if (!card.querySelector('.flixratings-card-badge')) {
        processCard(card);
      }
    }

    // Check Bob card (hover preview modal)
    const bobCard = document.querySelector('.bob-card, .mini-modal-container, [class*="bob-container"]');
    if (bobCard && !bobCard.querySelector('.flixratings-bob-row')) {
      processBobCard(bobCard);
    }
  }

  // Debounced DOM observer
  let scanTimer = null;
  const domObserver = new MutationObserver(() => {
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scanFeed();
    }, 120);
  });

  function start() {
    scanFeed();
    domObserver.observe(document.body, { childList: true, subtree: true });

    let scrollTimer = null;
    window.addEventListener('scroll', () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        scanFeed();
      }, 100);
    }, { passive: true });

    // Periodic check during first 8 seconds
    let count = 0;
    const interval = setInterval(() => {
      count++;
      scanFeed();
      if (count > 10) clearInterval(interval);
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  console.log('[FlixRatings v0.5.0] Content script active on Netflix.');
})();
