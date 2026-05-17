let allGames: any[] = [];
let currentSearch = '';
let currentTab = 'browse';
let favorites: Set<string> = new Set();
let isNavigating = false;

function loadFavorites() {
    try {
        const saved = localStorage.getItem('gameFavorites');
        if (saved) favorites = new Set(JSON.parse(saved));
    } catch (_) {}
}

function saveFavorites() {
    try {
        localStorage.setItem('gameFavorites', JSON.stringify([...favorites]));
    } catch (_) {}
}

function toggleFavorite(gameUrl: string) {
    if (favorites.has(gameUrl)) {
        favorites.delete(gameUrl);
    } else {
        favorites.add(gameUrl);
    }
    saveFavorites();
    if (currentSearch) {
        const filtered = allGames.filter(g => g.name.toLowerCase().includes(currentSearch));
        renderSearchResults(filtered, currentSearch);
    } else {
        renderByCategories(allGames);
    }
}

function categorizeGame(game: any): string[] {
    const name = game.name.toLowerCase();
    const cats: string[] = [];
    if (name.includes('shoot') || name.includes('gun') || name.includes('war') || name.includes('battle') || name.includes('fight') || name.includes('tank') || name.includes('zombie') || name.includes('sniper')) cats.push('Action');
    if (name.includes('adventure') || name.includes('quest') || name.includes('explore')) cats.push('Adventure');
    if (name.includes('puzzle') || name.includes('2048') || name.includes('quiz') || name.includes('sudoku') || name.includes('chess') || name.includes('solitaire') || name.includes('minesweeper')) cats.push('Puzzle');
    if (name.includes('gun') || name.includes('shooting') || name.includes('shot') || name.includes('bullet') || name.includes('fortzone') || name.includes('tank') || name.includes('boom') || name.includes('shooter')) cats.push('Shooting');
    if (name.includes('basketball') || name.includes('football') || name.includes('soccer') || name.includes('golf') || name.includes('sport')) cats.push('Sports');
    if (name.includes('racing') || name.includes('car') || name.includes('drive') || name.includes('moto') || name.includes('kart') || name.includes('drift') || name.includes('polytrack') || name.includes('speed')) cats.push('Racing');
    if (name.includes('run') || name.includes('jump') || name.includes('flappy') || name.includes('slope') || name.includes('dash') || name.includes('vex') || name.includes('parkour')) cats.push('Arcade');
    if (name.includes('tower') || name.includes('defense') || name.includes('strategy') || name.includes('td') || name.includes('bloons')) cats.push('Strategy');
    if (name.includes('.io') || name.includes('multiplayer') || name.includes('online')) cats.push('Multiplayer');
    if (name.includes('fnaf') || name.includes('nights at') || name.includes('freddy') || name.includes('horror') || name.includes('scary')) cats.push('Horror');
    if (name.includes('music') || name.includes('funkin') || name.includes('rhythm') || name.includes('beat')) cats.push('Music');
    if (cats.length === 0) cats.push('Casual');
    return cats;
}

function setupDelegatedListeners() {
    document.body.addEventListener('click', (e) => {
        const favBtn = (e.target as HTMLElement).closest('.fav-btn');
        if (favBtn) {
            e.stopPropagation();
            const url = favBtn.getAttribute('data-url');
            if (url) toggleFavorite(url);
            return;
        }

        const card = (e.target as HTMLElement).closest('.game-card') as HTMLElement;
        if (!card) return;

        const needsProxy = card.getAttribute('data-proxy') === 'true';
        if (needsProxy) {
            const topWindow = window.top as any;
            const originalUrl = card.getAttribute('data-original-url');
            const title = card.querySelector('h3')?.textContent || 'Game';
            const icon = card.querySelector('img')?.getAttribute('src') || '/img/icons/browser.webp';
            if (topWindow && topWindow.Window && originalUrl) {
                new topWindow.Window({ url: `/siterunner?url=${originalUrl}`, title, icon, startMaximized: false });
                return;
            }
        }

        const link = card.getAttribute('data-link');
        if (link) {
            isNavigating = true;
            window.stop();
            window.location.replace(link);
        }
    });
}

const CATEGORY_ORDER = [
    { key: 'Horror',      label: 'Horror' },
    { key: 'Action',      label: 'Action' },
    { key: 'Shooting',    label: 'Shooting' },
    { key: 'Racing',      label: 'Racing' },
    { key: 'Music',       label: 'Music' },
    { key: 'Sports',      label: 'Sports' },
    { key: 'Arcade',      label: 'Arcade' },
    { key: 'Puzzle',      label: 'Puzzle' },
    { key: 'Adventure',   label: 'Adventure' },
    { key: 'Strategy',    label: 'Strategy' },
    { key: 'Multiplayer', label: 'Multiplayer' },
    { key: 'Casual',      label: 'Casual' },
    { key: 'PC Games',    label: 'PC Games' },
];

function renderByCategories(games: any[]) {
    if (isNavigating) return;
    const container = document.getElementById('categories-content');
    if (!container) return;
    container.innerHTML = '';

    // Favorites shelf
    const favGames = games.filter(g => favorites.has(g.url));
    if (favGames.length > 0) {
        container.appendChild(makeCategorySection('Favorites', favGames, false));
    }

    // Per-category shelves
    for (const cat of CATEGORY_ORDER) {
        const catGames = games.filter(g => g.categories.includes(cat.key));
        if (catGames.length > 0) {
            container.appendChild(makeCategorySection(cat.label, catGames, false));
        }
    }
}

