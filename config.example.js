// Copy this file to config.local.js and fill in your values.
// config.local.js is gitignored.
window.EV_CONFIG = {
  // Google Apps Script web app deployment URL
  GAS_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',

  // Shared token — must match SHARED_TOKEN in gas/Code.gs
  // This is a capability token, not a true secret. Rotate if leaked.
  TOKEN: 'replace-with-a-random-string',
};
