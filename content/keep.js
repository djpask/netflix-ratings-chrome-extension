// FlixRatings - Content Script for Google Keep (keep.google.com)

(() => {
  'use strict';

  // Check for pending export from FlixRatings popup
  chrome.storage.local.get(['pendingKeepExport'], (result) => {
    const exportData = result.pendingKeepExport;
    if (!exportData || !exportData.text) return;

    // Check if export was initiated recently (within 5 minutes)
    const FIVE_MINUTES = 5 * 60 * 1000;
    if (Date.now() - (exportData.timestamp || 0) > FIVE_MINUTES) {
      chrome.storage.local.remove(['pendingKeepExport']);
      return;
    }

    // Clear flag once detected
    chrome.storage.local.remove(['pendingKeepExport']);

    // Display assist banner on Google Keep
    showKeepExportBanner(exportData);
  });

  function showKeepExportBanner(data) {
    if (document.getElementById('flixratings-keep-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'flixratings-keep-banner';

    banner.innerHTML = `
      <div class="flixratings-banner-header">
        <div class="flixratings-banner-title">
          <span>🎬</span>
          <span>FlixRatings • Esportazione Note</span>
        </div>
        <button type="button" class="flixratings-banner-close" id="btnCloseKeepBanner" title="Chiudi">✕</button>
      </div>
      <div class="flixratings-banner-body">
        <strong>${data.count} titoli Netflix pronti!</strong><br>
        Il testo è già stato copiato nei tuoi appunti. Clicca sul pulsante per provare a creare la nota o incolla manualmente (<code>Ctrl + V</code>).
      </div>
      <div class="flixratings-banner-actions">
        <button type="button" class="flixratings-btn-keep-primary" id="btnCreateKeepNote">
          <span>📝 Crea Nota Automatica</span>
        </button>
        <button type="button" class="flixratings-btn-keep-secondary" id="btnCopyAgain">
          <span>📋 Ricopia</span>
        </button>
      </div>
    `;

    document.body.appendChild(banner);

    // Event listeners
    document.getElementById('btnCloseKeepBanner').addEventListener('click', () => {
      banner.remove();
    });

    document.getElementById('btnCopyAgain').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(data.text);
        const btn = document.getElementById('btnCopyAgain');
        btn.textContent = '✓ Copiato!';
        setTimeout(() => { btn.textContent = '📋 Ricopia'; }, 1800);
      } catch (e) {}
    });

    document.getElementById('btnCreateKeepNote').addEventListener('click', () => {
      autoInsertIntoKeep(data);
    });
  }

  function autoInsertIntoKeep(data) {
    // 1. Try to find the "Take a note..." / "Crea una nota..." container
    const newNoteBox = document.querySelector(
      'div[role="textbox"], .IZ65Hb-n0tgYd, div[contenteditable="true"], div[aria-label*="nota" i], div[aria-label*="note" i]'
    );

    if (newNoteBox) {
      newNoteBox.click();
      newNoteBox.focus();

      setTimeout(() => {
        // Look for title input
        const titleField = document.querySelector(
          '.IZ65Hb-YPqjbf div[role="textbox"], div[aria-label*="Titolo" i], div[aria-label*="Title" i], div[placeholder*="Titolo" i]'
        );
        if (titleField) {
          titleField.focus();
          document.execCommand('insertText', false, data.title || '🎬 Netflix - Film e Serie Da Vedere');
        }

        // Look for body input
        const bodyField = document.querySelector(
          '.IZ65Hb-QQbox div[contenteditable="true"], div[aria-label*="nota" i][contenteditable="true"], div[aria-label*="note" i][contenteditable="true"]'
        ) || newNoteBox;

        if (bodyField) {
          bodyField.focus();
          document.execCommand('insertText', false, data.text);
        }

        const banner = document.getElementById('flixratings-keep-banner');
        if (banner) {
          banner.querySelector('.flixratings-banner-body').innerHTML = '<strong>✓ Nota inserita!</strong> Puoi aggiungere promemoria o etichette prima di salvarla.';
        }
      }, 350);
    } else {
      // If Keep DOM structure has shifted, notify user to paste
      alert('FlixRatings: Il testo della lista è nei tuoi appunti! Clicca su "Crea una nota..." in Google Keep e premi Ctrl + V.');
    }
  }

  console.log('[FlixRatings] Google Keep assistant active.');
})();
