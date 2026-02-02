const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

const SUPPORTED_LANGS = ["ru", "en", "uk"];
const THEME_CLASSES = ["theme-dark", "theme-light", "theme-blue", "theme-green", "theme-violet", "theme-amber"];
const THEME_META = {
  "theme-dark": "#08111d",
  "theme-light": "#f6f8fc",
  "theme-blue": "#071326",
  "theme-green": "#031a16",
  "theme-violet": "#150929",
  "theme-amber": "#1c1202",
  "theme-system": ""
};
const RELEASE_VERSION = "1.4.0";
const RELEASE_LABEL_PREFIX = "release ";
const MEGA_FOLDER_URL = "https://mega.nz/folder/bEsXXKAa#HMylvXhNvKVMD-bn9eGv-Q";
const MEGA_PROXY_URL = "https://r.jina.ai/https://mega.nz/folder/bEsXXKAa%23HMylvXhNvKVMD-bn9eGv-Q";
const REMOTE_VERSION_PATTERNS = [
  /release[\s:-]*([0-9]+\.[0-9]+\.[0-9]+)/i,
  /v([0-9]+\.[0-9]+\.[0-9]+)/i
];
const UPDATE_STATUS_KEYS = {
  idle: "updates.status.idle",
  checking: "updates.status.checking",
  current: "updates.status.current",
  available: "updates.status.available",
  error: "updates.status.error"
};
const UPDATE_LABEL_KEYS = {
  idle: "updates.label.current",
  checking: "updates.label.checking",
  current: "updates.label.current",
  available: "updates.label.available",
  error: "updates.label.error"
};
const UPDATE_FALLBACK_MESSAGES = {
  idle: "You have the latest version installed.",
  checking: "Checking updates...",
  current: "No updates found. Running {version}.",
  available: "Update available! Latest version {remote}.",
  error: "Could not check updates. Try again later."
};
const UPDATE_FALLBACK_LABELS = {
  idle: "Up to date",
  checking: "Checking...",
  current: "Up to date",
  available: "Update available",
  error: "Error"
};
const STORAGE_KEYS = {
  theme: "auralis_theme",
  lang: "auralis_lang",
  showIp: "auralis_show_ip"
};

let locales = {};
let currentLang = detectInitialLang();
let currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || "theme-dark";
let ipState = "idle";
let ipFetchController = null;
const navMap = new Map();
const updateState = {
  status: "idle",
  remoteVersion: RELEASE_VERSION
};

document.addEventListener("DOMContentLoaded", () => {
  initYear();
  initSplash();
  initReleaseTag();
  initThemeSwitch();
  initLanguageSelect();
  initRevealAnimation();
  initHeaderShadow();
  initSectionHighlight();
  initCursorGlow();
  initIpPanel();
  initUpdateChecker();
  initBrowserMonitor();
  initMailLink();

  window.addEventListener("load", () => {
    window.requestAnimationFrame(() => {
      document.body.classList.remove("is-preload");
    });
  });

  window.addEventListener("scroll", handleHeaderShadow, { passive: true });

  loadLocales()
    .catch(() => {
      // Silent fallback to default markup
    })
    .finally(() => {
      applyI18n(currentLang);
      updateThemeButtons(currentTheme);
    });
});

function detectInitialLang() {
  const stored = localStorage.getItem(STORAGE_KEYS.lang);
  if (stored && SUPPORTED_LANGS.includes(stored)) {
    return stored;
  }
  const navigatorLang = (navigator.language || "ru").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(navigatorLang) ? navigatorLang : "ru";
}

function initYear() {
  const yearNode = $("#year");
  if (yearNode) {
    yearNode.textContent = new Date().getFullYear().toString();
  }
}

function initSplash() {
  const splash = $("#splash");
  if (!splash) return;
  setTimeout(() => splash.classList.add("hidden"), 900);
  setTimeout(() => {
    splash.remove();
  }, 1800);
}

