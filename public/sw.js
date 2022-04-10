const CDN_URL = 'https://cdn.jsdelivr.net'

const DB_NAME = "TLS_DASHBOARD";
const STORE_NAME = "DOMAIN";

let dbPromise

let index = 0

const sleep = timeout => new Promise(resolve => setTimeout(resolve, timeout))

self.addEventListener('periodicsync', event => {
  checkDomainsTls()
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(`${self.location.origin}`),
  );
}, false);

const checkDomainsTls = async () => {
  const db = await dbPromise
  let list = await db.getAll(STORE_NAME)
  await list.reduce(async (promise, { domain }) => {
    await promise
    try {
      const info = await fetch(`/api/Domain/tlsInfo?domain=${domain}`)
        .then((ret) => ret.json());
      await db.put(STORE_NAME, info);
    } catch (err) {
      console.error(err)
    }
    await sleep(100)
  }, Promise.resolve([]))
  list = await db.getAll(STORE_NAME)
  const notifyList = list.filter(
    d => d.validTo < (Date.now() + 30 * 24 * 60 * 60 * 1000)
  )
  if (notifyList.length) {
    self.registration.showNotification(`域名即将过期提醒`, {
      tag: notifyList.map(d => d.domain).join('-'),
      data: { time: Date.now() },
      requireInteraction: true,
      icon: '/favicon.ico',
      body: `${notifyList.map(
        d => `${d.domain}  ${new Date(d.validTo).toLocaleDateString()}`).join('\n')
        }`
    })
  }
}

const init = async () => {
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
