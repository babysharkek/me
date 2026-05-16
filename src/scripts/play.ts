import dummyProxy from "./encoding";

const gameFrame = document.getElementById('game-frame') as HTMLIFrameElement;
const gameContainer = document.getElementById('game-container') as HTMLDivElement;
const fullscreenBtn = document.getElementById('fullscreen-btn') as HTMLButtonElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const fsExpandIcon = document.getElementById('fs-expand-icon') as SVGElement;
const fsShrinkIcon = document.getElementById('fs-shrink-icon') as SVGElement;

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const gameUrl = urlParams.get('url');
const proxy = urlParams.get('proxy');

// Load game
if (gameUrl) {
    if (gameUrl.startsWith('https://') || gameUrl.startsWith('http://') || proxy === "true") {
        gameFrame.src = dummyProxy.encodeUrl(gameUrl);
    } else {
        gameFrame.src = String(gameUrl);
    }
} else {
    console.error('No game URL provided');
}

// Back button
backBtn.addEventListener('click', () => {
    window.location.href = '/games';
});

// Fullscreen
let isFullscreen = false;

fullscreenBtn.addEventListener('click', () => {
    toggleFullscreen();
});

function toggleFullscreen() {
    if (!isFullscreen) {
        if (gameContainer.requestFullscreen) {
            gameContainer.requestFullscreen();
        } else if ((gameContainer as any).webkitRequestFullscreen) {
            (gameContainer as any).webkitRequestFullscreen();
        }
        gameContainer.classList.add('fullscreen');
        isFullscreen = true;
        fsExpandIcon.style.display = 'none';
        fsShrinkIcon.style.display = '';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        }
        gameContainer.classList.remove('fullscreen');
        isFullscreen = false;
        fsExpandIcon.style.display = '';
        fsShrinkIcon.style.display = 'none';
    }
}

// Sync on ESC / external fullscreen exit
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        gameContainer.classList.remove('fullscreen');
        isFullscreen = false;
        fsExpandIcon.style.display = '';
        fsShrinkIcon.style.display = 'none';
    }
});

// F11 shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullscreen();
    }
});
