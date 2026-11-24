// Applies the saved theme (or the OS preference) before the app boots so dark mode does not flash
// light. Loaded by a blocking <script> at the start of <body>: the built stylesheet links are in
// <head> by then, and antd-dark.css must sit right after antd.css and before styles.css.
// ThemeService calls window.itqanApplyTheme for later switches; main.ts waits for
// window.itqanThemeReady so NG-ZORRO never renders before its dark styles.
(function () {
  var root = document.documentElement;

  function setMode(theme) {
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-ag-theme-mode', theme);
  }

  function persistThemeCookie(theme) {
    try {
      var secure = window.location && window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = 'theme=' + theme + '; Path=/; Max-Age=31536000; SameSite=Lax' + secure;
    } catch (e) {}
  }

  // Resolves true once antd-dark.css is in, false if it failed (the link is then removed).
  function loadDarkStyles() {
    var link = document.getElementById('antd-dark');
    if (link) {
      if (link.loaded) return link.loaded;
      if (link.sheet) {
        link.loaded = Promise.resolve(true);
        return link.loaded;
      }
      if (document.readyState === 'complete') {
        link.remove();
        link.loaded = Promise.resolve(false);
        return link.loaded;
      }
      link.loaded = new Promise(function (resolve) {
        var settled = false;
        function finish(ok) {
          if (settled) return;
          settled = true;
          if (!ok && link.parentNode) link.remove();
          resolve(ok);
        }
        link.addEventListener(
          'load',
          function () {
            finish(true);
          },
          { once: true }
        );
        link.addEventListener(
          'error',
          function () {
            finish(false);
          },
          { once: true }
        );
        window.addEventListener(
          'load',
          function () {
            finish(!!link.sheet);
          },
          { once: true }
        );
      });
      return link.loaded;
    }
    var links = document.head.querySelectorAll('link[rel="stylesheet"][href*="antd"]');
    var light = null;
    for (var i = links.length - 1; i >= 0; i--) {
      if (links[i].parentElement === document.head && links[i].id !== 'antd-dark') {
        light = links[i];
        break;
      }
    }
    link = document.createElement('link');
    link.id = 'antd-dark';
    link.rel = 'stylesheet';
    link.href = 'antd-dark.css';
    link.loaded = new Promise(function (resolve) {
      link.onload = function () {
        resolve(true);
      };
      link.onerror = function () {
        link.remove();
        resolve(false);
      };
    });
    if (light) light.after(link);
    else document.head.appendChild(link);
    return link.loaded;
  }

  // Resolves with the theme actually on screen: 'light' when antd-dark.css could not load, or
  // when a later switch to light removed it first.
  window.itqanApplyTheme = function (theme) {
    if (theme !== 'dark') {
      var dark = document.getElementById('antd-dark');
      if (dark) dark.remove();
      setMode('light');
      return Promise.resolve('light');
    }
    return loadDarkStyles().then(function (loaded) {
      var applied = loaded && document.getElementById('antd-dark') ? 'dark' : 'light';
      setMode(applied);
      return applied;
    });
  };

  var saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch (e) {}
  if (saved === 'dark' || saved === 'light') {
    persistThemeCookie(saved);
  }
  var prefersDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  var initial = saved === 'dark' || (saved !== 'light' && prefersDark) ? 'dark' : 'light';
  // Paint the dark page background at once; NG-ZORRO waits for its styles via itqanThemeReady.
  if (initial === 'dark') setMode('dark');
  window.itqanThemeReady = window.itqanApplyTheme(initial);
})();
