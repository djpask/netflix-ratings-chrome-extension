// FlixRatings - Background Service Worker (Manifest V3)

const EXTENSION_VERSION = '0.6.0';

// In-flight request deduplication map
const inFlightRequests = new Map();

// In-memory cache for ultra-fast response during the active session
const memoryCache = new Map();

// Request queue with concurrency control
const MAX_CONCURRENT_REQUESTS = 5;
let activeRequests = 0;
const queue = [];

// Automatic schema upgrade & cache sanitization on startup
(async () => {
  try {
    const { schemaVersion } = await chrome.storage.local.get(['schemaVersion']);
    const all = await chrome.storage.local.get(null);
    const toRemove = [];

    // Purge bad legacy queries or upgrade cache if needed
    for (const key of Object.keys(all)) {
      if (key.startsWith('rating_')) {
        const titlePart = key.replace('rating_', '');
        if (titlePart.includes('riproduci') || 
            titlePart.includes('play') || 
            titlePart.includes('altre_info') || 
            titlePart.length < 2) {
          toRemove.push(key);
        }
      }
    }

    if (toRemove.length > 0) {
      await chrome.storage.local.remove(toRemove);
      console.log(`[FlixRatings v${EXTENSION_VERSION}] Cleaned ${toRemove.length} invalid cache keys.`);
    }

    if (schemaVersion !== EXTENSION_VERSION) {
      await chrome.storage.local.set({ schemaVersion: EXTENSION_VERSION });
    }
  } catch (e) {
    console.warn('[FlixRatings] Startup cache migration error:', e);
  }
})();

function enqueueRequest(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS || queue.length === 0) {
    return;
  }

  activeRequests++;
  const { fn, resolve, reject } = queue.shift();

  try {
    const result = await fn();
    resolve(result);
  } catch (err) {
    reject(err);
  } finally {
    activeRequests--;
    processQueue();
  }
}

