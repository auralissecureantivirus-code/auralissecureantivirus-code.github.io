/* i18n + theming + small UX bits */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

const supportedLangs = ["ru","en","uk"];
const defaultLang = (localStorage.getItem("lang") || (navigator.language||"ru").slice(0,2)).toLowerCase();
const initialLang = supportedLangs.includes(defaultLang) ? defaultLang : "ru";

const savedTheme = localStorage.getItem("theme") || "theme-dark";
document.body.classList.remove("theme-light","theme-dark","theme-cyber");
document.body.classList.add(savedTheme);

/** i18n */
let locales = {};
async function loadLocales() {
  const res = await fetch("locales.json");
  locales = await res.json();
  applyI18n(initialLang);
  $("#langSelect").value = initialLang;
}

function applyI18n(lang){
  const dict = locales[lang] || {};
  $$("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    const value = getByPath(dict, key) ?? el.textContent;
    if (value) el.textContent = value;
  });
  $$("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    const value = getByPath(dict, key) ?? el.placeholder;
    if (value) el.placeholder = value;
  });
  document.documentElement.lang = lang;
  localStorage.setItem("lang", lang);
}

function getByPath(obj, path){
  return path.split(".").reduce((o,k)=> (o&&o[k]!==undefined)?o[k]:undefined, obj);
}

/** theme switching */
$$(".theme-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const theme = btn.dataset.theme;
    document.body.classList.remove("theme-light","theme-dark","theme-cyber");
    document.body.classList.add(theme);
    localStorage.setItem("theme", theme);
  });
});

/** language select */
$("#langSelect").addEventListener("change", (e)=> applyI18n(e.target.value));

/** small runtime */
$("#year").textContent = new Date().getFullYear().toString();

/** boot */
loadLocales();
