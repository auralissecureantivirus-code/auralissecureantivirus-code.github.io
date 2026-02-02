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

const STORAGE_KEYS = {
  theme: "auralisx_theme",
  lang: "auralisx_lang",
  showIp: "auralisx_show_ip"
};

const TAB_IDS = ["overview", "protection", "features", "testing", "guides", "download", "settings"];

let locales = {};
let currentLang = detectInitialLang();
let currentTheme = localStorage.getItem(STORAGE_KEYS.theme) || "theme-dark";
let ipState = "idle";
let ipFetchController = null;
let activeTabId = "overview";

const navMap = new Map();

document.addEventListener("DOMContentLoaded", () => {
  initYear();
  initSplash();
  initReleaseTag();
  initThemeSwitch();
  initLanguageSelect();
  initTabs();
  initHeaderShadow();
  initCursorGlow();
  initIpPanel();
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
      setActiveTab(getTabFromHash() || activeTabId, { pushHash: false, skipAnimation: true });
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
    const systemBtn = $(".theme-btn[data-theme=\"theme-system\"]");
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

  // Ensure section select labels update after language switch.
  const sectionSelect = $("#sectionSelect");
  if (sectionSelect) {
    sectionSelect.value = activeTabId;
  }

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

function initTabs() {
  const navLinks = $$("#mainNav a[data-section]");
  navLinks.forEach((link) => {
    const id = link.dataset.section;
    navMap.set(id, link);

    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (!id) return;
      setActiveTab(id);
    });
  });

  const sectionSelect = $("#sectionSelect");
  if (sectionSelect) {
    sectionSelect.addEventListener("change", (e) => {
      const nextId = (e.target.value || "").trim();
      if (TAB_IDS.includes(nextId)) {
        setActiveTab(nextId);
      }
    });
  }

  window.addEventListener("hashchange", () => {
    const fromHash = getTabFromHash();
    if (fromHash) {
      setActiveTab(fromHash, { pushHash: false });
    }
  });

  const initial = getTabFromHash() || "overview";
  setActiveTab(initial, { pushHash: false, skipAnimation: true });
}

function getTabFromHash() {
  const raw = (window.location.hash || "").replace("#", "");
  if (!raw) return null;
  return TAB_IDS.includes(raw) ? raw : null;
}

function setActiveTab(id, options = {}) {
  if (!TAB_IDS.includes(id) || id === activeTabId) {
    setActiveLink(activeTabId);
    return;
  }

  const currentSection = document.getElementById(activeTabId);
  const nextSection = document.getElementById(id);
  if (!nextSection) return;

  const skipAnimation = Boolean(options.skipAnimation);

  if (currentSection) {
    currentSection.classList.remove("is-active");
    if (!skipAnimation) {
      currentSection.classList.add("is-exiting");
    }
  }

  // Activate next section
  nextSection.classList.add("is-active");
  nextSection.classList.remove("is-exiting");

  activeTabId = id;
  setActiveLink(id);

  const sectionSelect = $("#sectionSelect");
  if (sectionSelect) {
    sectionSelect.value = id;
  }

  if (options.pushHash !== false) {
    history.replaceState(null, "", `#${id}`);
  }

  if (!skipAnimation) {
    runSectionReveal(nextSection);
  } else {
    forceRevealVisible(nextSection);
  }

  // Reset exit class after animation
  if (currentSection && !skipAnimation) {
    setTimeout(() => {
      currentSection.classList.remove("is-exiting");
    }, 420);
  }

  // Keep navigation feeling like tabs
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setActiveLink(id) {
  navMap.forEach((link, key) => {
    const isActive = key === id;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "true" : "false");
  });
}

function forceRevealVisible(section) {
  const nodes = $$(".reveal", section);
  nodes.forEach((node) => node.classList.add("is-visible"));
}

function runSectionReveal(section) {
  const nodes = $$(".reveal", section);
  if (!nodes.length) return;

  // Reset
  nodes.forEach((node) => node.classList.remove("is-visible"));

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    forceRevealVisible(section);
    return;
  }

  window.requestAnimationFrame(() => {
    nodes.forEach((node, index) => {
      const delay = Math.min(260, index * 60);
      setTimeout(() => node.classList.add("is-visible"), delay);
    });
  });
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
    toast.textContent = formatTemplate(translate("footer.mailToast", "Email: {mail}"), { mail: address });
    toast.setAttribute("data-testid", "mail-toast");

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
