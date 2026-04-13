/**
 * Error Classes Tests
 */

const {
  ValidationError,
  NetworkError,
  TimeoutError,
  BrowserError,
  ExtractionError,
  SessionError,
} = require('../src/utils/errors');

describe('Error Classes', () => {
  test('ValidationError should have correct properties', () => {
    const error = new ValidationError('Invalid URL', { url: 'invalid' });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details.url).toBe('invalid');
  });

  test('NetworkError should have correct properties', () => {
    const error = new NetworkError('Connection failed');

    expect(error.name).toBe('NetworkError');
    expect(error.code).toBe('NETWORK_ERROR');
  });

  test('TimeoutError should have correct properties', () => {
    const error = new TimeoutError('Request timed out');

    expect(error.name).toBe('TimeoutError');
    expect(error.code).toBe('TIMEOUT_ERROR');
  });

  test('BrowserError should have correct properties', () => {
    const error = new BrowserError('Browser failed');

    expect(error.name).toBe('BrowserError');
    expect(error.code).toBe('BROWSER_ERROR');
  });

  test('ExtractionError should have correct properties', () => {
    const error = new ExtractionError('Extraction failed');

    expect(error.name).toBe('ExtractionError');
    expect(error.code).toBe('EXTRACTION_ERROR');
  });

  test('SessionError should have correct properties', () => {
    const error = new SessionError('Session not found', { sessionId: 'invalid' });

    expect(error.name).toBe('SessionError');
    expect(error.code).toBe('SESSION_ERROR');
    expect(error.details.sessionId).toBe('invalid');
  });

  test('errors should have timestamp', () => {
    const error = new ValidationError('Test');
    expect(error.timestamp).toBeDefined();
    expect(new Date(error.timestamp)).toBeInstanceOf(Date);
  });
});
