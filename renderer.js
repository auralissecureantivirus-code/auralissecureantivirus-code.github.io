/* ====== Утилиты ====== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

let locales = {};
const supportedLangs = ["ru", "en", "uk"];
let lang = (localStorage.getItem("lang") || (navigator.language || "ru").slice(0, 2)).toLowerCase();
if (!supportedLangs.includes(lang)) lang = "ru";

const savedTheme = localStorage.getItem("theme") || "theme-dark";

/* ====== Инициализация ====== */
document.addEventListener("DOMContentLoaded", () => {
  $("#year").textContent = new Date().getFullYear();

  initTheme(savedTheme);
  loadLocales();

  // переключатели тем
  $$(".theme-btn").forEach(b => b.addEventListener("click", () => setTheme(b.dataset.theme)));

  // язык
  $("#langSelect")?.addEventListener("change", e => applyI18n(e.target.value));

  // IP переключатель
  const ipToggle = $("#showIpToggle");
  const ipPanel = $("#ipPanel");
  const ipValue = $("#ipValue");
  const ipPref = localStorage.getItem("show_ip") === "1";

  if (ipToggle) {
    ipToggle.checked = ipPref;
    ipPanel.hidden = !ipPref;
    if (ipPref) fetchIp();
    ipToggle.addEventListener("change", () => {
      const on = ipToggle.checked;
      localStorage.setItem("show_ip", on ? "1" : "0");
      ipPanel.hidden = !on;
      if (on) fetchIp();
    });
  }
});

/* ====== Локализация ====== */
async function loadLocales() {
  try {
    const res = await fetch("locales.json");
    locales = await res.json();
    applyI18n(lang);
    const sel = $("#langSelect");
    if (sel) sel.value = lang;
  } catch (err) {
    console.warn("Не удалось загрузить локали:", err);
  }
}

function applyI18n(l) {
  const dict = locales[l] || {};
  $$("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    const v = k.split(".").reduce((o, k2) => o && o[k2], dict);
    if (v) el.textContent = v;
  });
  $$("[data-i18n-placeholder]").forEach(el => {
    const k = el.getAttribute("data-i18n-placeholder");
    const v = k.split(".").reduce((o, k2) => o && o[k2], dict);
    if (v) el.placeholder = v;
  });
  document.documentElement.lang = l;
  localStorage.setItem("lang", l);
  lang = l;
}

/* ====== Темы ====== */
function initTheme(theme) {
  setTheme(theme);
  if (theme === "theme-system") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.onchange = () => applySystemTheme();
  }
}

function applySystemTheme() {
  document.body.classList.remove("theme-light", "theme-dark", "theme-green", "theme-blue", "theme-violet", "theme-yellow");
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  document.body.classList.add(mq.matches ? "theme-dark" : "theme-light");
}

function setTheme(theme) {
  document.body.classList.remove("theme-light", "theme-dark", "theme-green", "theme-blue", "theme-violet", "theme-yellow", "theme-system");
  if (theme === "theme-system") {
    applySystemTheme();
  } else {
    document.body.classList.add(theme);
  }
  localStorage.setItem("theme", theme);
}

/* ====== IP ====== */
async function fetchIp() {
  try {
    const ipValue = $("#ipValue");
    ipValue.textContent = "…";
    const r = await fetch("https://api.ipify.org?format=json");
    const j = await r.json();
    ipValue.textContent = j.ip || "неизвестно";
  } catch (e) {
    $("#ipValue").textContent = "недоступно";
  }
}
/* === Reveal on scroll === */
(function revealOnScroll(){
  const targets = Array.from(document.querySelectorAll(".section .container > *"));
  targets.forEach(el => el.classList.add("reveal"));

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){ e.target.classList.add("show"); io.unobserve(e.target); }
    });
  }, {threshold: .12});

  targets.forEach(el => io.observe(el));
})();

