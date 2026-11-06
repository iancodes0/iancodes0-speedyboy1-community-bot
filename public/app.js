const form = document.querySelector('#search-form');
const input = document.querySelector('#search-input');
const clearButton = document.querySelector('#clear-button');
const suggestions = document.querySelector('#suggestions');
const resultsSection = document.querySelector('#results-section');
const results = document.querySelector('#results');
const resultsLabel = document.querySelector('#results-label');
const resultCount = document.querySelector('#result-count');
const imageResults = document.querySelector('#image-results');
const searchTabs = document.querySelector('.search-tabs');
let currentQuery = '';

function updateClearButton() {
  if (clearButton && input) clearButton.classList.toggle('visible', input.value.length > 0);
}

function renderState(title, message = '') {
  results.innerHTML = `<div class="state"><strong>${escapeHtml(title)}</strong>${escapeHtml(message)}</div>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));
}

function renderResults(data) {
  resultsLabel.textContent = `Results for “${data.query}”`;
  resultCount.textContent = `${data.results.length} results`;
  if (!data.results.length) {
    renderState('No results found', 'Try a different search term or check your spelling.');
    return;
  }
  results.innerHTML = data.results.map((result) => `
    <article class="result">
      <div class="result-url">${escapeHtml(result.displayUrl)}</div>
      <h2><a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(result.title)}</a></h2>
      <p>${escapeHtml(result.snippet)}</p>
    </article>
  `).join('');
}

async function runSearch(query, updateUrl = true) {
  if (!input || !resultsSection || !results || !resultsLabel || !resultCount) return;
  input.value = query;
  currentQuery = query;
  updateClearButton();
  if (suggestions) suggestions.hidden = true;
  resultsSection.hidden = false;
  resultsLabel.textContent = 'Searching the web…';
  resultCount.textContent = '';
  renderState('Finding the best results', 'Searching now…');
  if (updateUrl) history.pushState({ query }, '', `/search?q=${encodeURIComponent(query)}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    renderResults(data);
  } catch (error) {
    resultsLabel.textContent = 'Search unavailable';
    renderState(
      'Search took too long',
      error.name === 'AbortError' ? 'Please try again — the web provider did not respond quickly enough.' : (error.message || 'Please try again in a moment.')
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function runImageSearch(query) {
  if (!imageResults) return;
  currentQuery = query;
  resultsSection.hidden = true;
  imageResults.hidden = false;
  imageResults.innerHTML = '<div class="state"><strong>Finding images</strong>Searching Wikimedia Commons…</div>';
  try {
    const response = await fetch(`/api/images?q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    if (!data.results.length) {
      imageResults.innerHTML = '<div class="state"><strong>No images found</strong>Try a broader search.</div>';
      return;
    }
    imageResults.innerHTML = `<div class="image-grid">${data.results.map((image) => `
      <a class="image-card" href="${escapeHtml(image.source)}" target="_blank" rel="noopener noreferrer">
        <img src="${escapeHtml(image.thumbnail)}" alt="${escapeHtml(image.title)}" loading="lazy">
        <span>${escapeHtml(image.title)}</span>
      </a>
    `).join('')}</div>`;
  } catch (error) {
    imageResults.innerHTML = `<div class="state"><strong>Image search unavailable</strong>${escapeHtml(error.message)}</div>`;
  }
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  if (location.pathname !== '/search') {
    location.href = `/search?q=${encodeURIComponent(query)}`;
    return;
  }
  runSearch(query);
});
input?.addEventListener('input', updateClearButton);
clearButton?.addEventListener('click', () => { input.value = ''; input.focus(); updateClearButton(); });
suggestions?.addEventListener('click', (event) => {
  const query = event.target.dataset.query;
  if (query) runSearch(query);
});
searchTabs?.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (!tab) return;
  event.preventDefault();
  searchTabs.querySelectorAll('[data-tab]').forEach((item) => item.classList.toggle('active', item === tab));
  if (tab.dataset.tab === 'images') runImageSearch(currentQuery || input.value.trim());
  else runSearch(currentQuery || input.value.trim(), false);
});
document.querySelector('#theme-toggle')?.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  localStorage.setItem('orbit-theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
if (localStorage.getItem('orbit-theme') === 'dark') document.body.classList.add('dark');
const initialQuery = new URLSearchParams(location.search).get('q');
if (initialQuery && location.pathname === '/search') runSearch(initialQuery, false);
