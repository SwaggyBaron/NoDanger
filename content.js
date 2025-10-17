// content.js
// Этот скрипт просто вставляет injected.js на страницу

const script = document.createElement("script");
script.src = chrome.runtime.getURL("injected.js"); // наш основной скрипт с TFJS и логикой
script.type = "module"; // можно убрать, если не используем ES-модули
document.documentElement.appendChild(script);