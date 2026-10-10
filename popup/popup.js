// FlixRatings - Popup Script v0.6.0 (Watchlist & Keep Export)

document.addEventListener('DOMContentLoaded', async () => {
  // Navigation Tabs
  const tabBtnWatchlist = document.getElementById('tabBtnWatchlist');
  const tabBtnSettings = document.getElementById('tabBtnSettings');
  const tabContentWatchlist = document.getElementById('tabContentWatchlist');
  const tabContentSettings = document.getElementById('tabContentSettings');
  const watchlistBadgeCount = document.getElementById('watchlistBadgeCount');

  // Watchlist Elements
  const watchlistCountText = document.getElementById('watchlistCountText');
  const watchlistContainer = document.getElementById('watchlistContainer');
  const btnClearWatchlist = document.getElementById('btnClearWatchlist');
  const btnExportKeep = document.getElementById('btnExportKeep');
  const btnCopyWatchlist = document.getElementById('btnCopyWatchlist');
  const btnKeepCountSub = document.getElementById('btnKeepCountSub');
  const exportStatusMsg = document.getElementById('exportStatusMsg');

  // Settings DOM Elements
  const statusPill = document.getElementById('statusPill');
  const statusText = document.getElementById('statusText');
  const toggleGlobal = document.getElementById('toggleGlobal');
  const toggleCardBadges = document.getElementById('toggleCardBadges');
  const selectBadgePosition = document.getElementById('selectBadgePosition');
  const toggleBobRatings = document.getElementById('toggleBobRatings');
  const toggleHighlight = document.getElementById('toggleHighlight');
  const toggleRt = document.getElementById('toggleRt');
  const toggleMetacritic = document.getElementById('toggleMetacritic');

  // OMDb Elements
  const toggleOmdb = document.getElementById('toggleOmdb');
  const omdbConfigBox = document.getElementById('omdbConfigBox');
  const omdbApiKey = document.getElementById('omdbApiKey');
  const btnToggleKeyVisibility = document.getElementById('btnToggleKeyVisibility');
  const btnSaveKey = document.getElementById('btnSaveKey');
  const btnTestKey = document.getElementById('btnTestKey');
  const omdbStatusMsg = document.getElementById('omdbStatusMsg');

  // Cache Elements
  const cacheCountText = document.getElementById('cacheCountText');
  const btnClearCache = document.getElementById('btnClearCache');

  // Actions
  const btnReloadNetflix = document.getElementById('btnReloadNetflix');

  // ==========================================================================
  // Tab Switching Logic
  // ==========================================================================

  function switchTab(target) {
    if (target === 'watchlist') {
      tabBtnWatchlist.classList.add('active');
      tabBtnSettings.classList.remove('active');
      tabContentWatchlist.classList.remove('hidden');
      tabContentWatchlist.classList.add('active');
      tabContentSettings.classList.add('hidden');
      tabContentSettings.classList.remove('active');
      loadAndRenderWatchlist();
    } else {
      tabBtnSettings.classList.add('active');
      tabBtnWatchlist.classList.remove('active');
      tabContentSettings.classList.remove('hidden');
      tabContentSettings.classList.add('active');
      tabContentWatchlist.classList.add('hidden');
      tabContentWatchlist.classList.remove('active');
    }
  }

  tabBtnWatchlist.addEventListener('click', () => switchTab('watchlist'));
  tabBtnSettings.addEventListener('click', () => switchTab('settings'));

  // ==========================================================================
  // Watchlist Rendering & Actions
  // ==========================================================================

  let currentWatchlist = [];

  async function loadAndRenderWatchlist() {
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_WATCHLIST' }, resolve);
      });

      if (response && response.success && Array.isArray(response.watchlist)) {
        currentWatchlist = response.watchlist;
      } else {
        currentWatchlist = [];
      }
      renderWatchlistUI();
    } catch (e) {
      console.warn('Errore nel caricamento della Watchlist:', e);
    }
  }

  function renderWatchlistUI() {
    const count = currentWatchlist.length;
    watchlistBadgeCount.textContent = count;
    watchlistCountText.textContent = `${count} ${count === 1 ? 'titolo salvato' : 'titoli salvati'}`;
    btnKeepCountSub.textContent = count > 0 ? `(${count} elementi pronti)` : 'Nessun elemento';

    if (count === 0) {
      watchlistContainer.innerHTML = `
        <div class="watchlist-empty">
          <div class="empty-icon">🎬</div>
          <div class="empty-title">La tua lista Da Vedere è vuota</div>
          <p class="empty-desc">
            Passa su Netflix e clicca sul tasto <strong>"+"</strong> posizionato accanto ai badge dei voti sulle locandine per aggiungere film e serie TV.
          </p>
        </div>
      `;
      btnExportKeep.disabled = true;
      btnCopyWatchlist.disabled = true;
      btnClearWatchlist.style.display = 'none';
      return;
    }

    btnExportKeep.disabled = false;
    btnCopyWatchlist.disabled = false;
    btnClearWatchlist.style.display = 'inline-block';

    let html = '';
    currentWatchlist.forEach((item) => {
      const netflixUrl = item.netflixUrl || (item.netflixId ? `https://www.netflix.com/title/${item.netflixId}` : 'https://www.netflix.com');
      const imdbUrl = item.imdbId ? `https://www.imdb.com/title/${item.imdbId}/` : null;

      html += `
        <div class="watchlist-item">
          <div class="item-main">
            <div class="item-title-row">
              <span class="item-title" title="${item.title}">${item.title}</span>
              ${item.year ? `<span class="item-year">(${item.year})</span>` : ''}
            </div>
            <div class="item-badges">
              ${item.imdbRating ? `
                <a href="${imdbUrl || '#'}" target="_blank" rel="noopener noreferrer" class="mini-pill pill-imdb" title="IMDb Rating">
                  <span class="pill-tag">IMDb</span>
                  <span>${item.imdbRating}</span>
                </a>
              ` : ''}
              ${item.rottenTomatoes ? `
                <span class="mini-pill pill-rt" title="Rotten Tomatoes">
                  <span>🍅</span>
                  <span>${item.rottenTomatoes}</span>
                </span>
              ` : ''}
              ${item.metacritic ? `
                <span class="mini-pill pill-mc" title="Metacritic">
                  <span class="pill-tag mc">MC</span>
                  <span>${String(item.metacritic).replace('/100', '')}</span>
                </span>
              ` : ''}
            </div>
          </div>
          <div class="item-actions">
            <a href="${netflixUrl}" target="_blank" rel="noopener noreferrer" class="btn-netflix-link" title="Apri su Netflix">
              <span>N</span>
            </a>
            <button type="button" class="btn-remove-item" data-id="${item.netflixId || ''}" data-title="${item.title}" title="Rimuovi da Da Vedere">
              ✕
            </button>
          </div>
        </div>
      `;
    });

    watchlistContainer.innerHTML = html;

    // Remove buttons event delegation
    watchlistContainer.querySelectorAll('.btn-remove-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const netflixId = btn.dataset.id;
        const title = btn.dataset.title;
        btn.disabled = true;

        await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'REMOVE_FROM_WATCHLIST',
            netflixId: netflixId || null,
            title: title
          }, resolve);
        });

        loadAndRenderWatchlist();
      });
    });
  }

  // Clear all watchlist items
  btnClearWatchlist.addEventListener('click', async () => {
    if (currentWatchlist.length === 0) return;
    if (!confirm('Sei sicuro di voler svuotare tutta la lista dei titoli Da Vedere?')) {
      return;
    }

    await new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CLEAR_WATCHLIST' }, resolve);
    });
    loadAndRenderWatchlist();
    showExportStatus('Lista svuotata con successo.', 'normal');
  });

  // Copy Watchlist to clipboard
  btnCopyWatchlist.addEventListener('click', async () => {
    if (currentWatchlist.length === 0) return;

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_WATCHLIST_KEEP_TEXT' }, resolve);
      });

      if (response && response.success && response.text) {
        await navigator.clipboard.writeText(response.text);
        showExportStatus('✓ Elenco copiato negli appunti! Pronto da incollare.', 'success');
      }
    } catch (e) {
      showExportStatus('Errore nella copia degli appunti: ' + e.message, 'error');
    }
  });

  // Export to Google Keep
  btnExportKeep.addEventListener('click', async () => {
    if (currentWatchlist.length === 0) return;

    btnExportKeep.disabled = true;
    showExportStatus('Preparazione esportazione su Google Keep...', 'normal');

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_WATCHLIST_KEEP_TEXT' }, resolve);
      });

      if (!response || !response.success || !response.text) {
        throw new Error('Impossibile formattare l\'elenco');
      }

      // 1. Copy to clipboard immediately
      await navigator.clipboard.writeText(response.text);

      // 2. Set pending export flag in storage for Google Keep content script
      await chrome.storage.local.set({
        pendingKeepExport: {
          title: '🎬 Netflix - Film e Serie Da Vedere',
          text: response.text,
          count: currentWatchlist.length,
          timestamp: Date.now()
        }
      });

      // 3. Open or focus Google Keep in a new tab
      await chrome.tabs.create({ url: 'https://keep.google.com/' });

      showExportStatus('✓ Aperto Google Keep! La nota è pronta per essere creata.', 'success');
    } catch (e) {
      showExportStatus('Errore durante l\'esportazione: ' + e.message, 'error');
    } finally {
      setTimeout(() => { btnExportKeep.disabled = false; }, 1200);
    }
  });

  function showExportStatus(msg, type) {
    exportStatusMsg.textContent = msg;
    exportStatusMsg.className = `export-status-msg ${type}`;
    setTimeout(() => {
      exportStatusMsg.textContent = '';
      exportStatusMsg.className = 'export-status-msg';
    }, 4000);
  }

  // ==========================================================================
  // Settings Logic
  // ==========================================================================

  const settings = await chrome.storage.local.get({
    globalEnabled: true,
    showCardBadges: true,
    badgePosition: 'top-right',
    showBobRatings: true,
    highlightMasterpieces: true,
    showRt: true,
    showMetacritic: true,
    enableOmdb: false,
    omdbApiKey: ''
  });

  // Apply settings to UI
  toggleGlobal.checked = settings.globalEnabled;
  toggleCardBadges.checked = settings.showCardBadges;
  selectBadgePosition.value = settings.badgePosition;
  toggleBobRatings.checked = settings.showBobRatings;
  toggleHighlight.checked = settings.highlightMasterpieces;
  if (toggleRt) toggleRt.checked = settings.showRt !== false;
  if (toggleMetacritic) toggleMetacritic.checked = settings.showMetacritic !== false;
  toggleOmdb.checked = settings.enableOmdb;
  omdbApiKey.value = settings.omdbApiKey || '';

  if (settings.enableOmdb) {
    omdbConfigBox.classList.remove('hidden');
  } else {
    omdbConfigBox.classList.add('hidden');
  }

  updateStatusUI(settings.globalEnabled);
  updateCacheStats();

  // Watch storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' || area === 'sync') {
      if (changes.watchlist) {
        loadAndRenderWatchlist();
      }
    }
  });

  // Settings Event listeners
  toggleGlobal.addEventListener('change', async () => {
    const enabled = toggleGlobal.checked;
    await chrome.storage.local.set({
      globalEnabled: enabled,
      showCardBadges: enabled && toggleCardBadges.checked,
      showBobRatings: enabled && toggleBobRatings.checked
    });
    updateStatusUI(enabled);
  });

  toggleCardBadges.addEventListener('change', async () => {
    await chrome.storage.local.set({ showCardBadges: toggleCardBadges.checked });
  });

  selectBadgePosition.addEventListener('change', async () => {
    await chrome.storage.local.set({ badgePosition: selectBadgePosition.value });
  });

  toggleBobRatings.addEventListener('change', async () => {
    await chrome.storage.local.set({ showBobRatings: toggleBobRatings.checked });
  });

  toggleHighlight.addEventListener('change', async () => {
    await chrome.storage.local.set({ highlightMasterpieces: toggleHighlight.checked });
  });

  if (toggleRt) {
    toggleRt.addEventListener('change', async () => {
      await chrome.storage.local.set({ showRt: toggleRt.checked });
    });
  }

  if (toggleMetacritic) {
    toggleMetacritic.addEventListener('change', async () => {
      await chrome.storage.local.set({ showMetacritic: toggleMetacritic.checked });
    });
  }

  toggleOmdb.addEventListener('change', async () => {
    const isChecked = toggleOmdb.checked;
    if (isChecked) {
      omdbConfigBox.classList.remove('hidden');
    } else {
      omdbConfigBox.classList.add('hidden');
    }
    await chrome.storage.local.set({ enableOmdb: isChecked });
  });

  // Toggle API key visibility
  btnToggleKeyVisibility.addEventListener('click', () => {
    if (omdbApiKey.type === 'password') {
      omdbApiKey.type = 'text';
      btnToggleKeyVisibility.textContent = '🔒';
    } else {
      omdbApiKey.type = 'password';
      btnToggleKeyVisibility.textContent = '👁️';
    }
  });

  // Save OMDb key
  btnSaveKey.addEventListener('click', async () => {
    const key = omdbApiKey.value.trim();
    await chrome.storage.local.set({ omdbApiKey: key });
    showOmdbStatus('Chiave API salvata con successo!', 'success');
  });

  // Test OMDb key
  btnTestKey.addEventListener('click', async () => {
    const key = omdbApiKey.value.trim();
    if (!key) {
      showOmdbStatus('Inserisci prima una chiave API!', 'error');
      return;
    }

    showOmdbStatus('Verifica in corso...', 'normal');
    btnTestKey.disabled = true;

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'TEST_OMDB_KEY', apiKey: key }, (res) => {
          resolve(res);
        });
      });

      if (response && response.valid) {
        showOmdbStatus(`✓ Valida! Trovato: "${response.sampleTitle}" (IMDb: ${response.imdbRating})`, 'success');
      } else {
        showOmdbStatus(`✗ Errore: ${response?.error || 'Chiave non valida'}`, 'error');
      }
    } catch (err) {
      showOmdbStatus(`✗ Errore di rete: ${err.message}`, 'error');
    } finally {
      btnTestKey.disabled = false;
    }
  });

  // Clear cache
  btnClearCache.addEventListener('click', async () => {
    if (!confirm('Vuoi davvero cancellare la cache delle valutazioni memorizzate?')) {
      return;
    }

    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, (res) => {
          resolve(res);
        });
      });

      if (response && response.success) {
        cacheCountText.textContent = '0 titoli memorizzati';
        alert(`Cache svuotata! Rimossi ${response.count} titoli.`);
      }
    } catch (err) {
      console.error('Errore durante lo svuotamento della cache:', err);
    }
  });

  // Reload Netflix tabs
  btnReloadNetflix.addEventListener('click', async () => {
    btnReloadNetflix.textContent = 'Ricaricamento in corso...';
    btnReloadNetflix.disabled = true;

    try {
      const tabs = await chrome.tabs.query({ url: '*://*.netflix.com/*' });
      if (tabs.length === 0) {
        await chrome.tabs.create({ url: 'https://www.netflix.com' });
      } else {
        for (const tab of tabs) {
          await chrome.tabs.reload(tab.id);
        }
      }
      setTimeout(() => {
        btnReloadNetflix.textContent = 'Aggiornato con successo! ✓';
        setTimeout(() => {
          btnReloadNetflix.textContent = 'Aggiorna scheda Netflix ↺';
          btnReloadNetflix.disabled = false;
        }, 1500);
      }, 500);
    } catch (err) {
      console.error('Errore nel reload:', err);
      btnReloadNetflix.textContent = 'Aggiorna scheda Netflix ↺';
      btnReloadNetflix.disabled = false;
    }
  });

  // Helper functions
  function updateStatusUI(enabled) {
    if (enabled) {
      statusPill.classList.remove('disabled');
      statusText.textContent = 'Attivo';
    } else {
      statusPill.classList.add('disabled');
      statusText.textContent = 'Disattivato';
    }
  }

  function showOmdbStatus(msg, type) {
    omdbStatusMsg.textContent = msg;
    omdbStatusMsg.className = `status-msg ${type}`;
  }

  async function updateCacheStats() {
    try {
      const stats = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' }, (res) => {
          resolve(res);
        });
      });
      if (stats && typeof stats.cachedCount === 'number') {
        cacheCountText.textContent = `${stats.cachedCount} titoli memorizzati`;
      }
    } catch (err) {
      console.warn('Impossibile ottenere statistiche cache:', err);
    }
  }

  // Initial load
  loadAndRenderWatchlist();
});
