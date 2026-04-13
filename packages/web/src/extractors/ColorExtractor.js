/**
 * ColorExtractor - AC 1-7: Full Color Palette Extraction Pipeline
 * Normalizes CSS colors, analyzes frequency, assigns semantic roles,
 * calculates WCAG contrast, deduplicates, and matches named colors.
 */

const { ExtractionError } = require('../utils/errors');
const logger = require('../utils/logger');

// CSS4 Named Colors — 147 entries per W3C CSS Color Level 4
const CSS4_NAMED_COLORS = {
  aliceblue: '#F0F8FF',
  antiquewhite: '#FAEBD7',
  aqua: '#00FFFF',
  aquamarine: '#7FFFD4',
  azure: '#F0FFFF',
  beige: '#F5F5DC',
  bisque: '#FFE4C4',
  black: '#000000',
  blanchedalmond: '#FFEBCD',
  blue: '#0000FF',
  blueviolet: '#8A2BE2',
  brown: '#A52A2A',
  burlywood: '#DEB887',
  cadetblue: '#5F9EA0',
  chartreuse: '#7FFF00',
  chocolate: '#D2691E',
  coral: '#FF7F50',
  cornflowerblue: '#6495ED',
  cornsilk: '#FFF8DC',
  crimson: '#DC143C',
  cyan: '#00FFFF',
  darkblue: '#00008B',
  darkcyan: '#008B8B',
  darkgoldenrod: '#B8860B',
  darkgray: '#A9A9A9',
  darkgreen: '#006400',
  darkgrey: '#A9A9A9',
  darkkhaki: '#BDB76B',
  darkmagenta: '#8B008B',
  darkolivegreen: '#556B2F',
  darkorange: '#FF8C00',
  darkorchid: '#9932CC',
  darkred: '#8B0000',
  darksalmon: '#E9967A',
  darkseagreen: '#8FBC8F',
  darkslateblue: '#483D8B',
  darkslategray: '#2F4F4F',
  darkslategrey: '#2F4F4F',
  darkturquoise: '#00CED1',
  darkviolet: '#9400D3',
  deeppink: '#FF1493',
  deepskyblue: '#00BFFF',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1E90FF',
  firebrick: '#B22222',
  floralwhite: '#FFFAF0',
  forestgreen: '#228B22',
  fuchsia: '#FF00FF',
  gainsboro: '#DCDCDC',
  ghostwhite: '#F8F8FF',
  gold: '#FFD700',
  goldenrod: '#DAA520',
  gray: '#808080',
  green: '#008000',
  greenyellow: '#ADFF2F',
  grey: '#808080',
  honeydew: '#F0FFF0',
  hotpink: '#FF69B4',
  indianred: '#CD5C5C',
  indigo: '#4B0082',
  ivory: '#FFFFF0',
  khaki: '#F0E68C',
  lavender: '#E6E6FA',
  lavenderblush: '#FFF0F5',
  lawngreen: '#7CFC00',
  lemonchiffon: '#FFFACD',
  lightblue: '#ADD8E6',
  lightcoral: '#F08080',
  lightcyan: '#E0FFFF',
  lightgoldenrodyellow: '#FAFAD2',
  lightgray: '#D3D3D3',
  lightgreen: '#90EE90',
  lightgrey: '#D3D3D3',
  lightpink: '#FFB6C1',
  lightsalmon: '#FFA07A',
  lightseagreen: '#20B2AA',
  lightskyblue: '#87CEFA',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#B0C4DE',
  lightyellow: '#FFFFE0',
  lime: '#00FF00',
  limegreen: '#32CD32',
  linen: '#FAF0E6',
  magenta: '#FF00FF',
  maroon: '#800000',
  mediumaquamarine: '#66CDAA',
  mediumblue: '#0000CD',
  mediumorchid: '#BA55D3',
  mediumpurple: '#9370DB',
  mediumseagreen: '#3CB371',
  mediumslateblue: '#7B68EE',
  mediumspringgreen: '#00FA9A',
  mediumturquoise: '#48D1CC',
  mediumvioletred: '#C71585',
  midnightblue: '#191970',
  mintcream: '#F5FFFA',
  mistyrose: '#FFE4E1',
  moccasin: '#FFE4B5',
  navajowhite: '#FFDEAD',
  navy: '#000080',
  oldlace: '#FDF5E6',
  olive: '#808000',
  olivedrab: '#6B8E23',
  orange: '#FFA500',
  orangered: '#FF4500',
  orchid: '#DA70D6',
  palegoldenrod: '#EEE8AA',
  palegreen: '#98FB98',
  paleturquoise: '#AFEEEE',
  palevioletred: '#DB7093',
  papayawhip: '#FFEFD5',
  peachpuff: '#FFDAB9',
  peru: '#CD853F',
  pink: '#FFC0CB',
  plum: '#DDA0DD',
  powderblue: '#B0E0E6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#FF0000',
  rosybrown: '#BC8F8F',
  royalblue: '#4169E1',
  saddlebrown: '#8B4513',
  salmon: '#FA8072',
  sandybrown: '#F4A460',
  seagreen: '#2E8B57',
  seashell: '#FFF5EE',
  sienna: '#A0522D',
  silver: '#C0C0C0',
  skyblue: '#87CEEB',
  slateblue: '#6A5ACD',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#FFFAFA',
  springgreen: '#00FF7F',
  steelblue: '#4682B4',
  tan: '#D2B48C',
  teal: '#008080',
  thistle: '#D8BFD8',
  tomato: '#FF6347',
  turquoise: '#40E0D0',
  violet: '#EE82EE',
  wheat: '#F5DEB3',
  white: '#FFFFFF',
  whitesmoke: '#F5F5F5',
  yellow: '#FFFF00',
  yellowgreen: '#9ACD32',
};

