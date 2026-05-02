(function () {
  'use strict';
  var KEY = 'eau_theme_pref';
  var html = document.documentElement;

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    var btn = document.getElementById('themeBtn');
    if (btn) {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
      btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  // Run immediately (before paint) to prevent flash of wrong theme
  var saved = localStorage.getItem(KEY);
  if (saved === 'dark' || saved === 'light') applyTheme(saved);

  document.addEventListener('DOMContentLoaded', function () {
    // Sync icon now that DOM is ready
    var current = html.getAttribute('data-theme') || 'light';
    applyTheme(current);

    var btn = document.getElementById('themeBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var cur = html.getAttribute('data-theme') || 'light';
      var next = cur === 'dark' ? 'light' : 'dark';
      localStorage.setItem(KEY, next);
      applyTheme(next);
    });
  });
}());