// Clean and normalize Netflix title string
function cleanTitle(raw) {
  if (!raw) return '';
  let title = raw.trim();

  // Strip Netflix brandings and action prompts
  title = title.replace(/\s*[-–—|]\s*(?:Netflix|Guarda ora|Guarda subito|Watch now|Sito ufficiale).*$/i, '');
  
  // Strip season/part specifications: "Stranger Things: Season 4", "La Casa di Carta: Parte 3"
  title = title.replace(/\s*[:\-\(]\s*(?:Stagione|Parte|Part|Season|Vol\.?|Volume|Capitolo|Chapter)\s*\d+.*$/i, '');
  
  // Strip common year suffixes in parenthesis e.g. "Titolo (2022)"
  title = title.replace(/\s*\(\d{4}\)$/, '');

  return title.trim();
}

function titleToSlug(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Rank candidates from IMDb suggestions to pick the best match
function findBestCandidate(query, candidates) {
  if (!candidates || candidates.length === 0) return null;

  const qLower = query.trim().toLowerCase();
  const qAlpha = qLower.replace(/[^a-z0-9]/g, '');

  // 1. Exact match (case-insensitive)
  for (const c of candidates) {
    const title = (c.l || '').trim().toLowerCase();
    if (title === qLower) {
      return c;
    }
  }

  // 2. Alphanumeric match (ignoring spaces, dashes, colons)
  for (const c of candidates) {
    const titleAlpha = (c.l || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (titleAlpha === qAlpha) {
      return c;
    }
  }

  // 3. Starts with match
  for (const c of candidates) {
    const title = (c.l || '').trim().toLowerCase();
    if (title.startsWith(qLower) || qLower.startsWith(title)) {
      return c;
    }
  }

  return candidates[0];
}

// Fetch by IMDb ID using OMDb API
async function fetchOMDbById(imdbId, apiKey) {
  try {
    const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Response === 'True') {
      let rottenTomatoes = null;
      let metacritic = null;

      if (Array.isArray(data.Ratings)) {
        for (const r of data.Ratings) {
          if (r.Source === 'Rotten Tomatoes') rottenTomatoes = r.Value;
          if (r.Source === 'Metacritic') metacritic = r.Value;
        }
      }
      if (!metacritic && data.Metascore && data.Metascore !== 'N/A') {
        metacritic = `${data.Metascore}/100`;
      }

      return {
        found: true,
        title: data.Title,
        year: data.Year || null,
        imdbId: data.imdbID,
        imdbRating: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : null,
        imdbVotes: data.imdbVotes && data.imdbVotes !== 'N/A' ? data.imdbVotes : null,
        rottenTomatoes,
        metacritic,
        genres: data.Genre ? data.Genre.split(',').map(s => s.trim()) : [],
        awards: data.Awards && data.Awards !== 'N/A' ? data.Awards : null,
        plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : null,
        source: 'omdb'
      };
    }
  } catch (err) {
    console.warn('[FlixRatings] OMDb by ID error:', err);
  }
  return null;
}

// Fetch rating via Cinemeta fallback
async function fetchCinemetaById(imdbId, isSeries) {
  try {
    const kind = isSeries ? 'series' : 'movie';
    const url = `https://v3-cinemeta.strem.io/meta/${kind}/${imdbId}.json`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const m = data.meta || {};
      return {
        found: true,
        title: m.name,
        year: m.year || null,
        imdbId: imdbId,
        imdbRating: m.imdbRating && m.imdbRating !== 'N/A' ? String(m.imdbRating) : null,
        imdbVotes: null,
        rottenTomatoes: null,
        metacritic: null,
        genres: Array.isArray(m.genre) ? m.genre : (m.genre ? [m.genre] : []),
        awards: m.awards || null,
        plot: m.description || null,
        source: 'cinemeta'
      };
    }
  } catch (e) {
    console.warn('[FlixRatings] Cinemeta fallback error:', e);
  }
  return null;
}

// Full rating lookup with candidate matching and OMDb enrichment
async function getRatingForTitle(rawTitle) {
  const cleaned = cleanTitle(rawTitle);
  if (!cleaned) {
    return { found: false, title: rawTitle };
  }

  const cacheKey = `rating_${cleaned.toLowerCase()}`;

  // 1. Check in-memory cache
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey);
  }

  // 2. Check storage cache
  const storageResult = await chrome.storage.local.get([cacheKey]);
  if (storageResult[cacheKey]) {
    const cachedItem = storageResult[cacheKey];
    const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;
    if (Date.now() - (cachedItem.cachedAt || 0) < FOURTEEN_DAYS) {
      memoryCache.set(cacheKey, cachedItem.data);
      return cachedItem.data;
    }
  }

  // 3. Deduplicate in-flight requests
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const fetchPromise = enqueueRequest(async () => {
    const settings = await chrome.storage.local.get(['omdbApiKey', 'enableOmdb']);
    const customKey = (settings.enableOmdb && settings.omdbApiKey) ? settings.omdbApiKey.trim() : null;
    const omdbKey = customKey || 'trilogy';

    let ratingData = null;

    // Step A: Find the accurate IMDb ID via IMDb suggestion endpoint
    const slug = titleToSlug(cleaned);
    let topMatch = null;
    let imdbId = null;
    let isSeries = false;

    if (slug) {
      try {
        const imdbSuggestUrl = `https://v3.sg.media-imdb.com/suggestion/x/${slug}.json`;
        const res = await fetch(imdbSuggestUrl);
        if (res.ok) {
          const data = await res.json();
          const results = data.d || [];
          const valid = results.filter(item => {
            if (!item.id || !item.id.startsWith('tt')) return false;
            const qid = item.qid || '';
            return ['movie', 'tvSeries', 'tvMiniSeries', 'feature', 'tvMovie', 'tvSpecial'].includes(qid);
          });
          if (valid.length > 0) {
            topMatch = findBestCandidate(cleaned, valid);
            if (topMatch) {
              imdbId = topMatch.id;
              isSeries = Boolean(topMatch.qid && topMatch.qid.startsWith('tv'));
            }
          }
        }
      } catch (err) {
        console.warn('[FlixRatings] IMDb suggest error:', err);
      }
    }

    // Step B: If found IMDb ID, query OMDb by ID for ratings, RT, and Metacritic
    if (imdbId) {
      ratingData = await fetchOMDbById(imdbId, omdbKey);

      // If OMDb fails, try fallback key or Cinemeta
      if (!ratingData || !ratingData.imdbRating) {
        if (omdbKey !== 'eb8a3577') {
          ratingData = await fetchOMDbById(imdbId, 'eb8a3577');
        }
      }
      if (!ratingData || !ratingData.imdbRating) {
        ratingData = await fetchCinemetaById(imdbId, isSeries);
      }
    }

    // Step C: Fallback to direct OMDb title search if IMDb ID was not found
    if (!ratingData || !ratingData.found || !ratingData.imdbRating) {
      try {
        const url = `https://www.omdbapi.com/?t=${encodeURIComponent(cleaned)}&apikey=${omdbKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.Response === 'True' && data.imdbRating && data.imdbRating !== 'N/A') {
            const rt = (data.Ratings || []).find(r => r.Source === 'Rotten Tomatoes')?.Value || null;
            const mc = (data.Ratings || []).find(r => r.Source === 'Metacritic')?.Value || 
                       (data.Metascore && data.Metascore !== 'N/A' ? `${data.Metascore}/100` : null);
            ratingData = {
              found: true,
              title: data.Title,
              year: data.Year,
              imdbId: data.imdbID,
              imdbRating: data.imdbRating,
              imdbVotes: data.imdbVotes,
              rottenTomatoes: rt,
              metacritic: mc,
              genres: data.Genre ? data.Genre.split(',').map(s => s.trim()) : [],
              awards: data.Awards || null,
              plot: data.Plot || null,
              source: 'omdb_title'
            };
          }
        }
      } catch (e) {}
    }

    if (!ratingData || !ratingData.imdbRating) {
      ratingData = { found: false, title: cleaned };
    }

    // Cache result
    memoryCache.set(cacheKey, ratingData);
    await chrome.storage.local.set({
      [cacheKey]: {
        cachedAt: Date.now(),
        data: ratingData
      }
    });

    inFlightRequests.delete(cacheKey);
    return ratingData;
  });

  inFlightRequests.set(cacheKey, fetchPromise);
  return fetchPromise;
}

// Clear all cached rating records
async function clearRatingsCache() {
  memoryCache.clear();
  inFlightRequests.clear();
  const allItems = await chrome.storage.local.get(null);
  const keysToRemove = Object.keys(allItems).filter(k => k.startsWith('rating_'));
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  return { success: true, count: keysToRemove.length };
}

// Get count of cached items
async function getCacheStats() {
  const allItems = await chrome.storage.local.get(null);
  const ratingKeys = Object.keys(allItems).filter(k => k.startsWith('rating_'));
  return {
    cachedCount: ratingKeys.length,
    inMemoryCount: memoryCache.size
  };
}

// Test an OMDb API Key
async function testOmdbKey(apiKey) {
  if (!apiKey) return { valid: false, error: 'Chiave API non inserita' };
  try {
    const res = await fetch(`https://www.omdbapi.com/?t=Inception&apikey=${apiKey.trim()}`);
    if (!res.ok) return { valid: false, error: `Errore HTTP ${res.status}` };
    const data = await res.json();
    if (data.Response === 'True') {
      return { valid: true, sampleTitle: data.Title, imdbRating: data.imdbRating };
    } else {
      return { valid: false, error: data.Error || 'Chiave API non valida' };
    }
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// ============================================================================
// Watchlist Management & Google Keep Formatter
// ============================================================================

async function getWatchlist() {
  try {
    const res = await chrome.storage.sync.get(['watchlist']);
    if (Array.isArray(res.watchlist)) return res.watchlist;
  } catch (e) {}
  const local = await chrome.storage.local.get(['watchlist']);
  return Array.isArray(local.watchlist) ? local.watchlist : [];
}

async function saveWatchlist(list) {
  try {
    await chrome.storage.sync.set({ watchlist: list });
  } catch (e) {
    console.warn('[FlixRatings] sync.set failed, falling back to local.set', e);
  }
  await chrome.storage.local.set({ watchlist: list });
}

function formatWatchlistForKeep(list) {
  let out = "🎬 Netflix - Film e Serie Da Vedere\n\n";
  for (const item of list) {
    let line = `☐ ${item.title}`;
    const ratings = [];
    if (item.imdbRating) ratings.push(`IMDb: ${item.imdbRating}`);
    if (item.rottenTomatoes) ratings.push(`🍅 ${item.rottenTomatoes}`);
    if (item.metacritic) ratings.push(`MC: ${String(item.metacritic).replace('/100', '')}`);
    if (ratings.length > 0) {
      line += ` • ${ratings.join(' | ')}`;
    }
    const cleanUrl = item.netflixUrl || (item.netflixId ? `https://www.netflix.com/title/${item.netflixId}` : 'https://www.netflix.com');
    line += ` — ${cleanUrl}`;
    out += line + "\n";
  }
  return out;
}

// Runtime message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  if (message.type === 'GET_RATING') {
    (async () => {
      try {
        const rating = await getRatingForTitle(message.title);
        sendResponse({ success: true, rating });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'TEST_OMDB_KEY') {
    (async () => {
      const result = await testOmdbKey(message.apiKey);
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === 'CLEAR_CACHE') {
    (async () => {
      const result = await clearRatingsCache();
      sendResponse(result);
    })();
    return true;
  }

  if (message.type === 'GET_CACHE_STATS') {
    (async () => {
      const stats = await getCacheStats();
      sendResponse(stats);
    })();
    return true;
  }

  if (message.type === 'GET_WATCHLIST') {
    (async () => {
      try {
        const list = await getWatchlist();
        sendResponse({ success: true, watchlist: list, count: list.length });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'TOGGLE_WATCHLIST') {
    (async () => {
      try {
        const list = await getWatchlist();
        const item = message.item;
        if (!item || !item.title) {
          sendResponse({ success: false, error: 'Titolo non valido' });
          return;
        }

        const existingIdx = list.findIndex(x => 
          (item.netflixId && x.netflixId === item.netflixId) || 
          (x.title && x.title.toLowerCase() === item.title.toLowerCase())
        );

        let inWatchlist = false;
        if (existingIdx >= 0) {
          list.splice(existingIdx, 1);
          inWatchlist = false;
        } else {
          list.unshift({
            netflixId: item.netflixId || null,
            title: item.title,
            year: item.year || null,
            imdbRating: item.imdbRating || null,
            rottenTomatoes: item.rottenTomatoes || null,
            metacritic: item.metacritic || null,
            imdbId: item.imdbId || null,
            netflixUrl: item.netflixUrl || (item.netflixId ? `https://www.netflix.com/title/${item.netflixId}` : 'https://www.netflix.com'),
            addedAt: Date.now()
          });
          inWatchlist = true;
        }

        await saveWatchlist(list);
        sendResponse({ success: true, inWatchlist, count: list.length, item });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'REMOVE_FROM_WATCHLIST') {
    (async () => {
      try {
        let list = await getWatchlist();
        list = list.filter(x => {
          if (message.netflixId && x.netflixId === message.netflixId) return false;
          if (message.title && x.title.toLowerCase() === message.title.toLowerCase()) return false;
          return true;
        });
        await saveWatchlist(list);
        sendResponse({ success: true, count: list.length });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'CLEAR_WATCHLIST') {
    (async () => {
      try {
        await saveWatchlist([]);
        sendResponse({ success: true, count: 0 });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.type === 'GET_WATCHLIST_KEEP_TEXT') {
    (async () => {
      try {
        const list = await getWatchlist();
        const text = formatWatchlistForKeep(list);
        sendResponse({ success: true, text, count: list.length });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