function renderAllGames(games: any[]) {
    if (isNavigating) return;
    const container = document.getElementById('categories-content');
    if (!container) return;
    container.innerHTML = '';

    const favGames = games.filter(g => favorites.has(g.url));
    if (favGames.length > 0) {
        container.appendChild(makeCategorySection('Favorites', favGames, true));
    }

    container.appendChild(makeCategorySection('All Games', games, true));
}

function refresh() {
    if (currentSearch) {
        const filtered = allGames.filter(g => g.name.toLowerCase().includes(currentSearch));
        renderSearchResults(filtered, currentSearch);
    } else if (currentTab === 'all') {
        renderAllGames(allGames);
    } else {
        renderByCategories(allGames);
    }
}

function renderSearchResults(games: any[], query: string) {
    if (isNavigating) return;
    const container = document.getElementById('categories-content');
    if (!container) return;
    container.innerHTML = '';

    if (games.length === 0) {
        container.innerHTML = '<p class="no-games-msg">No games found for "' + query + '"</p>';
        return;
    }

    container.appendChild(makeCategorySection('Results', games, true));
}

function makeCategorySection(title: string, games: any[], flat: boolean): HTMLElement {
    const section = document.createElement('section');
    section.className = 'cat-section';
    section.innerHTML = `
        <div class="cat-header">
            <h2 class="cat-title">${title}</h2>
            <span class="cat-count">${games.length}</span>
        </div>
        <div class="cat-row${flat ? ' cat-row-flat' : ''}">
            ${games.map(g => createGameCard(g)).join('')}
        </div>
    `;
    return section;
}

function createGameCard(game: any): string {
    let gameUrl = game.url;
    if (!gameUrl.startsWith('http') && !['sug', 'ran'].includes(gameUrl) && !gameUrl.startsWith('/cdn/games/') && !gameUrl.startsWith('/')) {
        gameUrl = `/cdn/games/${gameUrl}`;
    }

    const link = `/play?url=${encodeURIComponent(gameUrl)}&title=${encodeURIComponent(game.name)}&icon=${encodeURIComponent(game.image)}`;
    const isFav = favorites.has(game.url);

    return `
        <div class="game-card" data-link="${link}" data-original-url="${game.url}" data-proxy="${game.proxy || 'false'}">
            <img
                src="${game.image}"
                alt="${game.name}"
                class="game-image"
                onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
            >
            <div class="game-image-placeholder" style="display:none;">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5.99989 11H9.99989M7.99989 9V13M14.9999 12H15.0099M17.9999 10H18.0099M10.4488 5H13.5509C16.1758 5 17.4883 5 18.5184 5.49743C19.4254 5.9354 20.179 6.63709 20.6805 7.51059C21.2501 8.5027 21.3436 9.81181 21.5306 12.43L21.7766 15.8745C21.8973 17.5634 20.5597 19 18.8664 19C18.0005 19 17.1794 18.6154 16.6251 17.9502L16.2499 17.5C15.9068 17.0882 15.7351 16.8823 15.5398 16.7159C15.1302 16.3672 14.6344 16.1349 14.1043 16.0436C13.8514 16 13.5834 16 13.0473 16H10.9525C10.4164 16 10.1484 16 9.89553 16.0436C9.36539 16.1349 8.86957 16.3672 8.46 16.7159C8.26463 16.8823 8.09305 17.0882 7.74989 17.5L7.37473 17.9502C6.8204 18.6154 5.99924 19 5.13335 19C3.44013 19 2.1025 17.5634 2.22314 15.8745L2.46918 12.43C2.65619 9.81181 2.7497 8.5027 3.31926 7.51059C3.82074 6.63709 4.57433 5.9354 5.48135 5.49743C6.51151 5 7.82396 5 10.4488 5Z"/>
                </svg>
            </div>
            <div style="padding: 0.55rem 0.7rem; display: flex; justify-content: space-between; align-items: center; gap: 0.4rem;">
                <h3>${game.name}</h3>
                <button class="fav-btn" data-url="${game.url}">${isFav ? '★' : '☆'}</button>
            </div>
        </div>
    `;
}

function loadGames() {
    loadFavorites();
    setupDelegatedListeners();

    fetch('/json/games.json')
        .then(r => r.json())
        .then(games => {
            allGames = games
                .filter((game: any) => !['sug', 'ran'].includes(game.url))
                .map((game: any) => ({
                    ...game,
                    categories: (game.categories && game.categories.length > 0)
                        ? game.categories
                        : categorizeGame(game)
                }));

            refresh();

            const searchInput = document.getElementById('searchInput') as HTMLInputElement;
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    currentSearch = searchInput.value.toLowerCase().trim();
                    refresh();
                });
            }

            document.querySelectorAll('.gtab').forEach(btn => {
                btn.addEventListener('click', () => {
                    currentTab = (btn as HTMLElement).dataset.tab || 'browse';
                    document.querySelectorAll('.gtab').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    refresh();
                });
            });
        })
        .catch(err => console.error('Error loading games:', err));
}

loadGames();
