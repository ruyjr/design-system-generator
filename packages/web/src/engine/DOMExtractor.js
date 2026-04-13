/**
 * DOM Extractor - AC 4: DOM Element Extraction
 * Extracts DOM elements with computed styles and relationships
 */

const { ExtractionError } = require('../utils/errors');
const logger = require('../utils/logger');

class DOMExtractor {
  constructor() {
    this.tagsToFilter = ['script', 'style', 'meta', 'noscript'];
  }

  /**
   * Extract all visible DOM elements from page
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<Array>} - Array of element objects
   */
  async extract(page) {
    try {
      logger.info('Starting DOM extraction');

      const elements = await page.evaluate(() => {
        const result = [];
        const visited = new Set();

        // Walk the DOM tree
        const walker = document.createTreeWalker(
          document.documentElement,
          NodeFilter.SHOW_ELEMENT,
          null,
          false
        );

        let node;
        while ((node = walker.nextNode())) {
          try {
            // Skip filtered tags
            if (['script', 'style', 'meta', 'noscript'].includes(node.tagName.toLowerCase())) {
              continue;
            }

            // Get bounding box
            const rect = node.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;

            // Get computed styles
            const styles = window.getComputedStyle(node);
            const extractedStyles = {
              color: styles.color,
              backgroundColor: styles.backgroundColor,
              fontSize: styles.fontSize,
              fontFamily: styles.fontFamily,
              fontWeight: styles.fontWeight,
              textAlign: styles.textAlign,
              display: styles.display,
              visibility: styles.visibility,
              opacity: styles.opacity,
              margin: styles.margin,
              padding: styles.padding,
              border: styles.border,
            };

            const element = {
              id: `elem_${Math.random().toString(36).substr(2, 9)}`,
              tagName: node.tagName.toLowerCase(),
              classes: Array.from(node.classList),
              text: node.textContent ? node.textContent.substring(0, 100) : '',
              boundingBox: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
              },
              isVisible,
              styles: extractedStyles,
            };

            result.push(element);
          } catch (err) {
            // Skip elements that can't be processed
            continue;
          }
        }

        return result;
      });

      logger.info('DOM extraction completed', { elementCount: elements.length });
      return elements;
    } catch (error) {
      logger.error('DOM extraction failed', { error: error.message });
      throw new ExtractionError('Failed to extract DOM elements', {
        originalError: error.message,
      });
    }
  }

  /**
   * Extract full-page HTML
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<string>} - HTML content
   */
  async extractHTML(page) {
    try {
      const html = await page.content();
      logger.debug('HTML extracted', { size: html.length });
      return html;
    } catch (error) {
      throw new ExtractionError('Failed to extract HTML', {
        originalError: error.message,
      });
    }
  }

  /**
   * Build element tree with parent-child relationships
   * @param {Array} elements - Flat array of elements
   * @returns {Array} - Tree-structured elements
   */
  buildElementTree(elements) {
    // For now, return flat structure
    // Full tree implementation would require DOM traversal context
    logger.debug('Building element tree', { elementCount: elements.length });
    return elements;
  }

  /**
   * Filter elements by visibility
   * @param {Array} elements - Array of elements
   * @returns {Array} - Filtered visible elements
   */
  filterVisibleElements(elements) {
    const visible = elements.filter(el => el.isVisible);
    logger.debug('Filtered visible elements', {
      total: elements.length,
      visible: visible.length,
    });
    return visible;
  }

  /**
   * Extract color palette from elements
   * @param {Array} elements - Array of elements
   * @returns {Object} - Color palette
   */
  extractColorPalette(elements) {
    const colors = new Set();

    elements.forEach(el => {
      if (el.styles.color && el.styles.color !== 'rgba(0, 0, 0, 0)') {
        colors.add(el.styles.color);
      }
      if (el.styles.backgroundColor && el.styles.backgroundColor !== 'rgba(0, 0, 0, 0)') {
        colors.add(el.styles.backgroundColor);
      }
    });

    const palette = {
      colors: Array.from(colors),
      count: colors.size,
    };

    logger.debug('Color palette extracted', { uniqueColors: palette.count });
    return palette;
  }

  /**
   * Extract typography information
   * @param {Array} elements - Array of elements
   * @returns {Object} - Typography info
   */
  extractTypography(elements) {
    const fonts = new Map();
    const sizes = new Map();

    elements.forEach(el => {
      const font = el.styles.fontFamily || 'system-default';
      const size = el.styles.fontSize || '16px';

      fonts.set(font, (fonts.get(font) || 0) + 1);
      sizes.set(size, (sizes.get(size) || 0) + 1);
    });

    const typography = {
      fonts: Array.from(fonts.entries()).map(([font, count]) => ({ font, count })),
      sizes: Array.from(sizes.entries()).map(([size, count]) => ({ size, count })),
    };

    logger.debug('Typography extracted', {
      uniqueFonts: typography.fonts.length,
      uniqueSizes: typography.sizes.length,
    });
    return typography;
  }
}

module.exports = DOMExtractor;
