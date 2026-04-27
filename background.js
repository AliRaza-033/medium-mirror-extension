const DEFAULT_BASE_URL = "https://freedium-mirror.cfd/";
const DISALLOWED_SCHEMES = [
  "chrome://",
  "brave://",
  "edge://",
  "about:",
  "chrome-extension://",
];

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      { baseUrl: DEFAULT_BASE_URL, customDomains: [] },
      (result) => resolve(result),
    );
  });
}

function isAllowedDomain(hostname, customDomains) {
  if (!hostname) {
    return false;
  }

  const normalizedHost = hostname.toLowerCase();

  if (
    normalizedHost === "medium.com" ||
    normalizedHost.endsWith(".medium.com")
  ) {
    return true;
  }

  const allowed = (customDomains || []).map((d) => d.toLowerCase().trim());
  return allowed.some(
    (domain) =>
      domain &&
      (normalizedHost === domain || normalizedHost.endsWith(`.${domain}`)),
  );
}

async function detectMediumOnPage(tabId) {
  if (!tabId) {
    return false;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const alMeta = document.querySelector(
          'meta[property="al:android:url"], meta[property="al:ios:url"]',
        );
        const alContent = alMeta ? alMeta.content || "" : "";
        if (alContent.startsWith("medium://")) {
          return true;
        }

        const appNameMeta = document.querySelector(
          'meta[property="al:ios:app_name"], meta[property="al:android:app_name"]',
        );
        const appName = appNameMeta ? appNameMeta.content || "" : "";
        if (appName.toLowerCase() === "medium") {
          return true;
        }

        const ogSite = document.querySelector('meta[property="og:site_name"]');
        if (
          ogSite &&
          ogSite.content &&
          ogSite.content.toLowerCase() === "medium"
        ) {
          return true;
        }

        const twitterSite = document.querySelector('meta[name="twitter:site"]');
        if (
          twitterSite &&
          twitterSite.content &&
          twitterSite.content.toLowerCase() === "@medium"
        ) {
          return true;
        }

        const generator = document.querySelector('meta[name="generator"]');
        if (
          generator &&
          generator.content &&
          generator.content.toLowerCase().includes("medium")
        ) {
          return true;
        }

        const resourceNodes = document.querySelectorAll(
          "script[src], link[href]",
        );
        for (const node of resourceNodes) {
          const resourceUrl =
            node.getAttribute("src") || node.getAttribute("href") || "";
          if (
            resourceUrl.includes("cdn-client.medium.com") ||
            resourceUrl.includes("medium.com/_/") ||
            resourceUrl.includes("miro.medium.com")
          ) {
            return true;
          }
        }

        const canonical = document.querySelector('link[rel="canonical"]');
        if (
          canonical &&
          canonical.href &&
          canonical.href.includes("medium.com")
        ) {
          return true;
        }

        const rss = document.querySelector(
          'link[rel="alternate"][type="application/rss+xml"]',
        );
        if (rss && rss.href && rss.href.includes("medium.com")) {
          return true;
        }

        const tracking = document.querySelector(
          'meta[name="medium-tracking-context"]',
        );
        if (tracking && tracking.content) {
          return true;
        }

        const isMediumInLd = (node) => {
          if (!node) {
            return false;
          }
          if (Array.isArray(node)) {
            return node.some(isMediumInLd);
          }
          if (typeof node !== "object") {
            return false;
          }

          const publisher =
            node.publisher || (node.isPartOf && node.isPartOf.publisher);
          if (publisher) {
            const name = (publisher.name || "").toLowerCase();
            const url = (publisher.url || publisher["@id"] || "").toLowerCase();
            if (name === "medium" || url.includes("medium.com")) {
              return true;
            }
          }

          const sameAs = node.sameAs || node["@id"];
          if (
            typeof sameAs === "string" &&
            sameAs.toLowerCase().includes("medium.com")
          ) {
            return true;
          }
          if (
            Array.isArray(sameAs) &&
            sameAs.some(
              (entry) =>
                typeof entry === "string" &&
                entry.toLowerCase().includes("medium.com"),
            )
          ) {
            return true;
          }

          return Object.values(node).some(isMediumInLd);
        };

        const ldScripts = document.querySelectorAll(
          'script[type="application/ld+json"]',
        );
        for (const script of ldScripts) {
          const text = script.textContent;
          if (!text) {
            continue;
          }
          try {
            const data = JSON.parse(text);
            if (isMediumInLd(data)) {
              return true;
            }
          } catch {
            // ignore invalid JSON-LD
          }
        }

        return false;
      },
    });

    if (!results || !results.length) {
      return false;
    }

    return Boolean(results[0].result);
  } catch {
    return false;
  }
}

async function shouldAllowTab(tab, customDomains) {
  if (!tab || !tab.url) {
    return false;
  }

  if (DISALLOWED_SCHEMES.some((scheme) => tab.url.startsWith(scheme))) {
    return false;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(tab.url);
  } catch {
    return false;
  }

  if (parsedUrl.protocol !== "https:") {
    return false;
  }

  if (isAllowedDomain(parsedUrl.hostname, customDomains)) {
    return true;
  }

  return await detectMediumOnPage(tab.id);
}

async function openMirrorForTab(tab) {
  const settings = await getSettings();
  const allowed = await shouldAllowTab(tab, settings.customDomains);
  if (!allowed) {
    return;
  }

  let baseUrl = settings.baseUrl || DEFAULT_BASE_URL;
  if (!baseUrl.endsWith("/")) {
    baseUrl += "/";
  }

  const finalUrl = `${baseUrl}${tab.url}`;
  chrome.tabs.create({ url: finalUrl });
}

chrome.action.onClicked.addListener((tab) => {
  openMirrorForTab(tab);
});

if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener((command) => {
    if (command !== "open-mirror") {
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      openMirrorForTab(tabs[0]);
    });
  });
}
