// Backwards-compat shim — moved to js/extensions/ev/stats.js in PR #9.
// Existing imports from `./evStats.js` keep working. Remove after grace period.
export { computeEvStats, monthlyKwhTrend } from './extensions/ev/stats.js';
