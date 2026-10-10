# Chrome Web Store Listing — FlixRatings

> Last Updated: 2026-10-04

## Store Listing

**Extension Name** [REQUIRED]
FlixRatings - IMDb & Rotten Tomatoes per Netflix

**Short Description** [REQUIRED]
Mostra i rating IMDb, Rotten Tomatoes e Metacritic su film e serie TV direttamente nel feed e nelle anteprime di Netflix.

**Detailed Description** [REQUIRED]
Smetti di perdere tempo a cercare su Google le recensioni prima di scegliere cosa guardare!

FlixRatings arricchisce la tua esperienza di navigazione su Netflix integrando le valutazioni della critica e del pubblico direttamente all'interno dell'interfaccia.

Caratteristiche principali:
- Voti IMDb istantanei: visualizza la valutazione IMDb su ciascuna locandina del feed Netflix.
- Supporto Rotten Tomatoes & Metacritic: visualizza le percentuali di gradimento e i punteggi Metascore.
- Nessuna registrazione necessaria: funziona subito senza configurazione grazie al motore pubblico gratuito integrato.
- Supporto OMDb API: puoi collegare facoltativamente la tua chiave gratuita OMDb per dati critici aggiuntivi.
- Anteprime intelligenti: passando il mouse su un titolo, il riquadro di anteprima mostra il rating dettagliato, i voti totali, i generi e i premi vinti.
- Clicca per aprire su IMDb: cliccando sul badge si apre direttamente la scheda ufficiale dell'opera.
- Evidenziazione capolavori: i film e le serie con voto pari o superiore a 8.0 vengono evidenziati con un elegante bordo dorato.
- Prestazioni elevate: sistema di caricamento asincrono con IntersectionObserver e cache locale per uno scorrimento fluido a 60 FPS senza rallentamenti.

Come si usa:
1. Installa l'estensione.
2. Apri Netflix o aggiorna la scheda attiva.
3. Le valutazioni appariranno automaticamente sulle locandine e nei riquadri informativi.
4. Clicca sull'icona dell'estensione per personalizzare posizione, visibilità o collegare la tua chiave API.

Privacy e Sicurezza:
FlixRatings non raccoglie dati personali, non traccia la cronologia di navigazione e non condivide alcuna informazione con terze parti. Le query alle API avvengono esclusivamente per recuperare le valutazioni dei titoli mostrati.

**Category** [REQUIRED]
Fun

**Single Purpose** [REQUIRED]
Visualizza le valutazioni di IMDb, Rotten Tomatoes e Metacritic direttamente sui titoli presenti nel feed di Netflix.

**Primary Language** [REQUIRED]
Italian

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | icons/icon-128.png |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Utilizzato per memorizzare localmente le impostazioni dell'utente (come la posizione dei badge) e la cache delle valutazioni per evitare richieste di rete ridondanti. |
| `tabs` | permissions | Utilizzato unicamente nel popup di configurazione per ricaricare o trovare la scheda Netflix aperta quando l'utente clicca su "Aggiorna scheda Netflix". |
| `*://*.netflix.com/*` | host_permissions | Necessario per iniettare lo script e il foglio di stile all'interno delle pagine di navigazione di Netflix ed evidenziare i rating sulle locandine. |
| `https://v3.sg.media-imdb.com/*` | host_permissions | Necessario per trovare l'ID IMDb corrispondente ai titoli mostrati nel feed Netflix. |
| `https://v3-cinemeta.strem.io/*` | host_permissions | Necessario per recuperare il punteggio IMDb e i metadati della critica tramite endpoint pubblico senza autenticazione. |
| `https://www.omdbapi.com/*` | host_permissions | Necessario per consentire agli utenti che desiderano aggiungere Rotten Tomatoes e Metacritic di interrogare l'API OMDb con la propria chiave. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Distribution

**Visibility**: Public  
**Regions**: All regions  
**Pricing**: Free  

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.6.0 | 2026-10-10 | Nuova gestione Watchlist Da Vedere ed esportazione note in Google Keep con link minimale e voti. | Draft |
| 0.5.0 | 2026-10-08 | Rilascio iniziale con supporto IMDb, Rotten Tomatoes, caching locale e bob-card preview. | Draft |
