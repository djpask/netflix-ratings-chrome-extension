# FlixRatings 🎬⭐

[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/djpask/netflix-ratings-chrome-extension/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


**FlixRatings** è un'estensione per Google Chrome (Manifest V3) che aggiunge in tempo reale i voti di **IMDb**, **Rotten Tomatoes** e **Metacritic** a ciascun film e serie TV all'interno del feed di Netflix.

---

## ✨ Funzionalità

- 🌟 **Rating IMDb Diretto**: Badge compatto e moderno posizionato su ogni locandina della home di Netflix.
- 🍅 **Rotten Tomatoes & Metacritic**: Punteggi della critica disponibili sia nelle anteprime che sulle locandine (quando abilitato OMDb).
- ⚡ **Zero Setup Necessario**: Motore pubblico gratuito integrato per IMDb. Funziona immediatamente dopo l'installazione senza richiedere registrazioni.
- 🔍 **Riquadro Anteprima (Bob Card)**: Quando passi sopra una locandina con il mouse, il riquadro espanso mostra il voto IMDb, i voti totali, Rotten Tomatoes, premi vinti e il link diretto alla scheda IMDb.
- 🏆 **Evidenziazione Capolavori**: I titoli con voto IMDb ≥ 8.0 vengono evidenziati con un elegante bordo dorato e un leggero bagliore.
- 🚀 **Prestazioni e Fluidità 60 FPS**: I rating vengono recuperati asincronamente tramite `IntersectionObserver` solo quando i titoli entrano nel viewport dello schermo, con cache locale intelligente (14 giorni) per evitare richieste duplicate.
- 🎛️ **Pannello Impostazioni**: Cliccando sull'icona dell'estensione puoi configurare la posizione dei badge, attivare o disattivare singoli componenti, svuotare la cache o inserire la tua chiave gratuita OMDb.

---

## 🚀 Come installarla su Google Chrome (Subito funzionante)

Poiché hai già Google Chrome aperto con Netflix:

1. Apri una nuova scheda su Google Chrome e digita nella barra degli indirizzi:
   ```text
   chrome://extensions
   ```
2. In alto a destra nella pagina, attiva la levetta **"Modalità sviluppatore"** (o *Developer mode*).
3. In alto a sinistra appariranno dei pulsanti: clicca su **"Carica estensione non pacchettizzata"** (o *Load unpacked*).
4. Seleziona la cartella del progetto:
   ```text
   /home/pask/.gemini/antigravity-ide/scratch/netflix-ratings-chrome-extension
   ```
5. Torna sulla scheda di **Netflix** aperta e premi **F5** (o ricarica la pagina).
6. I rating IMDb appariranno istantaneamente su tutti i film e le serie TV del feed!

---

## 📁 Struttura del Progetto

```text
netflix-ratings-chrome-extension/
├── manifest.json            # Configurazione Manifest V3 (permessi, script, icone)
├── background/
│   └── background.js        # Service Worker: query API, cache storage locale e throttling
├── content/
│   ├── content.js           # Content Script: osservatore DOM, estrazione titoli e iniezione badge
│   └── content.css          # Foglio di stile: badge in glassmorphism, bob-card e modali
├── popup/
│   ├── popup.html           # Interfaccia grafica del popup delle impostazioni
│   ├── popup.css            # Stile moderno dark con accenti Netflix Red e IMDb Gold
│   └── popup.js             # Gestione preferenze, test API key, svuota cache e ricarica
├── icons/                   # Icone ufficiali generate (16x16, 48x48, 128x128 PNG)
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── scripts/
│   └── generate_icons.py    # Script per rigenerare le icone PNG
├── CHROMEWEBSTORE.md        # Documentazione e checklist per il Chrome Web Store
└── README.md                # Guida all'uso e documentazione tecnica
```

---

## 🔑 Configurazione Opzionale OMDb (Rotten Tomatoes & Metacritic)

Di default l'estensione utilizza un motore gratuito che fornisce direttamente i voti di IMDb e i metadati.

Se desideri visualizzare anche la percentuale di gradimento di **Rotten Tomatoes** e il punteggio **Metascore**:
1. Richiedi una chiave API gratuita (1.000 richieste al giorno) su [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).
2. Clicca sull'icona di **FlixRatings** nella barra delle estensioni di Chrome.
3. Attiva lo switch **"Usa OMDb API"**.
4. Incolla la tua chiave e clicca su **"Salva Chiave"** (puoi anche cliccare su "Test Chiave" per verificarne la validità).
