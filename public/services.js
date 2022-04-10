import {
  openDB,
} from "https://cdn.jsdelivr.net/npm/idb@7/+esm";

export const loadDomainInfo = (domain) => fetch(
  `/api/Domain/tlsInfo?domain=${domain}`
).then((ret) => ret.json());

const DB_NAME = "TLS_DASHBOARD";
const STORE_NAME = "DOMAIN";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    const s = db.createObjectStore(STORE_NAME, {
      keyPath: "domain",
    });
    s.createIndex("validTo", "validTo");
  },
});

export const loadDomainList = async () => {
  const db = await dbPromise;
  return db.getAll(STORE_NAME);
};

export const saveDomain = async (domainInfo) => {
  const db = await dbPromise;
  return db.put(STORE_NAME, domainInfo);
};

export const removeDomain = async (domain) => {
  const db = await dbPromise;
  return db.delete(STORE_NAME, domain);
};
