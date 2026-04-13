/**
 * Integration Tests - AC 2-7
 * These are basic stubs for integration testing
 * Full integration tests require real website navigation (story 1.9)
 */

const AnalysisEngine = require('../src/engine/AnalysisEngine');
const BrowserManager = require('../src/engine/BrowserManager');
const DOMExtractor = require('../src/engine/DOMExtractor');

describe('Integration Tests', () => {
  describe('AnalysisEngine Initialization', () => {
    test('should initialize engine', async () => {
      const engine = new AnalysisEngine();
      expect(engine).toBeDefined();
      expect(engine.isInitialized).toBe(false);
    });

    test('should have all required components', () => {
      const engine = new AnalysisEngine();
      expect(engine.browserManager).toBeDefined();
      expect(engine.urlValidator).toBeDefined();
      expect(engine.sessionManager).toBeDefined();
      expect(engine.domExtractor).toBeDefined();
    });
  });

  describe('BrowserManager', () => {
    test('should initialize browser manager', () => {
      const manager = new BrowserManager();
      expect(manager.browser).toBeNull();
      expect(manager.pageTimeout).toBe(30000);
      expect(manager.navigationTimeout).toBe(15000);
    });

    test('should check memory', () => {
      const manager = new BrowserManager();
      const ok = manager.isMemoryOk(500); // High limit
      expect(typeof ok).toBe('boolean');
    });
  });

  describe('DOMExtractor', () => {
    test('should initialize extractor', () => {
      const extractor = new DOMExtractor();
      expect(extractor).toBeDefined();
      expect(extractor.tagsToFilter).toContain('script');
      expect(extractor.tagsToFilter).toContain('style');
    });

    test('should filter visible elements', () => {
      const extractor = new DOMExtractor();
      const elements = [
        { id: 'e1', isVisible: true },
        { id: 'e2', isVisible: false },
        { id: 'e3', isVisible: true },
      ];

      const visible = extractor.filterVisibleElements(elements);
      expect(visible).toHaveLength(2);
      expect(visible.every(e => e.isVisible)).toBe(true);
    });

    test('should extract color palette from elements', () => {
      const extractor = new DOMExtractor();
      // Use 3 elements per color to exceed default minFrequency (2)
      const elements = [
        { tagName: 'div', styles: { color: '#FF0000', backgroundColor: '#FFFFFF' } },
        { tagName: 'div', styles: { color: '#FF0000', backgroundColor: '#FFFFFF' } },
        { tagName: 'div', styles: { color: '#FF0000', backgroundColor: '#000000' } },
      ];

      const palette = extractor.extractColorPalette(elements);
      expect(palette).toHaveProperty('palette');
      expect(palette).toHaveProperty('totalColorsFound');
      expect(palette).toHaveProperty('accessibilityScore');
      expect(Array.isArray(palette.palette)).toBe(true);
    });

    test('should extract typography from elements', () => {
      const extractor = new DOMExtractor();
      const elements = [
        { styles: { fontFamily: 'Arial', fontSize: '16px' } },
        { styles: { fontFamily: 'Arial', fontSize: '14px' } },
        { styles: { fontFamily: 'Verdana', fontSize: '16px' } },
      ];

      const typography = extractor.extractTypography(elements);
      expect(typography.fonts).toBeDefined();
      expect(typography.sizes).toBeDefined();
      expect(typography.fonts.length).toBeGreaterThan(0);
    });
  });

  describe('Session Statistics', () => {
    test('should track session statistics', () => {
      const engine = new AnalysisEngine();
      const session1 = engine.sessionManager.createSession('https://example1.com');
      const session2 = engine.sessionManager.createSession('https://example2.com');

      engine.sessionManager.completeSession(session1.sessionId, { elementCount: 100 });

      const stats = engine.sessionManager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.active).toBe(1);
      expect(stats.totalElements).toBe(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle private IP rejection', () => {
      const engine = new AnalysisEngine();
      expect(() => {
        engine.urlValidator.validate('http://localhost');
      }).toThrow();
    });

    test('should handle invalid URL format', () => {
      const engine = new AnalysisEngine();
      expect(() => {
        engine.urlValidator.validate('not a url at all!!!');
      }).toThrow();
    });

    // HIGH-001: IPv6 SSRF prevention
    test('should block IPv6 localhost (SSRF HIGH-001)', () => {
      const engine = new AnalysisEngine();
      expect(() => {
        engine.urlValidator.validate('http://[::1]');
      }).toThrow();
    });

    // HIGH-001: Link-local SSRF (AWS metadata)
    test('should block link-local address 169.254.x.x (SSRF HIGH-001)', () => {
      const engine = new AnalysisEngine();
      expect(() => {
        engine.urlValidator.validate('http://169.254.169.254');
      }).toThrow();
    });

    // HIGH-002: Redirect SSRF - validator blocks private redirect target
    test('should block redirect to private IP (SSRF HIGH-002)', () => {
      const { NetworkError } = require('../src/utils/errors');
      const URLValidator = require('../src/engine/URLValidator');
      const v = new URLValidator();
      // isPrivateIP on redirect target should catch before following
      expect(v.isPrivateIP('http://169.254.169.254/metadata')).toBe(true);
      expect(v.isPrivateIP('http://[::1]/secret')).toBe(true);
    });
  });
});