function initReleaseTag() {
  const releaseTag = $("#releaseTag");
  if (releaseTag) {
    releaseTag.textContent = `${RELEASE_LABEL_PREFIX}${RELEASE_VERSION}`;
  }
}

function initThemeSwitch() {
  const themeButtons = $$(".theme-btn");
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.theme));
  });

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  attachMediaListener(prefersDark, () => {
    if (currentTheme === "theme-system") {
      applySystemTheme();
      updateThemeMeta("theme-system");
    }
  });

  setTheme(currentTheme, { skipTransition: true });
}

function setTheme(theme, options = {}) {
  if (!theme) return;
  currentTheme = theme;
  const body = document.body;
  body.classList.remove(...THEME_CLASSES);

  if (theme === "theme-system") {
    applySystemTheme();
  } else {
    body.classList.add(theme);
  }

  if (!options.skipTransition) {
    body.classList.add("theme-transition");
    setTimeout(() => body.classList.remove("theme-transition"), 500);
  }

  localStorage.setItem(STORAGE_KEYS.theme, theme);
  updateThemeButtons(theme);
  updateThemeMeta(theme);
}

function applySystemTheme() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
  document.body.classList.remove("theme-dark", "theme-light");
  document.body.classList.add(prefersDark.matches ? "theme-dark" : "theme-light");
}

function updateThemeButtons(theme) {
  $$(".theme-btn").forEach((btn) => {
    const isActive = btn.dataset.theme === theme;
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  });

  if (theme === "theme-system") {
    const systemBtn = $('.theme-btn[data-theme="theme-system"]');
    if (systemBtn) {
      systemBtn.setAttribute("aria-pressed", "true");
    }
  }
}

function updateThemeMeta(theme) {
  const meta = $("#themeMeta");
  if (!meta) return;
  let color = THEME_META[theme];

  if (!color && theme !== "theme-system") {
    color = THEME_META["theme-dark"];
  }

  if (theme === "theme-system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    color = prefersDark ? THEME_META["theme-dark"] : THEME_META["theme-light"];
  }

  if (color) {
    meta.setAttribute("content", color);
  }
}

function initLanguageSelect() {
  const select = $("#langSelect");
  if (!select) return;
  select.value = currentLang;
  select.addEventListener("change", (event) => {
    const nextLang = (event.target.value || "").toLowerCase();
    if (SUPPORTED_LANGS.includes(nextLang)) {
      applyI18n(nextLang);
    }
  });
}

async function loadLocales() {
  const response = await fetch("locales.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Failed to load locales");
  }
  locales = await response.json();
}

function applyI18n(language) {
  if (!SUPPORTED_LANGS.includes(language)) {
    language = "ru";
  }
  currentLang = language;
  localStorage.setItem(STORAGE_KEYS.lang, language);
  document.documentElement.lang = language;

  const dict = locales[language] || {};

  $$("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    const attr = node.getAttribute("data-i18n-attr");
    const value = resolveKey(dict, key);
    if (value === undefined || value === null) return;
    if (attr) {
      node.setAttribute(attr, value);
    } else {
      node.textContent = value;
    }
  });

  const description = resolveKey(dict, "meta.description");
  const title = resolveKey(dict, "meta.title");
  const titleNode = document.querySelector("title[data-i18n]");
  if (titleNode && title) {
    titleNode.textContent = title;
    document.title = title;
  }
  if (description) {
    const descriptionNode = document.querySelector('meta[name="description"]');
    if (descriptionNode) {
      descriptionNode.setAttribute("content", description);
    }
  }

  renderUpdateState(updateState.status, updateState);
  updateIpStatusLabel();
}

function resolveKey(source, path) {
  return path.split(".").reduce((acc, part) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, part)) {
      return acc[part];
    }
    return undefined;
  }, source);
}

function translate(key, fallback = "") {
  const dict = locales[currentLang] || {};
  const value = resolveKey(dict, key);
  return typeof value === "string" ? value : fallback;
}

