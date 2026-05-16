import dummyProxy, { swReady } from "./encoding";

const urlParams = new URLSearchParams(window.location.search);
const url = urlParams.get('url');

// Hide the destination URL from the address bar
history.replaceState(null, '', '/browser');

swReady.then(() => {
    const webSection = document.getElementById('web-section');
    if (!webSection) return;

    const iframe = document.createElement('iframe');
    iframe.className = 'active';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-downloads allow-pointer-lock');
    iframe.setAttribute('allow', 'fullscreen');

    if (url) {
        iframe.src = dummyProxy.encodeUrl(url);
    }

    webSection.appendChild(iframe);
});

export {};
