/**
 * Design System Generator - Web Analysis Engine
 * Main module export
 */

const AnalysisEngine = require('./engine/AnalysisEngine');
const BrowserManager = require('./engine/BrowserManager');
const URLValidator = require('./engine/URLValidator');
const SessionManager = require('./engine/SessionManager');
const DOMExtractor = require('./engine/DOMExtractor');
const logger = require('./utils/logger');
const {
  AnalysisError,
  ValidationError,
  NetworkError,
  TimeoutError,
  BrowserError,
  ExtractionError,
  SessionError,
} = require('./utils/errors');

module.exports = {
  // Main engine
  AnalysisEngine,

  // Components
  BrowserManager,
  URLValidator,
  SessionManager,
  DOMExtractor,

  // Utilities
  logger,

  // Errors
  AnalysisError,
  ValidationError,
  NetworkError,
  TimeoutError,
  BrowserError,
  ExtractionError,
  SessionError,
};
