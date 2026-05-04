// Refined line icons — minimal SVG strings inspired by Lucide/Heroicons.
// Uses currentColor so icons inherit text color from CSS.
// 24×24 viewBox, 1.6px stroke, rounded caps/joins for a premium feel.
//
// To add a new icon:
//   1. Pick a name (kebab-case)
//   2. Add an SVG <path> / <line> / <circle> inside a 24×24 viewBox
//   3. Always use fill="none" stroke="currentColor" stroke-width="1.6"
//      stroke-linecap="round" stroke-linejoin="round"
//   4. If it's for a category, add it to the categories.js `icon` field

const S =
  'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"';
const SVG = (paths) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;

export const ICONS = {
  // ---------- Category icons (daily) ----------
  bolt: SVG(`<polyline points="13,2 4,14 12,14 11,22 20,10 12,10 13,2" ${S}/>`),
  'parking-square': SVG(
    `<rect x="3" y="3" width="18" height="18" rx="3" ${S}/><path d="M9 17V7h4a3 3 0 0 1 0 6H9" ${S}/>`
  ),
  road: SVG(`<path d="M4 20l2-16M20 20l-2-16M12 4v2M12 10v2M12 16v2" ${S}/>`),
  shield: SVG(`<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" ${S}/>`),
  wrench: SVG(`<path d="M14.7 6.3a4 4 0 1 0 3 3l5.1 5.1-3 3-5.1-5.1-3-3-3 3-2-2 3-3 3 3" ${S}/>`),
  droplets: SVG(
    `<path d="M12 2s-4.5 5-4.5 9a4.5 4.5 0 0 0 9 0c0-4-4.5-9-4.5-9z" ${S}/><path d="M5 14a3 3 0 0 0 5 2M19 14a3 3 0 0 1-5 2" ${S}/>`
  ),
  'alert-triangle': SVG(
    `<path d="M12 3l10 18H2L12 3z" ${S}/><line x1="12" y1="10" x2="12" y2="14" ${S}/><circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none"/>`
  ),
  package: SVG(`<path d="M3 7l9-4 9 4v10l-9 4-9-4V7z" ${S}/><path d="M3 7l9 4 9-4M12 11v10" ${S}/>`),

  // ---------- Category icons (one-off mods) ----------
  'paint-brush': SVG(`<path d="M14 4l6 6-8 8-4 2-2-2 2-4 6-10z" ${S}/><path d="M14 4l4 4" ${S}/>`),
  suspension: SVG(
    `<circle cx="12" cy="12" r="3" ${S}/><path d="M12 3v3M12 18v3M4.5 7.5l2 2M17.5 14.5l2 2M4.5 16.5l2-2M17.5 9.5l2-2M3 12h3M18 12h3" ${S}/>`
  ),
  plug: SVG(`<path d="M9 2v6M15 2v6M9 10h6v3a3 3 0 0 1-3 3 3 3 0 0 1-3-3v-3zM12 16v6" ${S}/>`),
  sun: SVG(
    `<circle cx="12" cy="12" r="4" ${S}/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1l2.1-2.1M17 7l2.1-2.1" ${S}/>`
  ),
  camera: SVG(
    `<rect x="3" y="6" width="18" height="14" rx="2" ${S}/><circle cx="12" cy="13" r="4" ${S}/><path d="M9 6l2-3h2l2 3" ${S}/>`
  ),
  layers: SVG(`<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 18l9 5 9-5" ${S}/>`),
  tire: SVG(
    `<circle cx="12" cy="12" r="9" ${S}/><circle cx="12" cy="12" r="3" ${S}/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" ${S}/>`
  ),
  gift: SVG(
    `<rect x="3" y="8" width="18" height="13" rx="1.5" ${S}/><path d="M3 12h18M12 8v13M12 8s-2-4-5-4a2 2 0 0 0 0 4h5zM12 8s2-4 5-4a2 2 0 0 1 0 4h-5z" ${S}/>`
  ),
  sliders: SVG(
    `<line x1="4" y1="6" x2="20" y2="6" ${S}/><line x1="4" y1="12" x2="20" y2="12" ${S}/><line x1="4" y1="18" x2="20" y2="18" ${S}/><circle cx="9" cy="6" r="1.8" ${S}/><circle cx="15" cy="12" r="1.8" ${S}/><circle cx="7" cy="18" r="1.8" ${S}/>`
  ),

  // ---------- Nav / UI ----------
  plus: SVG(`<line x1="12" y1="5" x2="12" y2="19" ${S}/><line x1="5" y1="12" x2="19" y2="12" ${S}/>`),
  edit: SVG(`<line x1="12" y1="5" x2="12" y2="19" ${S}/><line x1="5" y1="12" x2="19" y2="12" ${S}/>`), // same as plus for nav-when-editing; we render with different label
  'pencil-line': SVG(
    `<path d="M17 3l4 4-12 12-6 2 2-6 12-12z" ${S}/><line x1="14" y1="6" x2="18" y2="10" ${S}/>`
  ),
  landmark: SVG(`<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" ${S}/>`),
  'list-check': SVG(
    `<path d="M9 6h12M9 12h12M9 18h12" ${S}/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" ${S}/>`
  ),
  'bar-chart': SVG(
    `<line x1="6" y1="20" x2="6" y2="14" ${S}/><line x1="12" y1="20" x2="12" y2="6" ${S}/><line x1="18" y1="20" x2="18" y2="10" ${S}/><line x1="3" y1="20" x2="21" y2="20" ${S}/>`
  ),
  trash: SVG(
    `<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14M10 11v6M14 11v6" ${S}/>`
  ),
  search: SVG(`<circle cx="11" cy="11" r="7" ${S}/><line x1="16" y1="16" x2="21" y2="21" ${S}/>`),
  download: SVG(`<path d="M12 3v12M7 10l5 5 5-5M5 21h14" ${S}/>`),
  upload: SVG(`<path d="M12 21V9M7 14l5-5 5 5M5 3h14" ${S}/>`),
  'rotate-cw': SVG(`<path d="M21 12a9 9 0 1 1-3-6.7l3 2.7M21 3v6h-6" ${S}/>`),
  'chevron-left': SVG(`<polyline points="15,6 9,12 15,18" ${S}/>`),
  'chevron-right': SVG(`<polyline points="9,6 15,12 9,18" ${S}/>`),
  'chevron-down': SVG(`<polyline points="6,9 12,15 18,9" ${S}/>`),
  x: SVG(`<line x1="6" y1="6" x2="18" y2="18" ${S}/><line x1="18" y1="6" x2="6" y2="18" ${S}/>`),
  inbox: SVG(
    `<path d="M3 15h5l1 2h6l1-2h5M3 15V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" ${S}/>`
  ),
  sparkles: SVG(
    `<path d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM20 14l1 3 3 1-3 1-1 3M4 17l1 2 2 1-2 1-1 2" ${S}/>`
  ),
  'hand-wave': SVG(
    `<path d="M5 9v7a5 5 0 0 0 10 0V5a2 2 0 0 0-4 0v7M15 7a2 2 0 1 1 4 0v7M5 13a2 2 0 0 0 0-4V7a2 2 0 0 0-4 0v6a5 5 0 0 0 .5 2" ${S}/>`
  ),
  utensils: SVG(
    `<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6M16 3c-2 0-3 2-3 5s1 5 3 5v8" ${S}/>`
  ),
};

/**
 * Return the raw SVG markup for an icon.
 * Caller is responsible for wrapping with size/color in CSS (target .ico element).
 * Returns a fallback question-mark box if the icon name is unknown.
 */
export const icon = (name) => {
  if (ICONS[name]) return ICONS[name];
  return SVG(
    `<circle cx="12" cy="12" r="9" ${S}/><path d="M9 9a3 3 0 1 1 5 2c-1 1-2 1-2 3M12 17h.01" ${S}/>`
  );
};
