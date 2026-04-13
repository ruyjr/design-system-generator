/**
 * Analysis Engine - AC 1: Web Analysis Engine Initialization
 * Main orchestrator for website visual analysis
 */

const BrowserManager = require('./BrowserManager');
const URLValidator = require('./URLValidator');
const SessionManager = require('./SessionManager');
const DOMExtractor = require('./DOMExtractor');
const { BrowserError } = require('../utils/errors');
const logger = require('../utils/logger');

class AnalysisEngine {
  constructor(options = {}) {
    this.browserManager = new BrowserManager();
    this.urlValidator = new URLValidator();
    this.sessionManager = new SessionManager();
    this.domExtractor = new DOMExtractor();
    this.maxRetries = 3;
    this.memoryLimit = 200; // MB
    this.isInitialized = false;
  }

  /**
   * Initialize the engine
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      logger.info('Initializing AnalysisEngine');
      await this.browserManager.launch();
      this.isInitialized = true;
      logger.info('AnalysisEngine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AnalysisEngine', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze a website
   * @param {string} url - URL to analyze
   * @returns {Promise<Object>} - Analysis results with session data
   */
  async analyze(url) {
    // Validate initialization
    if (!this.isInitialized) {
      throw new BrowserError('AnalysisEngine not initialized. Call initialize() first.');
    }

    let session = null;
    let page = null;

    try {
      // Validate URL
      const validatedUrl = this.urlValidator.validate(url);

      // Create session
      session = this.sessionManager.createSession(validatedUrl);

      // Check memory
      if (!this.browserManager.isMemoryOk(this.memoryLimit)) {
        throw new BrowserError('Memory limit exceeded', { memoryLimit: this.memoryLimit });
      }

      // Navigate to URL with retries
      page = await this._navigateWithRetries(validatedUrl, session);

      // Extract DOM
      this.sessionManager.updateSessionStatus(session.sessionId, 'extracting');
      const elements = await this.domExtractor.extract(page);

      // Take screenshot
      const screenshotPath = await this.browserManager.takeScreenshot(page);

      // Extract additional data
      const colorPalette = this.domExtractor.extractColorPalette(elements);
      const typography = this.domExtractor.extractTypography(elements);

      // Complete session
      this.sessionManager.completeSession(session.sessionId, {
        elementCount: elements.length,
        screenshotPath,
      });

      logger.info('Analysis completed successfully', {
        sessionId: session.sessionId,
        elementCount: elements.length,
      });

      return {
        sessionId: session.sessionId,
        url: validatedUrl,
        status: 'success',
        elements,
        colorPalette,
        typography,
        screenshotPath,
        duration: new Date(session.endTime) - new Date(session.startTime),
      };
    } catch (error) {
      // Handle error
      if (session) {
        this.sessionManager.completeSession(session.sessionId, {
          error: true,
          errorMessage: error.message,
        });
      }

      logger.error('Analysis failed', { url, error: error.message });
      throw error;
    } finally {
      // Cleanup
      if (page) {
        await this.browserManager.closePage(page);
      }
    }
  }

  /**
   * Navigate to URL with retry logic
   * @private
   * @param {string} url - URL to navigate
   * @param {Object} session - Session object
   * @returns {Promise<Page>} - Puppeteer page object
   */
  async _navigateWithRetries(url, session) {
    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.sessionManager.updateSessionStatus(session.sessionId, 'navigating', {
          attempt,
        });

        const page = await this.browserManager.navigate(url);
        return page;
      } catch (error) {
        lastError = error;
        logger.warn('Navigation attempt failed', {
          attempt,
          maxRetries: this.maxRetries,
          error: error.message,
        });

        if (attempt < this.maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Session object
   */
  getSession(sessionId) {
    return this.sessionManager.getSession(sessionId);
  }

  /**
   * List active sessions
   * @returns {Array} - Active session IDs
   */
  listActiveSessions() {
    return this.sessionManager.listActiveSessions();
  }

  /**
   * Get engine statistics
   * @returns {Object} - Statistics
   */
  getStats() {
    return {
      sessions: this.sessionManager.getStats(),
      memory: this.browserManager.getMemoryUsage(),
    };
  }

  /**
   * Cleanup old sessions
   * @returns {number} - Number of cleaned sessions
   */
  cleanup() {
    return this.sessionManager.cleanupOldSessions();
  }

  /**
   * Shutdown the engine
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      logger.info('Shutting down AnalysisEngine');
      this.cleanup();
      await this.browserManager.close();
      this.isInitialized = false;
      logger.info('AnalysisEngine shutdown complete');
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
      throw error;
    }
  }
}

module.exports = AnalysisEngine;
