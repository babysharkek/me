
const settings = JSON.parse(localStorage.getItem("bolt-settings") || "{}");
const searchEngine = settings.searchEngine || 'duckduckgo';
const searchForm = document.querySelector("#search-form") as HTMLFormElement;
const searchInput = document.querySelector("#search-input") as HTMLInputElement;
const suggestionsEl = document.querySelector("#suggestions") as HTMLDivElement;

let searchEngineUrl = '';
switch (searchEngine) {
    case 'duckduckgo': searchEngineUrl = 'https://duckduckgo.com/?q='; break;
    case 'google':     searchEngineUrl = 'https://www.google.com/search?q='; break;
    case 'bing':       searchEngineUrl = 'https://www.bing.com/search?q='; break;
    case 'yahoo':      searchEngineUrl = 'https://search.yahoo.com/search?q='; break;
    case 'brave':      searchEngineUrl = 'https://search.brave.com/search?q='; break;
    default:           searchEngineUrl = 'https://duckduckgo.com/?q='; break;
}

const SITES = [
    { label: 'YouTube',     url: 'https://youtube.com',         hint: 'youtube.com' },
    { label: 'TikTok',      url: 'https://tiktok.com',          hint: 'tiktok.com' },
    { label: 'Gemini',      url: 'https://gemini.google.com',   hint: 'gemini.google.com' },
    { label: 'FlixBaba',    url: 'https://flixbaba.mov',        hint: 'flixbaba.mov' },
    { label: 'JustAnime',   url: 'https://justanime.to',        hint: 'justanime.to' },
    { label: 'CineKada',    url: 'https://cinekada.com',        hint: 'cinekada.com' },
    { label: 'Google',      url: 'https://google.com',          hint: 'google.com' },
    { label: 'Reddit',      url: 'https://reddit.com',          hint: 'reddit.com' },
    { label: 'Instagram',   url: 'https://instagram.com',       hint: 'instagram.com' },
    { label: 'Twitter / X', url: 'https://x.com',              hint: 'x.com' },
    { label: 'Netflix',     url: 'https://netflix.com',         hint: 'netflix.com' },
    { label: 'Twitch',      url: 'https://twitch.tv',           hint: 'twitch.tv' },
    { label: 'Spotify',     url: 'https://open.spotify.com',    hint: 'spotify.com' },
    { label: 'Discord',     url: 'https://discord.com',         hint: 'discord.com' },
    { label: 'GitHub',      url: 'https://github.com',          hint: 'github.com' },
    { label: 'Wikipedia',   url: 'https://wikipedia.org',       hint: 'wikipedia.org' },
    { label: 'ChatGPT',     url: 'https://chat.openai.com',     hint: 'chat.openai.com' },
];

let activeIndex = -1;
let currentItems: HTMLButtonElement[] = [];

function navigate(url: string) {
    window.location.href = '/browser?url=' + encodeURIComponent(url);
}

function navigateQuery(query: string) {
    let dest = '';
    if (query.startsWith('https://') || query.startsWith('http://')) {
        dest = query;
    } else if (query.includes('.') && !query.includes(' ')) {
        dest = 'https://' + query;
    } else {
        dest = searchEngineUrl + encodeURIComponent(query);
    }
    navigate(dest);
}

function closeSuggestions() {
    suggestionsEl.classList.remove('open');
    suggestionsEl.innerHTML = '';
    activeIndex = -1;
    currentItems = [];
}

function showSuggestions(query: string) {
    if (!query) { closeSuggestions(); return; }

    const q = query.toLowerCase();
    const results = SITES.filter(s =>
        s.label.toLowerCase().includes(q) ||
        s.hint.toLowerCase().includes(q)
    ).slice(0, 6);

    if (results.length === 0) { closeSuggestions(); return; }

    suggestionsEl.innerHTML = '';
    currentItems = [];
    activeIndex = -1;

    results.forEach((item) => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-item';
        btn.type = 'button';
        btn.innerHTML = `
            <span class="suggestion-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
            </span>
            <span class="suggestion-label">${item.label}</span>
            <span class="suggestion-hint">${item.hint}</span>
        `;
        btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            navigate(item.url);
        });
        suggestionsEl.appendChild(btn);
        currentItems.push(btn);
    });

    suggestionsEl.classList.add('open');
}

searchInput?.addEventListener('input', () => {
    showSuggestions(searchInput.value.trim());
});

searchInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!suggestionsEl.classList.contains('open')) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = Math.min(activeIndex + 1, currentItems.length - 1);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = Math.max(activeIndex - 1, -1);
    } else if (e.key === 'Escape') {
        closeSuggestions();
        return;
    } else {
        return;
    }

    currentItems.forEach((item, i) => item.classList.toggle('active', i === activeIndex));

    if (activeIndex >= 0) {
        const hint = currentItems[activeIndex].querySelector('.suggestion-hint')?.textContent || '';
        searchInput.value = hint;
    }
});

searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput?.value?.trim();
    if (!query) return;

    if (activeIndex >= 0 && currentItems[activeIndex]) {
        const hintText = currentItems[activeIndex].querySelector('.suggestion-hint')?.textContent || '';
        const matched = SITES.find(s => s.hint === hintText);
        if (matched) { closeSuggestions(); navigate(matched.url); return; }
    }

    closeSuggestions();
    navigateQuery(query);
});

searchInput?.addEventListener('blur', () => {
    setTimeout(closeSuggestions, 150);
});

document.querySelectorAll<HTMLButtonElement>(".quick-link").forEach(btn => {
    btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-url");
        if (url) navigate(url);
    });
});
