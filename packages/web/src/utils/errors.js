/**
 * Custom Error Classes for Analysis Engine
 */

class AnalysisError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

class ValidationError extends AnalysisError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class NetworkError extends AnalysisError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

class TimeoutError extends AnalysisError {
  constructor(message, details = {}) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

class BrowserError extends AnalysisError {
  constructor(message, details = {}) {
    super(message, 'BROWSER_ERROR', details);
    this.name = 'BrowserError';
  }
}

class ExtractionError extends AnalysisError {
  constructor(message, details = {}) {
    super(message, 'EXTRACTION_ERROR', details);
    this.name = 'ExtractionError';
  }
}

class SessionError extends AnalysisError {
  constructor(message, details = {}) {
    super(message, 'SESSION_ERROR', details);
    this.name = 'SessionError';
  }
}

module.exports = {
  AnalysisError,
  ValidationError,
  NetworkError,
  TimeoutError,
  BrowserError,
  ExtractionError,
  SessionError,
};