function formatTemplate(template, params = {}) {
  if (typeof template !== "string") {
    return "";
  }
  return template.replace(/\{(\w+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(params, token)) {
      return params[token];
    }
    return match;
  });
}

function initRevealAnimation() {
  const targets = $$(".reveal");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
  );

  targets.forEach((target) => observer.observe(target));
}

function initHeaderShadow() {
  handleHeaderShadow();
}

function handleHeaderShadow() {
  const header = $("#siteHeader");
  if (!header) return;
  const isScrolled = (document.documentElement.scrollTop || document.body.scrollTop) > 12;
  header.classList.toggle("site-header--shadow", isScrolled);
}

function initSectionHighlight() {
  const navLinks = $$("#mainNav a[data-section]");
  if (!navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveLink(entry.target.id);
        }
      });
    },
    { threshold: 0.45, rootMargin: "-25% 0px -45% 0px" }
  );

  navLinks.forEach((link) => {
    const sectionId = link.dataset.section;
    const section = document.getElementById(sectionId);
    if (section) {
      navMap.set(sectionId, link);
      observer.observe(section);
    }
  });

  setActiveLink(navLinks[0].dataset.section);
}

function setActiveLink(id) {
  navMap.forEach((link, key) => {
    const isActive = key === id;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function initCursorGlow() {
  const glow = $("#cursorGlow");
  if (!glow) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    glow.remove();
    return;
  }

  let pointerX = 0;
  let pointerY = 0;
  let rafId = null;

  function updatePosition() {
    glow.style.opacity = "1";
    glow.style.transform = `translate3d(${pointerX - glow.offsetWidth / 2}px, ${pointerY - glow.offsetHeight / 2}px, 0)`;
    rafId = null;
  }

  window.addEventListener(
    "pointermove",
    (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updatePosition);
      }
    },
    { passive: true }
  );

  window.addEventListener(
    "pointerleave",
    () => {
      glow.style.opacity = "0";
    },
    { passive: true }
  );
}

function initBrowserMonitor() {
  const fpsEl = $("#monitorFps");
  const memoryEl = $("#monitorMemory");
  const networkEl = $("#monitorNetwork");
  const networkUnitEl = $("#monitorNetworkUnit");

  if (!fpsEl || !memoryEl || !networkEl || !networkUnitEl) {
    return;
  }

  let frames = 0;
  let lastTimestamp = performance.now();
  let lastUpdate = performance.now();

  function loop(now) {
    frames += 1;
    if (now - lastUpdate >= 1000) {
      const fps = Math.max(1, Math.round((frames * 1000) / (now - lastUpdate)));
      fpsEl.textContent = Number.isFinite(fps) ? String(fps) : "--";
      frames = 0;
      lastUpdate = now;
    }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  function updateMemory() {
    const perfMemory = performance.memory;
    if (perfMemory && typeof perfMemory.usedJSHeapSize === "number") {
      const usedMb = perfMemory.usedJSHeapSize / (1024 * 1024);
      memoryEl.textContent = usedMb >= 10 ? usedMb.toFixed(0) : usedMb.toFixed(1);
      return;
    }
    if (navigator.deviceMemory && typeof navigator.deviceMemory === "number") {
      const approxMb = navigator.deviceMemory * 1024;
      memoryEl.textContent = approxMb.toFixed(0);
      return;
    }
    memoryEl.textContent = translate("hero.console.monitorUnavailable", "--");
  }

  function updateNetwork() {
    const fallbackOnline = translate("hero.console.networkFallback", "online");
    const offlineLabel = translate("hero.console.networkOffline", "offline");
    const unitMs = translate("hero.console.networkUnit", "ms");
    const unitMbps = translate("hero.console.networkUnitAlt", "Mbps");

    if (!navigator.onLine) {
      networkEl.textContent = "--";
      networkUnitEl.textContent = offlineLabel;
      networkUnitEl.dataset.state = "offline";
      return;
    }

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    networkUnitEl.dataset.state = "online";
    if (connection && typeof connection.rtt === "number" && connection.rtt > 0) {
      networkEl.textContent = String(Math.round(connection.rtt));
      networkUnitEl.textContent = unitMs;
      return;
    }
    if (connection && typeof connection.downlink === "number" && connection.downlink > 0) {
      networkEl.textContent = connection.downlink.toFixed(1);
      networkUnitEl.textContent = unitMbps;
      return;
    }
    networkEl.textContent = fallbackOnline;
    networkUnitEl.textContent = "";
  }

  updateMemory();
  updateNetwork();

  setInterval(updateMemory, 3000);
  setInterval(updateNetwork, 3000);

  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (connection && typeof connection.addEventListener === "function") {
    connection.addEventListener("change", updateNetwork, { passive: true });
  }
}

function initMailLink() {
  const mailLink = $("#mailLink");
  if (!mailLink) return;

  mailLink.addEventListener("click", () => {
    const address = mailLink.dataset.mail || mailLink.textContent.trim();
    if (!address) return;

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(address).catch(() => {});
    }

    const existingToast = document.querySelector(".mail-toast");
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement("div");
    toast.className = "mail-toast";
    toast.textContent = formatTemplate(
      translate("footer.mailToast", "Email: {mail}"),
      { mail: address }
    );
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 2600);
  });
}

