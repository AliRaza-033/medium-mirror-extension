const DEFAULT_BASE_URL = "https://freedium-mirror.cfd/";

document.addEventListener("DOMContentLoaded", () => {
  const baseUrlInput = document.getElementById("base-url");
  const customDomainsInput = document.getElementById("custom-domains");
  const saveBtn = document.getElementById("save-btn");
  const status = document.getElementById("status");
  const shortcutLabel = document.getElementById("current-shortcut");
  const openShortcutsBtn = document.getElementById("open-shortcuts");

  chrome.storage.sync.get(
    { baseUrl: DEFAULT_BASE_URL, customDomains: [] },
    (result) => {
      baseUrlInput.value = result.baseUrl || DEFAULT_BASE_URL;
      customDomainsInput.value = (result.customDomains || []).join(", ");
    },
  );

  if (chrome.commands && chrome.commands.getAll) {
    chrome.commands.getAll((commands) => {
      const openCommand = commands.find((cmd) => cmd.name === "open-mirror");
      const shortcut =
        openCommand && openCommand.shortcut ? openCommand.shortcut : "Not set";
      shortcutLabel.textContent = `Current shortcut: ${shortcut}`;
    });
  } else {
    shortcutLabel.textContent = "Current shortcut: Not supported";
  }

  openShortcutsBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
  });

  saveBtn.addEventListener("click", () => {
    const baseUrl = baseUrlInput.value.trim();
    const customDomainsRaw = customDomainsInput.value;

    let parsedBaseUrl;
    try {
      parsedBaseUrl = new URL(baseUrl);
      if (!["http:", "https:"].includes(parsedBaseUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      status.textContent = "Please enter a valid base URL (http or https).";
      status.style.color = "#b00020";
      return;
    }

    const customDomains = parseCustomDomains(customDomainsRaw);

    chrome.storage.sync.set(
      {
        baseUrl: parsedBaseUrl.toString(),
        customDomains,
      },
      () => {
        status.textContent = "Saved!";
        status.style.color = "#0a7a2f";
        setTimeout(() => {
          status.textContent = "";
        }, 1500);
      },
    );
  });
});

function parseCustomDomains(input) {
  const entries = input.split(/[\n,]/);
  const cleaned = entries
    .map((entry) => normalizeDomain(entry))
    .filter(Boolean);

  return Array.from(new Set(cleaned));
}

function normalizeDomain(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let host = trimmed;

  if (trimmed.includes("://")) {
    try {
      host = new URL(trimmed).hostname;
    } catch {
      return null;
    }
  } else {
    host = trimmed.split(/[/?#]/)[0];
  }

  const normalized = host.toLowerCase();
  if (!/^[a-z0-9.-]+$/.test(normalized)) {
    return null;
  }

  return normalized;
}
