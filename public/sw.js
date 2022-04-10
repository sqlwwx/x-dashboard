const CDN_URL = 'https://cdn.jsdelivr.net'

const DB_NAME = "TLS_DASHBOARD";
const STORE_NAME = "DOMAIN";

let dbPromise

let index = 0

self.addEventListener('periodicsync', event => {
  checkDomainsTls()
})

const checkDomainsTls = async () => {
  const db = await dbPromise
  const list = await db.getAll(STORE_NAME)
  self.registration.showNotification(`test ${index += 1}`, {
    tag: 'test',
    data: { time: Date.now() },
    requireInteraction: true,
    body: `test: ${new Date()}`
  })
}

const init= async () => {
  self.importScripts(`${CDN_URL}/npm/idb@7.0.1/build/umd.js`)
  dbPromise = self.idb.openDB(DB_NAME, 1, {
    upgrade(db) {
      const s = db.createObjectStore(STORE_NAME, {
        keyPath: "domain",
      });
      s.createIndex("validTo", "validTo");
    },
  });
}

(() => {
  const version = '0.0.1'
  self.importScripts(`${CDN_URL}/npm/workbox-cdn/workbox/workbox-sw.js`)
  if (!self.workbox) {
    console.log(`Boo! Workbox didn't load 😬`);
    return
  }
  const { workbox } = self
  console.log(`Yay! Workbox is loaded 🎉`);
  workbox.setConfig({
    // debug: true,
    modulePathPrefix: `${CDN_URL}/npm/workbox-cdn/workbox/`
  });
  workbox.core.clientsClaim();
  workbox.core.skipWaiting();
  workbox.precaching.cleanupOutdatedCaches();
  const {
    routing: { registerRoute },
    strategies: {
      NetworkOnly, CacheOnly,
      NetworkFirst,
      CacheFirst,
      StaleWhileRevalidate
    },
    cacheableResponse: {
      CacheableResponsePlugin
    },
    expiration: {
      ExpirationPlugin
    }
  } = workbox;

  registerRoute(
    /.*\.(css|js)/,
    new StaleWhileRevalidate({
      cacheName: 'static-assets-cache-' + version,
    })
  )
    registerRoute(
    /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
    new CacheFirst({
      cacheName: 'img-v1',
      plugins: [
        new ExpirationPlugin({
          maxEntries: 20,
          maxAgeSeconds: 7 * 24 * 60 * 60,
        })
      ]
    })
  );

  const defaultStrategy = new NetworkFirst({
    cacheName: 'default',
    options: [{
      networkTimeoutSeconds: 2,
    }],
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200]
      }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 60 * 60 * 24 * 7,
        purgeOnQuotaError: true
      }),
    ]
  })

  workbox.routing.setDefaultHandler(defaultStrategy)
  init()
})();