function initIpPanel() {
  const toggle = $("#showIpToggle");
  const panel = $("#ipPanel");
  const ipValue = $("#ipValue");
  const statusText = $("#ipStatusText");
  const statusBar = $("#ipStatus");

  if (!toggle || !panel || !ipValue || !statusText || !statusBar) return;

  const saved = localStorage.getItem(STORAGE_KEYS.showIp) === "1";
  toggle.checked = saved;
  panel.hidden = !saved;

  if (saved) {
    startIpLoading();
    fetchIp();
  }

  toggle.addEventListener("change", () => {
    const isEnabled = toggle.checked;
    localStorage.setItem(STORAGE_KEYS.showIp, isEnabled ? "1" : "0");
    panel.hidden = !isEnabled;
    if (isEnabled) {
      startIpLoading();
      fetchIp();
    } else {
      if (ipFetchController) {
        ipFetchController.abort();
        ipFetchController = null;
      }
      ipState = "idle";
      panel.classList.remove("active");
      ipValue.textContent = "--.--.--.--";
      ipValue.classList.add("shimmer");
      updateIpStatusLabel();
    }
  });
}

function initUpdateChecker() {
  const button = $("#checkUpdatesButton");
  const message = $("#updateMessage");
  const statusText = $("#updateStatusText");
  const statusBar = $("#updateStatus");
  if (!button || !message || !statusText || !statusBar) {
    return;
  }

  button.addEventListener("click", handleCheckUpdates);
  renderUpdateState(updateState.status, updateState);
}

async function handleCheckUpdates() {
  const button = $("#checkUpdatesButton");
  if (!button || updateState.status === "checking") {
    return;
  }

  setUpdateState("checking");
  button.disabled = true;
  button.setAttribute("aria-disabled", "true");

  try {
    const latestVersion = await fetchLatestVersion();
    if (latestVersion) {
      updateState.remoteVersion = latestVersion;
    }
    if (latestVersion && latestVersion !== RELEASE_VERSION) {
      setUpdateState("available", { remoteVersion: latestVersion });
    } else {
      setUpdateState("current", { remoteVersion: latestVersion || RELEASE_VERSION });
    }
  } catch (error) {
    console.warn("Update check failed:", error);
    setUpdateState("error");
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-disabled");
  }
}

