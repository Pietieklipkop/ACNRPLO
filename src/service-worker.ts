/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `acnrplo-cache-v${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	// Pre-cache static immutable assets
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => sw.skipWaiting())
	);
});

sw.addEventListener('activate', (event) => {
	// Clean up outdated cache versions
	event.waitUntil(
		caches.keys().then(async (keys) => {
			for (const key of keys) {
				if (key !== CACHE_NAME) {
					await caches.delete(key);
				}
			}
			// Clean any dynamic or __data.json entries that might have leaked into CACHE_NAME
			const currentCache = await caches.open(CACHE_NAME);
			const cachedRequests = await currentCache.keys();
			for (const req of cachedRequests) {
				const u = new URL(req.url);
				if (!ASSETS.includes(u.pathname) && !u.pathname.startsWith('/_app/immutable/')) {
					await currentCache.delete(req);
				}
			}
			await sw.clients.claim();
		})
	);
});

// Clear cache on demand (e.g., account swap or logout)
sw.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'CLEAR_CACHES') {
		event.waitUntil(
			caches.keys().then(async (keys) => {
				for (const key of keys) {
					await caches.delete(key);
				}
				const cache = await caches.open(CACHE_NAME);
				await cache.addAll(ASSETS);
			})
		);
	}
});

sw.addEventListener('fetch', (event) => {
	// Ignore non-GET requests
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	// Ignore requests from other origins
	if (url.origin !== sw.location.origin) return;

	// Dynamic data, auth endpoints, and SvelteKit data fetches MUST NEVER be cached
	if (
		url.pathname.startsWith('/api/') ||
		url.pathname.includes('__data.json') ||
		url.pathname === '/login' ||
		url.pathname === '/logout' ||
		url.pathname.startsWith('/set-password') ||
		url.pathname.startsWith('/invite')
	) {
		// Bypass service worker completely - let browser fetch directly from network
		return;
	}

	// For static immutable build assets: Cache-First strategy
	const isStaticAsset = ASSETS.includes(url.pathname) || url.pathname.startsWith('/_app/immutable/');
	if (isStaticAsset) {
		event.respondWith(
			caches.match(event.request).then((cached) => {
				return (
					cached ||
					fetch(event.request).then((response) => {
						if (response.status === 200) {
							const clone = response.clone();
							caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
						}
						return response;
					})
				);
			})
		);
		return;
	}

	// For HTML navigation requests: Network-First with Offline Fallback
	// NOTE: We do NOT store dynamic authenticated HTML in CacheStorage so account switches never see stale HTML!
	if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(
			fetch(event.request, { cache: 'no-cache' }).catch(() => {
				return new Response(
					`<!DOCTYPE html>
					<html lang="en">
					<head>
						<meta charset="utf-8">
						<meta name="viewport" content="width=device-width, initial-scale=1">
						<title>ACNRPLO — Offline Mode</title>
						<style>
							body { font-family: system-ui, sans-serif; background: #19281D; color: #FFFFFF; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 1.5rem; text-align: center; }
							.box { max-width: 420px; background: rgba(255,255,255,0.06); padding: 2rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.1); }
							h1 { font-size: 1.5rem; color: #E8A838; margin-top: 0; }
							p { font-size: 0.9rem; color: #A0B0A4; line-height: 1.5; }
							button { margin-top: 1rem; background: #2D4733; border: 1px solid #4B7051; color: #FFF; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer; }
						</style>
					</head>
					<body>
						<div class="box">
							<h1>ACNRPLO Offline Mode</h1>
							<p>You are currently in an area of Atherstone Nature Reserve with no cellular signal. Live data will resume once connection is restored.</p>
							<button onclick="window.location.reload()">Retry Connection</button>
						</div>
					</body>
					</html>`,
					{ headers: { 'Content-Type': 'text/html' } }
				);
			})
		);
		return;
	}

	// All other requests: bypass service worker (Network-Only)
	return;
});