// ─── Static helpers (pure functions — no instance state) ──────────────────────

/**
 * Convert RGB channels to uppercase hex string.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string} e.g. '#FF5733'
 */
function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((v) => v.toString(16).padStart(2, '0').toUpperCase())
    .join('')}`;
}

/**
 * Convert RGB (0-255) to HSL [h(0-360), s(0-1), l(0-1)].
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {[number, number, number]}
 */
function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return [h * 360, s, l];
}

/**
 * Convert HSL to RGB channels (0-255).
 * @param {number} h - Hue 0-360
 * @param {number} s - Saturation 0-1
 * @param {number} l - Lightness 0-1
 * @returns {[number, number, number]}
 */
function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }

  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const hn = h / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, hn) * 255),
    Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  ];
}

/**
 * Build normalized color result object from clamped RGB channels.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {boolean} hasAlpha
 * @returns {{ hex: string, rgb: string, hsl: string, hasAlpha: boolean }}
 */
function buildResult(r, g, b, hasAlpha) {
  const cr = Math.max(0, Math.min(255, Math.round(r)));
  const cg = Math.max(0, Math.min(255, Math.round(g)));
  const cb = Math.max(0, Math.min(255, Math.round(b)));

  const hex = rgbToHex(cr, cg, cb);
  const rgb = `rgb(${cr},${cg},${cb})`;
  const [h, s, l] = rgbToHsl(cr, cg, cb);
  const hsl = `hsl(${Math.round(h)},${Math.round(s * 100)}%,${Math.round(l * 100)}%)`;

  return {
    hex,
    rgb,
    hsl,
    hasAlpha,
  };
}

/**
 * Calculate WCAG 2.1 relative luminance for a hex color.
 * @param {string} hex - #RRGGBB
 * @returns {number} Luminance 0-1
 */
function calculateLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const linearize = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * Euclidean distance in HSL space (hue-aware circular diff).
 * @param {string} hsl1
 * @param {string} hsl2
 * @returns {number}
 */
function hslDistance(hsl1, hsl2) {
  const parse = (str) => {
    const m = str.match(/hsl\((\d+),(\d+)%,(\d+)%\)/);
    return m
      ? [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]
      : [0, 0, 0];
  };
  const [h1, s1, l1] = parse(hsl1);
  const [h2, s2, l2] = parse(hsl2);

  const hueDiff = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
  return Math.sqrt(
    ((hueDiff / 360) * 100) ** 2
    + (s1 - s2) ** 2
    + (l1 - l2) ** 2,
  );
}

// ─── ColorExtractor class ─────────────────────────────────────────────────────

class ColorExtractor {
  /**
   * @param {Object} options
   * @param {number} [options.topN=20] - Max colors in output palette
   * @param {number} [options.minFrequency=2] - Min element count to include
   * @param {number} [options.deduplicationTolerance=5] - HSL tolerance for merging
   */
  constructor(options = {}) {
    this.topN = options.topN || 20;
    this.minFrequency = options.minFrequency || 2;
    this.deduplicationTolerance = options.deduplicationTolerance || 5;
  }

  // ─── Normalization (AC 1) ────────────────────────────────────────────────

  /**
   * Normalize a CSS color string to hex, rgb, hsl representations.
   * @param {string} cssColor - CSS color string
   * @returns {{ hex: string, rgb: string, hsl: string, hasAlpha: boolean }|null}
   */
  // eslint-disable-next-line class-methods-use-this
  normalize(cssColor) {
    if (!cssColor || typeof cssColor !== 'string') return null;

    const color = cssColor.trim().toLowerCase();

    // Skip transparent / fully invisible
    if (
      color === 'transparent'
      || color === 'rgba(0, 0, 0, 0)'
      || color === 'rgba(0,0,0,0)'
      || color === 'initial'
      || color === 'inherit'
      || color === 'unset'
    ) {
      return null;
    }

    try {
      // rgb(r, g, b)
      const rgbMatch = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
      if (rgbMatch) {
        const [, r, g, b] = rgbMatch.map(Number);
        return buildResult(r, g, b, false);
      }

      // rgba(r, g, b, a)
      const rgbaMatch = color.match(
        /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/,
      );
      if (rgbaMatch) {
        const r = Number(rgbaMatch[1]);
        const g = Number(rgbaMatch[2]);
        const b = Number(rgbaMatch[3]);
        const alpha = parseFloat(rgbaMatch[4]);
        if (alpha === 0) return null;
        return buildResult(r, g, b, alpha < 1);
      }

      // #RRGGBB
      const hexFullMatch = color.match(/^#([0-9a-f]{6})$/);
      if (hexFullMatch) {
        const r = parseInt(hexFullMatch[1].slice(0, 2), 16);
        const g = parseInt(hexFullMatch[1].slice(2, 4), 16);
        const b = parseInt(hexFullMatch[1].slice(4, 6), 16);
        return buildResult(r, g, b, false);
      }

      // #RGB
      const hexShortMatch = color.match(/^#([0-9a-f]{3})$/);
      if (hexShortMatch) {
        const [cr, cg, cb] = hexShortMatch[1].split('');
        const r = parseInt(cr + cr, 16);
        const g = parseInt(cg + cg, 16);
        const b = parseInt(cb + cb, 16);
        return buildResult(r, g, b, false);
      }

      // hsl(h, s%, l%)
      const hslMatch = color.match(/^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/);
      if (hslMatch) {
        const h = parseFloat(hslMatch[1]);
        const s = parseFloat(hslMatch[2]) / 100;
        const l = parseFloat(hslMatch[3]) / 100;
        const [r, g, b] = hslToRgb(h, s, l);
        return buildResult(r, g, b, false);
      }

      // CSS4 named color
      const namedHex = CSS4_NAMED_COLORS[color];
      if (namedHex) {
        const r = parseInt(namedHex.slice(1, 3), 16);
        const g = parseInt(namedHex.slice(3, 5), 16);
        const b = parseInt(namedHex.slice(5, 7), 16);
        return buildResult(r, g, b, false);
      }

      logger.warn('Cannot parse CSS color', { cssColor });
      return null;
    } catch (err) {
      logger.warn('Error normalizing color', { cssColor, error: err.message });
      return null;
    }
  }

  // ─── Frequency Analysis (AC 2) ──────────────────────────────────────────

  /**
   * Analyze color frequency across DOM elements.
   * @param {Array} elements - DOM elements with .styles.color / .styles.backgroundColor
   * @returns {Map<string, Object>} hex → { count, sources, tagNames, normalized }
   */
  analyzeFrequency(elements) {
    const map = new Map();

    const addColor = (cssColor, source, tagName) => {
      const normalized = this.normalize(cssColor);
      if (!normalized) return;

      const { hex } = normalized;
      if (!map.has(hex)) {
        map.set(hex, {
          count: 0,
          sources: new Set(),
          tagNames: new Set(),
          normalized,
        });
      }
      const entry = map.get(hex);
      entry.count += 1;
      entry.sources.add(source);
      entry.tagNames.add(tagName);
    };

    elements.forEach((el) => {
      const tag = (el.tagName || 'unknown').toLowerCase();
      if (el.styles) {
        if (el.styles.color) addColor(el.styles.color, 'color', tag);
        if (el.styles.backgroundColor) {
          addColor(el.styles.backgroundColor, 'backgroundColor', tag);
        }
      }
    });

    // Serialize Sets to Arrays
    const result = new Map();
    map.forEach((entry, hex) => {
      result.set(hex, {
        count: entry.count,
        sources: Array.from(entry.sources),
        tagNames: Array.from(entry.tagNames),
        normalized: entry.normalized,
      });
    });
    return result;
  }

  // ─── Semantic Categorization (AC 3) ────────────────────────────────────

  /**
   * Assign semantic roles to colors based on DOM context and HSL properties.
   * @param {Map} frequencyMap - Output of analyzeFrequency
   * @param {Array} elements - DOM elements
   * @returns {Map} frequencyMap with role added to each entry
   */
  categorize(frequencyMap, elements) {
    const BG_TAGS = new Set([
      'body', 'html', 'main', 'section', 'div',
      'article', 'header', 'footer', 'nav', 'aside',
    ]);
    const TEXT_TAGS = new Set([
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'span', 'a', 'li', 'td', 'th', 'label',
    ]);

    const bgHexes = new Set();
    const textHexes = new Set();
    const borderHexes = new Set();

    elements.forEach((el) => {
      const tag = (el.tagName || '').toLowerCase();
      if (!el.styles) return;

      if (BG_TAGS.has(tag) && el.styles.backgroundColor) {
        const n = this.normalize(el.styles.backgroundColor);
        if (n) bgHexes.add(n.hex);
      }
      if (TEXT_TAGS.has(tag) && el.styles.color) {
        const n = this.normalize(el.styles.color);
        if (n) textHexes.add(n.hex);
      }
      if (el.styles.border) {
        const m = el.styles.border.match(/(?:rgba?\([^)]+\)|#[0-9a-fA-F]{3,6})/);
        if (m) {
          const n = this.normalize(m[0]);
          if (n) borderHexes.add(n.hex);
        }
      }
    });

    const totalElements = elements.length || 1;

    // Process in frequency order (highest first)
    const sorted = Array.from(frequencyMap.entries()).sort((a, b) => b[1].count - a[1].count);

    let primaryAssigned = false;
    let secondaryAssigned = false;

    const withRoles = sorted.map(([hex, entry]) => {
      const hslMatch = entry.normalized.hsl.match(/hsl\((\d+),(\d+)%,(\d+)%\)/);
      const saturation = hslMatch ? parseInt(hslMatch[2], 10) : 0;
      const frequencyPct = (entry.count / totalElements) * 100;

      let role;

      if (bgHexes.has(hex)) {
        role = 'background';
      } else if (textHexes.has(hex)) {
        role = 'text';
      } else if (borderHexes.has(hex)) {
        role = 'border';
      } else if (saturation < 10) {
        role = 'neutral';
      } else if (saturation > 70 && frequencyPct < 10) {
        role = 'accent';
      } else if (!primaryAssigned) {
        role = 'primary';
        primaryAssigned = true;
      } else if (!secondaryAssigned) {
        role = 'secondary';
        secondaryAssigned = true;
      } else {
        role = 'unknown';
      }

      return [hex, { ...entry, role }];
    });

    return new Map(withRoles);
  }

  // ─── WCAG Contrast (AC 4) ───────────────────────────────────────────────

  /**
   * Calculate WCAG 2.1 relative luminance for a hex color.
   * Delegates to module-level pure function.
   * @param {string} hex - #RRGGBB
   * @returns {number} Luminance 0-1
   */
  // eslint-disable-next-line class-methods-use-this
  calculateLuminance(hex) {
    return calculateLuminance(hex);
  }

  /**
   * Calculate contrast ratio and WCAG compliance level.
   * @param {string} hex1 - #RRGGBB
   * @param {string} hex2 - #RRGGBB
   * @returns {{ ratio: number, level: 'AAA'|'AA'|'AA-large'|'FAIL' }}
   */
  // eslint-disable-next-line class-methods-use-this
  calculateContrast(hex1, hex2) {
    const l1 = calculateLuminance(hex1);
    const l2 = calculateLuminance(hex2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = parseFloat(((lighter + 0.05) / (darker + 0.05)).toFixed(2));

    let level;
    if (ratio >= 7) level = 'AAA';
    else if (ratio >= 4.5) level = 'AA';
    else if (ratio >= 3) level = 'AA-large';
    else level = 'FAIL';

    return { ratio, level };
  }

  /**
   * Analyze contrast across text/background pairs and primary vs white/black.
   * @param {Map} colorMap - Categorized color map
   * @param {Array} elements - DOM elements
   * @returns {{ contrastPairs: Array, contrastFailures: Array, accessibilityScore: number }}
   */
  analyzeContrast(colorMap, elements) {
    const seenPairs = new Set();
    let passingCount = 0;
    let totalTextBgPairs = 0;

    const contrastPairs = elements.reduce((pairs, el) => {
      if (!el.styles || !el.styles.color || !el.styles.backgroundColor) return pairs;

      const textN = this.normalize(el.styles.color);
      const bgN = this.normalize(el.styles.backgroundColor);
      if (!textN || !bgN || textN.hex === bgN.hex) return pairs;

      const key = `${textN.hex}|${bgN.hex}`;
      if (seenPairs.has(key)) return pairs;
      seenPairs.add(key);

      const { ratio, level } = this.calculateContrast(textN.hex, bgN.hex);
      const pair = {
        text: textN.hex,
        background: bgN.hex,
        ratio,
        level,
      };
      totalTextBgPairs += 1;
      if (level !== 'FAIL') passingCount += 1;

      return [...pairs, pair];
    }, []);

    // Check primary vs white and black
    const primaryEntry = Array.from(colorMap.values()).find((e) => e.role === 'primary');
    if (primaryEntry) {
      const ph = primaryEntry.normalized.hex;
      [['#FFFFFF'], ['#000000']].forEach(([bg]) => {
        const key = `${ph}|${bg}`;
        if (!seenPairs.has(key)) {
          const { ratio, level } = this.calculateContrast(ph, bg);
          contrastPairs.push({
            text: ph,
            background: bg,
            ratio,
            level,
          });
          seenPairs.add(key);
        }
      });
    }

    const contrastFailures = contrastPairs.filter((p) => p.level === 'FAIL');

    const accessibilityScore = totalTextBgPairs > 0
      ? Math.round((passingCount / totalTextBgPairs) * 100)
      : 100;

    return { contrastPairs, contrastFailures, accessibilityScore };
  }

  // ─── Deduplication (AC 5) ───────────────────────────────────────────────

  /**
   * Merge visually similar colors within tolerance.
   * @param {Map} colorMap - Frequency map
   * @param {number} [tolerance] - HSL distance threshold (default: instance default)
   * @returns {Map} Deduplicated map with variants[] on each canonical entry
   */
  deduplicate(colorMap, tolerance = this.deduplicationTolerance) {
    const sorted = Array.from(colorMap.entries()).sort((a, b) => b[1].count - a[1].count);

    const absorbed = new Set();

    const entries = sorted.reduce((acc, [hex, entry]) => {
      if (absorbed.has(hex)) return acc;

      const similar = sorted.filter(([otherHex, otherEntry]) => {
        if (otherHex === hex || absorbed.has(otherHex)) return false;
        return hslDistance(entry.normalized.hsl, otherEntry.normalized.hsl) <= tolerance;
      });

      const variants = similar.map(([otherHex]) => otherHex);
      const combinedCount = similar.reduce((sum, [, oe]) => sum + oe.count, entry.count);

      variants.forEach((v) => absorbed.add(v));
      absorbed.add(hex);

      return [...acc, [hex, { ...entry, count: combinedCount, variants }]];
    }, []);

    return new Map(entries);
  }

  // ─── Named Color Matching (AC 6) ────────────────────────────────────────

  /**
   * Match a hex color to the nearest CSS4 named color by Euclidean RGB distance.
   * @param {string} hex - #RRGGBB
   * @returns {{ namedColor: string, distance: number }}
   */
  // eslint-disable-next-line class-methods-use-this
  matchNamed(hex) {
    const r1 = parseInt(hex.slice(1, 3), 16);
    const g1 = parseInt(hex.slice(3, 5), 16);
    const b1 = parseInt(hex.slice(5, 7), 16);

    let minDist = Infinity;
    let nearest = 'unknown';

    const names = Object.keys(CSS4_NAMED_COLORS);
    names.every((name) => {
      const namedHex = CSS4_NAMED_COLORS[name];
      const r2 = parseInt(namedHex.slice(1, 3), 16);
      const g2 = parseInt(namedHex.slice(3, 5), 16);
      const b2 = parseInt(namedHex.slice(5, 7), 16);

      const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);

      if (dist < minDist) {
        minDist = dist;
        nearest = name;
        if (dist === 0) return false; // exact match — stop iteration
      }
      return true;
    });

    return { namedColor: nearest, distance: parseFloat(minDist.toFixed(2)) };
  }

  // ─── Main Pipeline (AC 7) ───────────────────────────────────────────────

  /**
   * Full color extraction pipeline: analyze → dedup → categorize → contrast → name.
   * @param {Array} elements - DOM elements
   * @param {string} [url=''] - Source URL (for output metadata)
   * @returns {Object} Structured palette per AC 7 schema
   */
  extract(elements, url = '') {
    try {
      logger.info('Starting color extraction pipeline', {
        elementCount: elements.length,
        url,
      });

      if (!elements || elements.length === 0) {
        logger.warn('Empty elements array — returning empty palette');
        return this._emptyPalette(url);
      }

      // 1. Frequency analysis
      const frequencyMap = this.analyzeFrequency(elements);
      const totalColorsFound = frequencyMap.size;

      // 2. Filter noise (count < minFrequency)
      const filteredMap = new Map(
        Array.from(frequencyMap.entries()).filter(([, entry]) => entry.count >= this.minFrequency),
      );

      // 3. Top-N cap
      const topMap = new Map(
        Array.from(filteredMap.entries())
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, this.topN),
      );

      // 4. Deduplicate
      const dedupedMap = this.deduplicate(topMap);
      const uniqueColorsAfterDedup = dedupedMap.size;

      // 5. Categorize
      const categorizedMap = this.categorize(dedupedMap, elements);

      // 6. Contrast analysis
      const { contrastFailures, accessibilityScore } = this.analyzeContrast(
        categorizedMap,
        elements,
      );

      // 7. Build palette entries
      const palette = Array.from(categorizedMap.entries()).map(([hex, entry], idx) => {
        const { namedColor, distance } = this.matchNamed(hex);
        const vsWhite = this.calculateContrast(hex, '#FFFFFF');
        const vsBlack = this.calculateContrast(hex, '#000000');

        return {
          id: `color_${String(idx + 1).padStart(3, '0')}`,
          hex,
          rgb: entry.normalized.rgb,
          hsl: entry.normalized.hsl,
          role: entry.role || 'unknown',
          frequency: entry.count,
          namedColor,
          namedColorDistance: distance,
          hasAlpha: entry.normalized.hasAlpha || false,
          wcag: {
            vsWhite: { ratio: vsWhite.ratio, level: vsWhite.level },
            vsBlack: { ratio: vsBlack.ratio, level: vsBlack.level },
          },
          variants: entry.variants || [],
        };
      });

      palette.sort((a, b) => b.frequency - a.frequency);

      const result = {
        extractedAt: new Date().toISOString(),
        url,
        totalColorsFound,
        uniqueColorsAfterDedup,
        palette,
        contrastFailures,
        accessibilityScore,
      };

      logger.info('Color extraction complete', {
        totalColorsFound,
        uniqueColorsAfterDedup,
        paletteSize: palette.length,
        accessibilityScore,
      });

      return result;
    } catch (error) {
      logger.error('Color extraction failed', { error: error.message });
      throw new ExtractionError('Color extraction pipeline failed', {
        originalError: error.message,
      });
    }
  }

  /** @private */
  // eslint-disable-next-line class-methods-use-this
  _emptyPalette(url) {
    return {
      extractedAt: new Date().toISOString(),
      url,
      totalColorsFound: 0,
      uniqueColorsAfterDedup: 0,
      palette: [],
      contrastFailures: [],
      accessibilityScore: 100,
    };
  }
}

module.exports = ColorExtractor;
module.exports.CSS4_NAMED_COLORS = CSS4_NAMED_COLORS;
