const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const PORT = Number(process.env.SEARCH_PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SEARCH_TIMEOUT_MS = 5000;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map();
const pendingSearches = new Map();
const imageCache = new Map();

function decodeHtml(value) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeResultUrl(value) {
  try {
    const url = new URL(value, 'https://duckduckgo.com');
    const target = url.searchParams.get('uddg');
    return target ? decodeURIComponent(target) : url.href;
  } catch {
    return value;
  }
}

function extractResults(html) {
  const results = [];
  const pattern = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>)/g;
  let match;

  while ((match = pattern.exec(html)) && results.length < 20) {
    const url = normalizeResultUrl(match[1]);
    if (!/^https?:\/\//i.test(url)) continue;
    results.push({
      title: decodeHtml(match[2]),
      url,
      displayUrl: new URL(url).hostname.replace(/^www\./, ''),
      snippet: decodeHtml(match[3] || match[4] || 'Open this result to learn more.')
    });
  }

  return results;
}

async function search(query) {
  const cached = searchCache.get(query);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  searchCache.delete(query);

  if (pendingSearches.has(query)) return pendingSearches.get(query);

  const endpoint = new URL('https://html.duckduckgo.com/html/');
  endpoint.searchParams.set('q', query);
  const request = fetch(endpoint, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; OrbitSearch/1.0; +http://localhost)'
    },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Search provider returned ${response.status}`);
      const results = extractResults(await response.text());
      searchCache.set(query, { results, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
      if (searchCache.size > 100) searchCache.delete(searchCache.keys().next().value);
      return results;
    })
    .finally(() => pendingSearches.delete(query));

  pendingSearches.set(query, request);
  return request;
}

async function imageSearch(query) {
  const cached = imageCache.get(query);
  if (cached && cached.expiresAt > Date.now()) return cached.results;

  const endpoint = new URL('https://commons.wikimedia.org/w/api.php');
  endpoint.search = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '24',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '420',
    format: 'json',
    origin: '*'
  });
  const response = await fetch(endpoint, {
    headers: { 'User-Agent': 'OrbitSearch/1.0 (search application)' },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error(`Image provider returned ${response.status}`);

  const data = await response.json();
  const results = Object.values(data.query?.pages || []).map((page) => {
    const info = page.imageinfo?.[0];
    const metadata = info?.extmetadata || {};
    return {
      title: page.title.replace(/^File:/, ''),
      thumbnail: info?.thumburl || info?.url,
      source: info?.descriptionurl,
      author: metadata.Artist?.value?.replace(/<[^>]+>/g, '') || 'Wikimedia Commons'
    };
  }).filter((result) => result.thumbnail && result.source);
  imageCache.set(query, { results, expiresAt: Date.now() + SEARCH_CACHE_TTL_MS });
  return results;
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

function serveFile(response, requestPath) {
  const relativePath = requestPath === '/'
    ? 'index.html'
    : requestPath === '/search'
      ? 'search.html'
      : requestPath === '/about'
        ? 'about.html'
        : requestPath.slice(1);
  const filePath = path.resolve(PUBLIC_DIR, relativePath);
  if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  const contentTypes = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html' };
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Could not read file');
      return;
    }
    response.writeHead(200, {
      'Content-Type': `${contentTypes[path.extname(filePath)] || 'application/octet-stream'}; charset=utf-8`
    });
    response.end(content);
  });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/api/search') {
    const query = requestUrl.searchParams.get('q')?.trim();
    if (!query) {
      sendJson(response, 400, { error: 'Enter a search term to get started.' });
      return;
    }
    if (query.length > 300) {
      sendJson(response, 400, { error: 'Searches must be 300 characters or fewer.' });
      return;
    }

    try {
      const results = await search(query);
      sendJson(response, 200, { query, results });
    } catch (error) {
      console.error(`Search failed: ${error.message}`);
      sendJson(response, 502, { error: 'Search is temporarily unavailable. Please try again.' });
    }
    return;
  }

  if (requestUrl.pathname === '/api/images') {
    const query = requestUrl.searchParams.get('q')?.trim();
    if (!query) {
      sendJson(response, 400, { error: 'Enter a search term to find images.' });
      return;
    }
    if (query.length > 300) {
      sendJson(response, 400, { error: 'Searches must be 300 characters or fewer.' });
      return;
    }
    try {
      sendJson(response, 200, { query, results: await imageSearch(query) });
    } catch (error) {
      console.error(`Image search failed: ${error.message}`);
      sendJson(response, 502, { error: 'Image search is temporarily unavailable.' });
    }
    return;
  }

  if (request.method !== 'GET') {
    response.writeHead(405);
    response.end('Method not allowed');
    return;
  }

  serveFile(response, requestUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Orbit Search is ready at http://localhost:${PORT}`);
});
