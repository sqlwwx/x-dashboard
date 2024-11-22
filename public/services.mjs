import { openDB } from "idb";

const request = (uri, options = {}) => {
  const { headers = {}, ...opts } = options;
  return fetch(uri, {
    ...opts,
    headers: {
      ...headers,
      uid: localStorage.uid,
    },
  });
};

export const loadDomainInfo = (domain) =>
  request(`api/Domain/tlsInfo?domain=${domain}`).then((ret) => ret.json());

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

export const sync = async () => {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration.sync) {
      registration.sync.register("sync-domains");
      setTimeout(sync, 60000 * 60 * 2);
    }
  }
};

export const exportCsv = async () => {
  const list = await loadDomainList();
  let csv = `domain\n`;
  csv += list.map(({ domain }) => domain).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "domain.csv");
  link.click();
  link.addEventListener("load", () => {
    URL.revokeObjectURL(url);
  });
};

export const importCsv = async () => {
  const [fileHandle] = await window.showOpenFilePicker({
    types: [
      {
        description: "CSV",
        accept: { "text/csv": [".csv"] },
      },
    ],
    multiple: false,
  });
  const content = await fileHandle.getFile().then((file) => file.text());
  const domainList = content.split("\n").slice(1);
  const existDomainMap = await loadDomainList().then((list) =>
    Object.fromEntries(list.map((d) => [d.domain, d]))
  );
  while (domainList.length) {
    const domain = domainList.shift();
    if (!existDomainMap[domain]) {
      try {
        await saveDomain(await loadDomainInfo(domain));
      } catch (error) {
        console.error(error)
      }
    }
  }
  window.location.reload();
};

sync();
