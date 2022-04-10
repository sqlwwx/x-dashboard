import {
  html,
  useState,
  useEffect,
  render,
} from "https://cdn.jsdelivr.net/npm/htm/preact/standalone.module.js";
import { loadDomainList, saveDomain, removeDomain } from './services.js'

const ENTER_KEY = 13;

const loadDomainInfo = (domain) =>
  fetch(`/api/Domain/tlsInfo?domain=${domain}`).then((ret) => ret.json());

const App = () => {
  const [domainList, setDomainList] = useState([]);
  const [domainInputValue, setDomainInputValue] = useState("");
  useEffect(() => {
    loadDomainList().then((d) => {
      if (d.length) {
        setDomainList(d);
      }
    });
  }, []);
  const onAdd = () => {
    if (!domainInputValue) {
      return;
    }
    const isExist = domainList.find(
      ({ domain }) => domain === domainInputValue
    );
    if (!isExist) {
      loadDomainInfo(domainInputValue).then((info) => {
        setDomainList((list) => {
          const result = list.concat(info);
          saveDomain(info)
          return result;
        });
      });
    }
  };

  return html`
    <section
      class="px-4 sm:px-6 lg:px-4 xl:px-6 pt-4 pb-4 sm:pb-6 lg:pb-4 xl:pb-6 space-y-4"
    >
      <header class="flex items-center justify-between">
        <h2 class="text-lg leading-6 font-medium text-black">域名证书检查</h2>
      </header>
      <div class="relative">
        <svg
          width="20"
          height="20"
          fill="currentColor"
          class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        >
          <path
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
          />
        </svg>
        <input
          class="focus:border-light-blue-500 focus:ring-1 focus:ring-light-blue-500 focus:outline-none w-full text-sm text-black placeholder-gray-500 border border-gray-200 rounded-md py-2 pl-10"
          type="text"
          aria-label="Filter domains"
          placeholder="搜索域名"
          value=${domainInputValue}
          onInput=${(e) => {
            setDomainInputValue(e.target.value);
          }}
          onKeyDown=${(e) => {
            if (e.which === ENTER_KEY) {
              onAdd();
            }
          }}
        />
      </div>
      <ul
        class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        ${domainList
          .filter(
            (v) => !domainInputValue || v.domain.includes(domainInputValue)
          ).sort((a, b) => a.validTo - b.validTo)
          .map(
            (domainInfo, index) => html`
              <li
                key=${domainInfo.domain}
                class="group block rounded-lg p-4 border border-gray-200"
              >
                <h1>${domainInfo.domain}</h1>
                <h3>
                  过期时间：${domainInfo.validTo
                    ? new Date(domainInfo.validTo).toLocaleString()
                    : "-"}
                </h3>
                <h3>
                  同步时间：${domainInfo.timestamp
                    ? new Date(domainInfo.timestamp).toLocaleString()
                    : "-"}
                </h3>
                <div class="flex px-4 py-4 space-x-4 overflow-x-auto bg-white rounded-md justify-end">
                  <div>
                  </div>
                  <button
                    onClick=${() => {
                      loadDomainInfo(domainInfo.domain).then((info) => {
                        saveDomain(info)
                        const result = domainList.map((d) => {
                          if (d.domain === info.domain) {
                            return info;
                          }
                          return d;
                        });
                        setDomainList(result);
                      });
                    }}
                    class="flex items-center px-2 py-2 font-medium tracking-wide text-white capitalize transition-colors duration-200 transform bg-indigo-600 rounded-md hover:bg-indigo-500 focus:outline-none focus:bg-indigo-500">
                    <svg class="w-5 h-5 mx-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"></path></svg>
                    <span class="mx-1">刷新</span>
                  </button>
                  <button
                    class="px-4 py-2 text-red-200 bg-red-500 rounded-md hover:bg-red-400 focus:outline-none focus:bg-red-400"
                    onClick=${() => {
                      setDomainList((list) => {
                        const result = list.filter(
                          ({ domain }) => domain !== domainInfo.domain
                        );
                        removeDomain(domainInfo.domain)
                        return result;
                      });
                    }}
                  >
                    删除
                  </button>
                </div>
              </li>
            `
          )}
      </ul>
    </section>
  `;
};

render(html`<${App} />`, document.body);
