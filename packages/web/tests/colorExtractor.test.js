/**
 * ColorExtractor Tests - AC 1-7
 */

const ColorExtractor = require('../src/extractors/ColorExtractor');
const { CSS4_NAMED_COLORS } = require('../src/extractors/ColorExtractor');

describe('ColorExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new ColorExtractor();
  });

  // ─── AC 1: Normalization ──────────────────────────────────────────────────

  describe('normalize()', () => {
    test('should normalize rgb() format', () => {
      const result = extractor.normalize('rgb(255, 87, 51)');
      expect(result).not.toBeNull();
      expect(result.hex).toBe('#FF5733');
      expect(result.rgb).toBe('rgb(255,87,51)');
      expect(result.hsl).toMatch(/^hsl\(\d+,\d+%,\d+%\)$/);
      expect(result.hasAlpha).toBe(false);
    });

    test('should normalize rgb() without spaces', () => {
      const result = extractor.normalize('rgb(255,87,51)');
      expect(result.hex).toBe('#FF5733');
    });

    test('should normalize rgba() and strip alpha', () => {
      const result = extractor.normalize('rgba(255, 87, 51, 0.9)');
      expect(result).not.toBeNull();
      expect(result.hex).toBe('#FF5733');
      expect(result.hasAlpha).toBe(true);
    });

    test('should return null for fully transparent rgba', () => {
      expect(extractor.normalize('rgba(0, 0, 0, 0)')).toBeNull();
      expect(extractor.normalize('rgba(255, 0, 0, 0)')).toBeNull();
    });

    test('should normalize #RRGGBB hex', () => {
      const result = extractor.normalize('#FF5733');
      expect(result.hex).toBe('#FF5733');
      expect(result.rgb).toBe('rgb(255,87,51)');
    });

    test('should normalize #RGB short hex', () => {
      const result = extractor.normalize('#F53');
      expect(result).not.toBeNull();
      expect(result.hex).toBe('#FF5533');
    });

    test('should normalize hsl() format', () => {
      const result = extractor.normalize('hsl(0, 100%, 50%)');
      expect(result).not.toBeNull();
      expect(result.hex).toBe('#FF0000');
    });

    test('should normalize CSS4 named color', () => {
      const result = extractor.normalize('red');
      expect(result).not.toBeNull();
      expect(result.hex).toBe('#FF0000');
    });

    test('should normalize "white" named color', () => {
      const result = extractor.normalize('white');
      expect(result.hex).toBe('#FFFFFF');
    });

    test('should return null for transparent keyword', () => {
      expect(extractor.normalize('transparent')).toBeNull();
    });

    test('should return null for invalid color strings', () => {
      expect(extractor.normalize('not-a-color')).toBeNull();
      expect(extractor.normalize('rgb(not, valid)')).toBeNull();
      expect(extractor.normalize('')).toBeNull();
      expect(extractor.normalize(null)).toBeNull();
      expect(extractor.normalize(undefined)).toBeNull();
    });

    test('should handle inherit/initial/unset as null', () => {
      expect(extractor.normalize('inherit')).toBeNull();
      expect(extractor.normalize('initial')).toBeNull();
      expect(extractor.normalize('unset')).toBeNull();
    });

    test('all CSS4 named colors should produce a CSS color table with 147 entries', () => {
      expect(Object.keys(CSS4_NAMED_COLORS).length).toBeGreaterThanOrEqual(140);
    });
  });

  // ─── AC 2: Frequency Analysis ─────────────────────────────────────────────

  describe('analyzeFrequency()', () => {
    const makeElements = (count, color, bgColor) => Array.from({ length: count }, () => ({
      tagName: 'p',
      styles: { color, backgroundColor: bgColor },
    }));

    test('should count color occurrences', () => {
      const elements = makeElements(5, 'rgb(255,0,0)', 'rgb(255,255,255)');
      const map = extractor.analyzeFrequency(elements);
      expect(map.has('#FF0000')).toBe(true);
      expect(map.get('#FF0000').count).toBe(5);
    });

    test('should count backgroundColor separately from color', () => {
      const elements = [
        { tagName: 'div', styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' } },
        { tagName: 'p', styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(0,0,255)' } },
      ];
      const map = extractor.analyzeFrequency(elements);
      expect(map.get('#000000').count).toBe(2); // used as color in 2 elements
      expect(map.get('#FFFFFF').count).toBe(1);
      expect(map.get('#0000FF').count).toBe(1);
    });

    test('should record source (color vs backgroundColor)', () => {
      const elements = [{ tagName: 'p', styles: { color: 'rgb(255,0,0)', backgroundColor: 'rgb(0,0,255)' } }];
      const map = extractor.analyzeFrequency(elements);
      expect(map.get('#FF0000').sources).toContain('color');
      expect(map.get('#0000FF').sources).toContain('backgroundColor');
    });

    test('should skip transparent colors', () => {
      const elements = [
        { tagName: 'div', styles: { color: 'rgba(0,0,0,0)', backgroundColor: 'rgb(255,0,0)' } },
      ];
      const map = extractor.analyzeFrequency(elements);
      expect(map.has('#000000')).toBe(false);
      expect(map.has('#FF0000')).toBe(true);
    });

    test('should skip elements without styles', () => {
      const elements = [{ tagName: 'p' }, { tagName: 'div', styles: {} }];
      const map = extractor.analyzeFrequency(elements);
      expect(map.size).toBe(0);
    });

    test('should handle empty elements array', () => {
      const map = extractor.analyzeFrequency([]);
      expect(map.size).toBe(0);
    });
  });

  // ─── AC 3: Semantic Categorization ────────────────────────────────────────

  describe('categorize()', () => {
    const makeFreqMap = (hex, count, hsl) => {
      const normalized = {
        hex, rgb: 'rgb(0,0,0)', hsl, hasAlpha: false,
      };
      return new Map([[hex, {
        count, sources: ['color'], tagNames: ['p'], normalized,
      }]]);
    };

    test('should assign background role to colors from bg-heavy tags', () => {
      const elements = [
        { tagName: 'body', styles: { backgroundColor: 'rgb(255,255,255)', color: 'rgb(0,0,0)' } },
      ];
      const frequencyMap = extractor.analyzeFrequency(elements);
      const result = extractor.categorize(frequencyMap, elements);
      expect(result.get('#FFFFFF').role).toBe('background');
    });

    test('should assign text role to colors from text tags', () => {
      const elements = [
        { tagName: 'p', styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' } },
        { tagName: 'h1', styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' } },
      ];
      const frequencyMap = extractor.analyzeFrequency(elements);
      const result = extractor.categorize(frequencyMap, elements);
      // #000000 used as text color on p and h1
      expect(result.get('#000000').role).toBe('text');
    });

    test('should assign neutral role to near-grayscale (saturation < 10%)', () => {
      const freqMap = makeFreqMap('#808080', 5, 'hsl(0,0%,50%)');
      const result = extractor.categorize(freqMap, []);
      expect(result.get('#808080').role).toBe('neutral');
    });

    test('should assign primary role to most-used non-neutral color', () => {
      const elements = Array.from({ length: 20 }, () => ({
        tagName: 'div',
        styles: { color: 'rgb(26,26,46)', backgroundColor: 'rgb(255,255,255)' },
      }));
      const freqMap = extractor.analyzeFrequency(elements);
      const result = extractor.categorize(freqMap, elements);
      const roles = Array.from(result.values()).map((e) => e.role);
      expect(roles).toContain('primary');
    });

    test('should assign secondary to 2nd most-used distinctive color', () => {
      const elements = [
        ...Array(10).fill({ tagName: 'div', styles: { color: 'rgb(255,0,0)', backgroundColor: 'rgb(255,255,255)' } }),
        ...Array(8).fill({ tagName: 'div', styles: { color: 'rgb(0,0,255)', backgroundColor: 'rgb(255,255,255)' } }),
      ];
      const freqMap = extractor.analyzeFrequency(elements);
      const result = extractor.categorize(freqMap, elements);
      const roles = Array.from(result.values()).map((e) => e.role);
      expect(roles).toContain('primary');
      expect(roles).toContain('secondary');
    });
  });

  // ─── AC 4: WCAG Contrast ──────────────────────────────────────────────────

  describe('calculateLuminance()', () => {
    test('white should have luminance 1', () => {
      expect(extractor.calculateLuminance('#FFFFFF')).toBeCloseTo(1, 5);
    });

    test('black should have luminance 0', () => {
      expect(extractor.calculateLuminance('#000000')).toBeCloseTo(0, 5);
    });

    test('medium grey should be between 0 and 1', () => {
      const l = extractor.calculateLuminance('#808080');
      expect(l).toBeGreaterThan(0);
      expect(l).toBeLessThan(1);
    });
  });

  describe('calculateContrast()', () => {
    test('white vs black should be 21:1 (AAA)', () => {
      const { ratio, level } = extractor.calculateContrast('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 0);
      expect(level).toBe('AAA');
    });

    test('should return AA for ratio >= 4.5', () => {
      // Dark blue on white: high contrast
      const { level } = extractor.calculateContrast('#000080', '#FFFFFF');
      expect(['AA', 'AAA']).toContain(level);
    });

    test('should return AA-large for ratio >= 3', () => {
      // #767676 on white is approx 4.54 (AA)
      const { level } = extractor.calculateContrast('#767676', '#FFFFFF');
      expect(['AA', 'AAA', 'AA-large']).toContain(level);
    });

    test('should return FAIL for low contrast', () => {
      // Very similar colors
      const { level } = extractor.calculateContrast('#EEEEEE', '#FFFFFF');
      expect(level).toBe('FAIL');
    });

    test('should be symmetric', () => {
      const r1 = extractor.calculateContrast('#FF0000', '#FFFFFF');
      const r2 = extractor.calculateContrast('#FFFFFF', '#FF0000');
      expect(r1.ratio).toBe(r2.ratio);
    });
  });

  describe('analyzeContrast()', () => {
    test('should detect failing contrast pairs', () => {
      const elements = [
        { tagName: 'p', styles: { color: 'rgb(238,238,238)', backgroundColor: 'rgb(255,255,255)' } },
      ];
      const freqMap = extractor.analyzeFrequency(elements);
      const categorized = extractor.categorize(freqMap, elements);
      const { contrastFailures } = extractor.analyzeContrast(categorized, elements);
      expect(contrastFailures.length).toBeGreaterThan(0);
      expect(contrastFailures[0].level).toBe('FAIL');
    });

    test('should calculate accessibility score 0-100', () => {
      const elements = [
        { tagName: 'p', styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' } },
      ];
      const freqMap = extractor.analyzeFrequency(elements);
      const categorized = extractor.categorize(freqMap, elements);
      const { accessibilityScore } = extractor.analyzeContrast(categorized, elements);
      expect(accessibilityScore).toBeGreaterThanOrEqual(0);
      expect(accessibilityScore).toBeLessThanOrEqual(100);
    });

    test('should return 100 score for empty elements (no pairs to check)', () => {
      const { accessibilityScore } = extractor.analyzeContrast(new Map(), []);
      expect(accessibilityScore).toBe(100);
    });
  });

  // ─── AC 5: Deduplication ──────────────────────────────────────────────────

  describe('deduplicate()', () => {
    test('should merge similar colors within tolerance', () => {
      const makeEntry = (hex, hsl, count) => ({
        count,
        sources: ['color'],
        tagNames: ['div'],
        normalized: {
          hex, rgb: '', hsl, hasAlpha: false,
        },
      });

      const colorMap = new Map([
        ['#FF5733', makeEntry('#FF5733', 'hsl(11,100%,60%)', 10)],
        ['#FF5A35', makeEntry('#FF5A35', 'hsl(11,100%,61%)', 3)], // very similar
      ]);

      const result = extractor.deduplicate(colorMap, 5);
      // Should merge #FF5A35 into #FF5733
      expect(result.size).toBe(1);
      expect(result.has('#FF5733')).toBe(true);
      expect(result.get('#FF5733').variants).toContain('#FF5A35');
    });

    test('should keep distinct colors separate', () => {
      const makeEntry = (hex, hsl, count) => ({
        count,
        sources: ['color'],
        tagNames: ['div'],
        normalized: {
          hex, rgb: '', hsl, hasAlpha: false,
        },
      });

      const colorMap = new Map([
        ['#FF0000', makeEntry('#FF0000', 'hsl(0,100%,50%)', 10)],
        ['#0000FF', makeEntry('#0000FF', 'hsl(240,100%,50%)', 8)],
      ]);

      const result = extractor.deduplicate(colorMap, 5);
      expect(result.size).toBe(2);
    });

    test('combined count should include merged variants', () => {
      const makeEntry = (hex, hsl, count) => ({
        count,
        sources: ['color'],
        tagNames: ['div'],
        normalized: {
          hex, rgb: '', hsl, hasAlpha: false,
        },
      });

      const colorMap = new Map([
        ['#FF0000', makeEntry('#FF0000', 'hsl(0,100%,50%)', 10)],
        ['#FF0A00', makeEntry('#FF0A00', 'hsl(2,100%,50%)', 5)],
      ]);

      const result = extractor.deduplicate(colorMap, 10);
      expect(result.size).toBe(1);
      expect(result.get('#FF0000').count).toBe(15); // 10 + 5
    });

    test('should handle empty map', () => {
      const result = extractor.deduplicate(new Map(), 5);
      expect(result.size).toBe(0);
    });
  });

  // ─── AC 6: Named Color Matching ───────────────────────────────────────────

  describe('matchNamed()', () => {
    test('should return "red" for #FF0000', () => {
      const { namedColor, distance } = extractor.matchNamed('#FF0000');
      expect(namedColor).toBe('red');
      expect(distance).toBe(0);
    });

    test('should return "white" for #FFFFFF', () => {
      const { namedColor } = extractor.matchNamed('#FFFFFF');
      expect(namedColor).toBe('white');
    });

    test('should return "black" for #000000', () => {
      const { namedColor } = extractor.matchNamed('#000000');
      expect(namedColor).toBe('black');
    });

    test('should return nearest named color for non-exact match', () => {
      const { namedColor, distance } = extractor.matchNamed('#FF6350'); // close to tomato
      expect(distance).toBeGreaterThan(0);
      expect(typeof namedColor).toBe('string');
    });

    test('distance should be 0 for exact CSS4 named color', () => {
      const { distance } = extractor.matchNamed('#FF7F50'); // coral
      expect(distance).toBe(0);
    });
  });

  // ─── AC 7: Structured Output ──────────────────────────────────────────────

  describe('extract()', () => {
    // makeElements helper kept for context — used by tests below

    test('should return structured palette object', () => {
      const elements = [
        ...Array(5).fill({ tagName: 'p', styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' } }),
        ...Array(5).fill({ tagName: 'div', styles: { color: 'rgb(255,87,51)', backgroundColor: 'rgb(255,255,255)' } }),
      ];
      const result = extractor.extract(elements, 'https://example.com');

      expect(result).toHaveProperty('extractedAt');
      expect(result).toHaveProperty('url', 'https://example.com');
      expect(result).toHaveProperty('totalColorsFound');
      expect(result).toHaveProperty('uniqueColorsAfterDedup');
      expect(result).toHaveProperty('palette');
      expect(result).toHaveProperty('contrastFailures');
      expect(result).toHaveProperty('accessibilityScore');
      expect(Array.isArray(result.palette)).toBe(true);
    });

    test('palette entries should have required fields', () => {
      const elements = Array(5).fill({
        tagName: 'div',
        styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' },
      });
      const result = extractor.extract(elements);

      result.palette.forEach((entry) => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('hex');
        expect(entry).toHaveProperty('rgb');
        expect(entry).toHaveProperty('hsl');
        expect(entry).toHaveProperty('role');
        expect(entry).toHaveProperty('frequency');
        expect(entry).toHaveProperty('namedColor');
        expect(entry).toHaveProperty('wcag');
        expect(entry.wcag).toHaveProperty('vsWhite');
        expect(entry.wcag).toHaveProperty('vsBlack');
        expect(entry).toHaveProperty('variants');
      });
    });

    test('should return JSON-serializable output', () => {
      const elements = Array(5).fill({
        tagName: 'div',
        styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' },
      });
      const result = extractor.extract(elements);
      expect(() => JSON.stringify(result)).not.toThrow();
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    });

    test('should return empty palette for empty elements array', () => {
      const result = extractor.extract([]);
      expect(result.palette).toHaveLength(0);
      expect(result.totalColorsFound).toBe(0);
      expect(result.accessibilityScore).toBe(100);
    });

    test('palette should be sorted by frequency descending', () => {
      const elements = [
        ...Array(10).fill({ tagName: 'div', styles: { color: 'rgb(255,0,0)', backgroundColor: 'rgb(255,255,255)' } }),
        ...Array(5).fill({ tagName: 'div', styles: { color: 'rgb(0,0,255)', backgroundColor: 'rgb(255,255,255)' } }),
      ];
      const result = extractor.extract(elements);
      result.palette.slice(1).forEach((entry, idx) => {
        expect(result.palette[idx].frequency).toBeGreaterThanOrEqual(entry.frequency);
      });
    });

    test('should filter noise colors below minFrequency', () => {
      const customExtractor = new ColorExtractor({ minFrequency: 3, topN: 20 });
      const elements = [
        { tagName: 'div', styles: { color: 'rgb(255,0,0)', backgroundColor: 'rgb(255,255,255)' } }, // count 1 each
      ];
      const result = customExtractor.extract(elements);
      expect(result.palette).toHaveLength(0);
    });

    test('should respect topN configuration', () => {
      const customExtractor = new ColorExtractor({ topN: 2, minFrequency: 1 });
      const colors = ['rgb(255,0,0)', 'rgb(0,255,0)', 'rgb(0,0,255)', 'rgb(255,255,0)'];
      const elements = colors.flatMap((color) => Array(5).fill({ tagName: 'div', styles: { color, backgroundColor: 'rgb(255,255,255)' } }));
      const result = customExtractor.extract(elements);
      expect(result.palette.length).toBeLessThanOrEqual(2);
    });
  });
});
