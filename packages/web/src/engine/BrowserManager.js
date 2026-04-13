/**
 * Browser Manager - AC 1 & AC 2: Browser Lifecycle Management
 * Handles Puppeteer browser instance and page operations
 */

const puppeteer = require('puppeteer');
const { BrowserError, TimeoutError } = require('../utils/errors');
const logger = require('../utils/logger');

class BrowserManager {
  constructor() {
    this.browser = null;
    this.pageTimeout = 30000; // 30 seconds
    this.navigationTimeout = 15000; // 15 seconds
  }

  /**
   * Launch headless browser
   * @param {Object} options - Puppeteer launch options
   * @returns {Promise<void>}
   */
  async launch(options = {}) {
    try {
      const launchOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage', // Reduce memory usage
        ],
        ...options,
      };

      this.browser = await puppeteer.launch(launchOptions);
      logger.info('Browser launched successfully');
    } catch (error) {
      logger.error('Failed to launch browser', { error: error.message });
      throw new BrowserError('Failed to launch browser', {
        originalError: error.message,
      });
    }
  }

  /**
   * Navigate to URL and wait for page load
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   * @returns {Promise<Page>} - Puppeteer page object
   */
  async navigate(url, options = {}) {
    if (!this.browser) {
      throw new BrowserError('Browser not initialized. Call launch() first.');
    }

    try {
      const page = await this.browser.newPage();
      page.setDefaultTimeout(this.pageTimeout);
      page.setDefaultNavigationTimeout(this.navigationTimeout);

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      logger.info('Navigating to URL', { url });

      // Navigate with error handling
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        ...options,
      });

      // Check response status
      if (!response) {
        throw new BrowserError('Navigation failed - no response', { url });
      }

      const status = response.status();
      if (status < 200 || status >= 300) {
        throw new BrowserError(`HTTP ${status}`, { url, status });
      }

      logger.info('Navigation successful', { url, status });
      return page;
    } catch (error) {
      logger.error('Navigation failed', { url, error: error.message });

      if (error.message.includes('timeout')) {
        throw new TimeoutError(`Navigation timeout for ${url}`, { url });
      }

      throw new BrowserError('Navigation failed', {
        url,
        originalError: error.message,
      });
    }
  }

  /**
   * Take full-page screenshot
   * @param {Page} page - Puppeteer page object
   * @param {string} outputPath - Path to save screenshot
   * @returns {Promise<string>} - Path to saved screenshot
   */
  async takeScreenshot(page, outputPath = null) {
    try {
      const screenshotPath = outputPath || `/tmp/screenshot_${Date.now()}.png`;

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      logger.info('Screenshot captured', { path: screenshotPath });
      return screenshotPath;
    } catch (error) {
      logger.error('Failed to capture screenshot', { error: error.message });
      throw new BrowserError('Failed to capture screenshot', {
        originalError: error.message,
      });
    }
  }

  /**
   * Close a page
   * @param {Page} page - Puppeteer page object
   * @returns {Promise<void>}
   */
  async closePage(page) {
    try {
      await page.close();
      logger.debug('Page closed');
    } catch (error) {
      logger.warn('Error closing page', { error: error.message });
    }
  }

  /**
   * Close browser
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        logger.info('Browser closed');
      }
    } catch (error) {
      logger.error('Error closing browser', { error: error.message });
      throw new BrowserError('Failed to close browser', {
        originalError: error.message,
      });
    }
  }

  /**
   * Get memory usage
   * @returns {Object} - Memory statistics
   */
  getMemoryUsage() {
    return process.memoryUsage();
  }

  /**
   * Check memory limit
   * @param {number} limitMB - Memory limit in MB
   * @returns {boolean} - True if under limit
   */
  isMemoryOk(limitMB = 200) {
    const used = this.getMemoryUsage().heapUsed / 1024 / 1024;
    const ok = used < limitMB;

    if (!ok) {
      logger.warn('Memory limit exceeded', { used: Math.round(used), limit: limitMB });
    }

    return ok;
  }
}

module.exports = BrowserManager;
