/**
 * Gem Miner — Background Service Worker
 *
 * MV3 requires a service_worker entry. This file handles
 * lifecycle events; all heavy logic lives in the popup and content scripts.
 */

self.addEventListener('install',  () => self.skipWaiting());
self.addEventListener('activate', e  => e.waitUntil(self.clients.claim()));
