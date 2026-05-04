// Copy this file to config.local.js and fill in your values.
// config.local.js is gitignored.
window.APP_CONFIG = {
  // Google Apps Script web app deployment URL
  GAS_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',

  // Shared token — must match SHARED_TOKEN in gas/Code.gs
  // Capability token, not a true secret. Rotate if leaked.
  TOKEN: 'replace-with-a-random-string',

  // Built-in category preset. Options: 'general' | 'ev'.
  // Custom categories you create in-app are merged on top.
  CATEGORY_PRESET: 'general',
};

// Legacy alias — older deployments used window.EV_CONFIG. The app reads both
// for backwards compatibility, but new installs should use APP_CONFIG above.
