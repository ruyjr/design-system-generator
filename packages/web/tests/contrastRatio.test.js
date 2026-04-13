/**
 * WCAG Contrast Ratio Tests - AC 4
 * Known values from W3C WCAG 2.1 spec and Contrast Checker tools
 */

const ColorExtractor = require('../src/extractors/ColorExtractor');

describe('WCAG Contrast Ratio — AC 4', () => {
  let extractor;

  beforeEach(() => {
    extractor = new ColorExtractor();
  });

  // ─── calculateLuminance — known W3C values ─────────────────────────────

  describe('calculateLuminance() — W3C spec values', () => {
    test('white (#FFFFFF) luminance = 1.0', () => {
      expect(extractor.calculateLuminance('#FFFFFF')).toBeCloseTo(1.0, 4);
    });

    test('black (#000000) luminance = 0.0', () => {
      expect(extractor.calculateLuminance('#000000')).toBeCloseTo(0.0, 4);
    });

    test('pure red (#FF0000) luminance ≈ 0.2126', () => {
      expect(extractor.calculateLuminance('#FF0000')).toBeCloseTo(0.2126, 3);
    });

    test('pure green (#00FF00) luminance ≈ 0.7152', () => {
      expect(extractor.calculateLuminance('#00FF00')).toBeCloseTo(0.7152, 3);
    });

    test('pure blue (#0000FF) luminance ≈ 0.0722', () => {
      expect(extractor.calculateLuminance('#0000FF')).toBeCloseTo(0.0722, 3);
    });

    test('mid-gray (#808080) luminance should be ~0.216', () => {
      const l = extractor.calculateLuminance('#808080');
      expect(l).toBeGreaterThan(0.2);
      expect(l).toBeLessThan(0.25);
    });

    test('luminance should be monotonically increasing with lightness', () => {
      const l1 = extractor.calculateLuminance('#333333');
      const l2 = extractor.calculateLuminance('#666666');
      const l3 = extractor.calculateLuminance('#999999');
      expect(l1).toBeLessThan(l2);
      expect(l2).toBeLessThan(l3);
    });
  });

  // ─── calculateContrast — known pairs ─────────────────────────────────────

  describe('calculateContrast() — known pairs', () => {
    test('white vs black: ratio ≈ 21:1, level AAA', () => {
      const { ratio, level } = extractor.calculateContrast('#FFFFFF', '#000000');
      expect(ratio).toBeCloseTo(21, 0);
      expect(level).toBe('AAA');
    });

    test('black vs white: same ratio (symmetric)', () => {
      const { ratio } = extractor.calculateContrast('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    test('#767676 on white: ratio ≈ 4.54 → AA', () => {
      // WebAIM confirmed: #767676 passes AA minimum (4.5:1)
      const { ratio, level } = extractor.calculateContrast('#767676', '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(['AA', 'AAA']).toContain(level);
    });

    test('#949494 on white: fails AA (ratio < 4.5)', () => {
      // WebAIM confirmed: #949494 fails AA
      const { ratio, level } = extractor.calculateContrast('#949494', '#FFFFFF');
      expect(ratio).toBeLessThan(4.5);
      expect(['FAIL', 'AA-large']).toContain(level);
    });

    test('same color vs itself: ratio = 1, level FAIL', () => {
      const { ratio, level } = extractor.calculateContrast('#FF0000', '#FF0000');
      expect(ratio).toBe(1);
      expect(level).toBe('FAIL');
    });

    test('AA-large threshold: ratio >= 3 and < 4.5', () => {
      // Find a pair that's between 3:1 and 4.5:1
      const { ratio, level } = extractor.calculateContrast('#777777', '#FFFFFF');
      if (ratio >= 3 && ratio < 4.5) {
        expect(level).toBe('AA-large');
      } else if (ratio >= 4.5) {
        expect(['AA', 'AAA']).toContain(level);
      } else {
        expect(level).toBe('FAIL');
      }
    });
  });

  // ─── Level thresholds ────────────────────────────────────────────────────

  describe('WCAG level thresholds', () => {
    test('AAA requires ratio >= 7', () => {
      // Black on white is 21:1
      const { level } = extractor.calculateContrast('#000000', '#FFFFFF');
      expect(level).toBe('AAA');
    });

    test('FAIL requires ratio < 3', () => {
      // Very similar greys
      const { level } = extractor.calculateContrast('#F0F0F0', '#FFFFFF');
      expect(level).toBe('FAIL');
    });
  });

  // ─── analyzeContrast integration ─────────────────────────────────────────

  describe('analyzeContrast()', () => {
    test('should detect and list all failing pairs', () => {
      const elements = [
        { tagName: 'p', styles: { color: 'rgb(200,200,200)', backgroundColor: 'rgb(255,255,255)' } },
        { tagName: 'p', styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' } },
      ];
      const freqMap = extractor.analyzeFrequency(elements);
      const categorized = extractor.categorize(freqMap, elements);
      const { contrastFailures } = extractor.analyzeContrast(categorized, elements);

      // Light grey on white should fail
      const hasFailure = contrastFailures.some((f) => f.text === '#C8C8C8' && f.background === '#FFFFFF');
      expect(hasFailure).toBe(true);
    });

    test('should not list passing pairs in contrastFailures', () => {
      const elements = Array(5).fill({
        tagName: 'p',
        styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' },
      });
      const freqMap = extractor.analyzeFrequency(elements);
      const categorized = extractor.categorize(freqMap, elements);
      const { contrastFailures } = extractor.analyzeContrast(categorized, elements);

      // Black on white passes, should not be in failures
      const hasBlackOnWhite = contrastFailures.some(
        (f) => f.text === '#000000' && f.background === '#FFFFFF',
      );
      expect(hasBlackOnWhite).toBe(false);
    });

    test('accessibility score should be 100% when all pairs pass', () => {
      const elements = Array(5).fill({
        tagName: 'p',
        styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' },
      });
      const freqMap = extractor.analyzeFrequency(elements);
      const categorized = extractor.categorize(freqMap, elements);
      const { accessibilityScore } = extractor.analyzeContrast(categorized, elements);
      expect(accessibilityScore).toBe(100);
    });

    test('accessibility score should be 0% when all pairs fail', () => {
      const elements = Array(5).fill({
        tagName: 'p',
        styles: { color: 'rgb(240,240,240)', backgroundColor: 'rgb(255,255,255)' },
      });
      const freqMap = extractor.analyzeFrequency(elements);
      const categorized = extractor.categorize(freqMap, elements);
      const { accessibilityScore } = extractor.analyzeContrast(categorized, elements);
      expect(accessibilityScore).toBe(0);
    });

    test('should deduplicate contrast pairs', () => {
      // Same text/bg pair repeated in multiple elements
      const elements = Array(10).fill({
        tagName: 'p',
        styles: { color: 'rgb(0,0,0)', backgroundColor: 'rgb(255,255,255)' },
      });
      const freqMap = extractor.analyzeFrequency(elements);
      const categorized = extractor.categorize(freqMap, elements);
      const { contrastPairs } = extractor.analyzeContrast(categorized, elements);

      const blackOnWhite = contrastPairs.filter(
        (p) => p.text === '#000000' && p.background === '#FFFFFF',
      );
      expect(blackOnWhite.length).toBe(1); // deduplicated
    });
  });
});