async function fetchLatestVersion() {
  const sources = [MEGA_PROXY_URL, MEGA_FOLDER_URL];
  let lastError;

  for (const url of sources) {
    try {
      if (!url) continue;
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const text = await response.text();
      const parsedVersion = parseVersionFromSource(text);
      if (parsedVersion) {
        return parsedVersion;
      }
      lastError = new Error("Version not found in response");
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
}

function parseVersionFromSource(text) {
  if (!text) return null;
  for (const pattern of REMOTE_VERSION_PATTERNS) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function setUpdateState(status, options = {}) {
  updateState.status = status;
  if (Object.prototype.hasOwnProperty.call(options, "remoteVersion")) {
    updateState.remoteVersion = options.remoteVersion;
  }
  renderUpdateState(status, updateState);
}

function renderUpdateState(status, context = {}) {
  const messageEl = $("#updateMessage");
  const statusEl = $("#updateStatus");
  const statusTextEl = $("#updateStatusText");
  const replacements = {
    version: RELEASE_VERSION,
    remote: context.remoteVersion || RELEASE_VERSION
  };

  const messageKey = UPDATE_STATUS_KEYS[status] || UPDATE_STATUS_KEYS.idle;
  const labelKey = UPDATE_LABEL_KEYS[status] || UPDATE_LABEL_KEYS.idle;
  const messageTemplate = translate(messageKey, UPDATE_FALLBACK_MESSAGES[status] || "");
  const labelTemplate = translate(labelKey, UPDATE_FALLBACK_LABELS[status] || "");

  if (messageEl) {
    messageEl.textContent = formatTemplate(messageTemplate, replacements);
    messageEl.classList.add("muted");
    messageEl.classList.remove("state-available", "state-error");
    if (status === "available") {
      messageEl.classList.add("state-available");
    } else if (status === "error") {
      messageEl.classList.add("state-error");
    }
  }

  if (statusTextEl) {
    statusTextEl.textContent = formatTemplate(labelTemplate, replacements);
  }

  if (statusEl) {
    statusEl.classList.remove("status-online", "status-sync", "status-error");
    if (status === "checking") {
      statusEl.classList.add("status-sync");
    } else if (status === "error") {
      statusEl.classList.add("status-error");
    } else {
      statusEl.classList.add("status-online");
    }
  }
}

function startIpLoading() {
  const panel = $("#ipPanel");
  const ipValue = $("#ipValue");
  if (!panel || !ipValue) return;
  ipState = "loading";
  panel.classList.remove("active");
  ipValue.textContent = "........";
  ipValue.classList.add("shimmer");
  updateIpStatusLabel();
}

async function fetchIp() {
  const panel = $("#ipPanel");
  const ipValue = $("#ipValue");
  if (!panel || !ipValue) return;

  if (ipFetchController) {
    ipFetchController.abort();
  }
  ipFetchController = new AbortController();

  try {
    const response = await fetch("https://api.ipify.org?format=json", {
      signal: ipFetchController.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    ipValue.textContent = data?.ip || "--.--.--.--";
    ipState = data?.ip ? "ready" : "error";
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    ipValue.textContent = "--.--.--.--";
    ipState = "error";
  } finally {
    panel.classList.add("active");
    ipValue.classList.remove("shimmer");
    updateIpStatusLabel();
    ipFetchController = null;
  }
}

function updateIpStatusLabel() {
  const statusText = $("#ipStatusText");
  const statusBar = $("#ipStatus");
  if (!statusText || !statusBar) return;

  let statusKey = "settings.ipStatus";
  if (ipState === "ready") {
    statusKey = "settings.ipStatusReady";
  } else if (ipState === "error") {
    statusKey = "settings.ipStatusError";
  }

  const dict = locales[currentLang] || {};
  const translated = resolveKey(dict, statusKey);
  if (translated) {
    statusText.textContent = translated;
  }

  statusBar.classList.toggle("status-online", ipState === "ready");
  statusBar.classList.toggle("status-error", ipState === "error");
  statusBar.classList.toggle("status-sync", ipState !== "ready");
}

function attachMediaListener(mediaQuery, handler) {
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", handler);
  } else if (typeof mediaQuery.addListener === "function") {
    mediaQuery.addListener(handler);
  }
}
