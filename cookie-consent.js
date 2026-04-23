/*!
 * Cookie consent + Google Consent Mode v2 bridge
 * — default DENIED, uložené v localStorage, aktualizuje gtag consent state
 * — GDPR/ePrivacy kompatibilné (bez externej knižnice)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'jbcookie_v1';
  var BRAND_ACCENT = '#c19a5b';
  var BG_DEEP = '#111a11';
  var CREAM = '#f3ede2';

  // Helper — vždy volateľné, aj ak gtag ešte nie je načítaný
  function pushConsent(state) {
    if (typeof window.gtag !== 'function') {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    window.gtag('consent', 'update', state);
  }

  function readStored() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      // Súhlas s expiráciou — 12 mesiacov (bežná prax podľa odporúčaní EÚ DPA)
      if (!obj || !obj.ts) return null;
      var ageMs = Date.now() - obj.ts;
      if (ageMs > 1000 * 60 * 60 * 24 * 365) return null;
      return obj;
    } catch (e) {
      return null;
    }
  }

  function writeStored(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: value,          // 'granted' | 'denied'
        ts: Date.now()
      }));
    } catch (e) { /* ignore — private mode */ }
  }

  function applyConsent(choice) {
    if (choice === 'granted') {
      pushConsent({
        'analytics_storage': 'granted'
      });
    } else {
      pushConsent({
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
        'ad_user_data': 'denied',
        'ad_personalization': 'denied'
      });
    }
  }

  function injectStyles() {
    if (document.getElementById('jb-cookie-styles')) return;
    var css = ''
      + '.jb-cookie{position:fixed;left:1rem;right:1rem;bottom:1rem;z-index:9998;'
      + 'max-width:560px;margin:0 auto;background:' + BG_DEEP + ';color:' + CREAM + ';'
      + 'border:1px solid rgba(193,154,91,0.25);border-radius:6px;'
      + 'box-shadow:0 20px 50px rgba(0,0,0,0.45);'
      + 'padding:1.1rem 1.25rem;font-family:"DM Sans",system-ui,sans-serif;'
      + 'font-size:0.9rem;line-height:1.55;'
      + 'transform:translateY(20px);opacity:0;pointer-events:none;'
      + 'transition:opacity .35s cubic-bezier(.16,1,.3,1),transform .35s cubic-bezier(.16,1,.3,1);}'
      + '.jb-cookie--visible{opacity:1;transform:translateY(0);pointer-events:auto;}'
      + '.jb-cookie__title{font-family:"Cormorant Garamond",Georgia,serif;font-size:1.1rem;font-weight:600;margin-bottom:0.35rem;color:' + CREAM + ';}'
      + '.jb-cookie__text{color:rgba(243,237,226,0.78);margin-bottom:0.85rem;}'
      + '.jb-cookie__text a{color:' + BRAND_ACCENT + ';text-decoration:underline;text-underline-offset:3px;}'
      + '.jb-cookie__actions{display:flex;gap:0.6rem;flex-wrap:wrap;}'
      + '.jb-cookie__btn{font:inherit;font-size:0.85rem;font-weight:500;padding:0.6rem 1.1rem;border-radius:4px;cursor:pointer;border:1px solid transparent;transition:all .3s cubic-bezier(.16,1,.3,1);}'
      + '.jb-cookie__btn--accept{background:' + BRAND_ACCENT + ';color:' + BG_DEEP + ';border-color:' + BRAND_ACCENT + ';}'
      + '.jb-cookie__btn--accept:hover{background:transparent;color:' + BRAND_ACCENT + ';}'
      + '.jb-cookie__btn--reject{background:transparent;color:' + CREAM + ';border-color:rgba(243,237,226,0.22);}'
      + '.jb-cookie__btn--reject:hover{border-color:rgba(193,154,91,0.5);color:' + BRAND_ACCENT + ';}'
      + '@media (max-width:480px){.jb-cookie{left:0.75rem;right:0.75rem;bottom:0.75rem;padding:1rem;}'
      + '.jb-cookie__actions{flex-direction:column-reverse;}.jb-cookie__btn{width:100%;}}';
    var style = document.createElement('style');
    style.id = 'jb-cookie-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildBanner() {
    injectStyles();
    var wrap = document.createElement('div');
    wrap.className = 'jb-cookie';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-labelledby', 'jbCookieTitle');
    wrap.setAttribute('aria-describedby', 'jbCookieText');
    wrap.innerHTML = ''
      + '<p class="jb-cookie__title" id="jbCookieTitle">Cookies na tejto stránke</p>'
      + '<p class="jb-cookie__text" id="jbCookieText">Používame cookies Google Analytics, aby sme rozumeli, ako návštevníci web používajú. Bez tvojho súhlasu sa žiadne analytické cookies nespustia. Svoj výber môžeš kedykoľvek zmeniť v pätičke stránky.</p>'
      + '<div class="jb-cookie__actions">'
      +   '<button type="button" class="jb-cookie__btn jb-cookie__btn--reject" data-jb-cookie="reject">Odmietnuť</button>'
      +   '<button type="button" class="jb-cookie__btn jb-cookie__btn--accept" data-jb-cookie="accept">Akceptovať</button>'
      + '</div>';
    document.body.appendChild(wrap);
    // fade-in na next frame pre animáciu
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { wrap.classList.add('jb-cookie--visible'); });
    });
    return wrap;
  }

  function dismiss(banner) {
    if (!banner) return;
    banner.classList.remove('jb-cookie--visible');
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
    }, 400);
  }

  function showBanner() {
    // Nevytvárať druhý banner
    if (document.querySelector('.jb-cookie')) return;
    var banner = buildBanner();
    banner.addEventListener('click', function (e) {
      var choice = e.target && e.target.getAttribute('data-jb-cookie');
      if (!choice) return;
      var consent = choice === 'accept' ? 'granted' : 'denied';
      writeStored(consent);
      applyConsent(consent);
      dismiss(banner);
    });
  }

  function bindSettingsTriggers() {
    // Tlačidlo "Nastavenia cookies" kdekoľvek na stránke
    document.querySelectorAll('[data-cookie-settings]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        // zmaž uložené rozhodnutie a zobraz banner znova
        try { localStorage.removeItem(STORAGE_KEY); } catch (err) {}
        // reset gtag state na denied pokiaľ používateľ hneď nerozhodne
        applyConsent('denied');
        showBanner();
      });
    });
  }

  function init() {
    var stored = readStored();
    if (stored && (stored.v === 'granted' || stored.v === 'denied')) {
      applyConsent(stored.v);
    } else {
      // Žiadne uložené rozhodnutie — banner sa zobrazí
      showBanner();
    }
    bindSettingsTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
