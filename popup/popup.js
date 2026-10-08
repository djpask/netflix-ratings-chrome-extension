// FlixRatings - Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const statusPill = document.getElementById('statusPill');
  const statusText = document.getElementById('statusText');
  const toggleGlobal = document.getElementById('toggleGlobal');
  const toggleCardBadges = document.getElementById('toggleCardBadges');
  const selectBadgePosition = document.getElementById('selectBadgePosition');
  const toggleBobRatings = document.getElementById('toggleBobRatings');
  const toggleHighlight = document.getElementById('toggleHighlight');

  // OMDb elements
  const toggleOmdb = document.getElementById('toggleOmdb');
  const omdbConfigBox = document.getElementById('omdbConfigBox');
  const omdbApiKey = document.getElementById('omdbApiKey');
  const btnToggleKeyVisibility = document.getElementById('btnToggleKeyVisibility');
  const btnSaveKey = document.getElementById('btnSaveKey');
  const btnTestKey = document.getElementById('btnTestKey');
  const omdbStatusMsg = document.getElementById('omdbStatusMsg');

  // Cache elements
  const cacheCountText = document.getElementById('cacheCountText');
  const btnClearCache = document.getElementById('btnClearCache');

  // Action elements
  const btnReloadNetflix = document.getElementById('btnReloadNetflix');

  // 1. Load initial settings
  const settings = await chrome.storage.local.get({
    globalEnabled: true,
    showCardBadges: true,
    badgePosition: 'top-right',
    showBobRatings: true,
    highlightMasterpieces: true,
    enableOmdb: false,
    omdbApiKey: ''
  });

  // Apply settings to UI
  toggleGlobal.checked = settings.globalEnabled;
  toggleCardBadges.checked = settings.showCardBadges;
  selectBadgePosition.value = settings.badgePosition;
  toggleBobRatings.checked = settings.showBobRatings;
  toggleHighlight.checked = settings.highlightMasterpieces;
  toggleOmdb.checked = settings.enableOmdb;
  omdbApiKey.value = settings.omdbApiKey || '';

  if (settings.enableOmdb) {
    omdbConfigBox.classList.remove('hidden');
  } else {
    omdbConfigBox.classList.add('hidden');
  }

  updateStatusUI(settings.globalEnabled);

  // 2. Fetch cache stats
  updateCacheStats();

  // 3. Event listeners for switches
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

  toggleOmdb.addEventListener('change', async () => {
    const isChecked = toggleOmdb.checked;
    if (isChecked) {
      omdbConfigBox.classList.remove('hidden');
    } else {
      omdbConfigBox.classList.add('hidden');
    }
    await chrome.storage.local.set({ enableOmdb: isChecked });
  });

  // Toggle API key visibility (password vs text)
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
        // If no tab found, open Netflix in a new tab
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
});
