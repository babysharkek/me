import { BareMuxConnection } from '@mercuryworkshop/bare-mux';

const wispUrl = (location.protocol === "https:" ? "wss" : "ws") + "://" + location.host + "/wisp/";

let _bmc: BareMuxConnection | null = null;

function getBmc(): BareMuxConnection {
    if (!_bmc) _bmc = new BareMuxConnection("/baremux/worker.js");
    return _bmc;
}

async function initTransport(): Promise<void> {
    try {
        await getBmc().setTransport('/libcurl/index.mjs', [{ wisp: wispUrl }]);
    } catch (e) {
        console.warn('[bolt] Transport init failed:', e);
    }
}

export const swReady = new Promise<void>(async (resolve) => {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
            if (!navigator.serviceWorker.controller) {
                await Promise.race([
                    new Promise<void>(r => {
                        navigator.serviceWorker.addEventListener('controllerchange', () => r(), { once: true });
                    }),
                    new Promise<void>(r => setTimeout(r, 6000))
                ]);
            }
        } catch (e) {
            console.warn('[bolt] SW registration failed:', e);
        }
    }

    await initTransport();
    resolve();
});

setInterval(async () => {
    try {
        const current = await getBmc().getTransport();
        if (!current) {
            console.log('[bolt] Transport dead — resetting');
            await initTransport();
        }
    } catch {
        // retry next interval
    }
}, 25_000);

function getProxyEngine(): string {
    try {
        const settings = JSON.parse(window.top?.localStorage.getItem('bolt-settings') || '{}');
        return settings.proxyEngine || 'scramjet';
    } catch {
        return 'scramjet';
    }
}

function encodeUrl(url: string): string {
    const engine = getProxyEngine();

    if (engine === 'ultraviolet') {
        const encoded = uvXorEncode(url);
        return '/maths/' + encoded;
    }

    return '/$/' + encodeURIComponent(url);
}

function uvXorEncode(str: string): string {
    if (!str) return str;
    let result = '';
    for (let i = 0; i < str.length; i++) {
        if (i % 2) {
            result += String.fromCharCode(str.charCodeAt(i) ^ 2);
        } else {
            result += str[i];
        }
    }
    return encodeURIComponent(result);
}

function decodeProxiedUrl(proxiedUrl: string): string {
    const engine = getProxyEngine();

    if (engine === 'ultraviolet' && proxiedUrl.includes('/maths/')) {
        const encoded = proxiedUrl.split('/maths/')[1];
        if (encoded) {
            return uvXorDecode(encoded);
        }
    }

    if (proxiedUrl.includes('/$/')) {
        return decodeURIComponent(proxiedUrl.split('/$/')[1] || proxiedUrl);
    }

    return proxiedUrl;
}

function uvXorDecode(str: string): string {
    if (!str) return str;
    let [input, ...search] = str.split('?');

    let decodedInput = decodeURIComponent(input);
    let result = '';
    for (let i = 0; i < decodedInput.length; i++) {
        if (i % 2) {
            result += String.fromCharCode(decodedInput.charCodeAt(i) ^ 2);
        } else {
            result += decodedInput[i];
        }
    }
    return result + (search.length ? '?' + search.join('?') : '');
}

function isProxiedUrl(url: string): boolean {
    return url.includes('/$/') || url.includes('/maths/');
}

function getProxyPrefix(): string {
    return getProxyEngine() === 'ultraviolet' ? '/maths/' : '/$/';
}

const dummyProxy = {
    encodeUrl,
    decodeProxiedUrl,
    isProxiedUrl,
    getProxyPrefix,
    getProxyEngine,
};

export default dummyProxy;
