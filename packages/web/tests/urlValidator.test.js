/**
 * URLValidator Tests - AC 3
 */

const URLValidator = require('../src/engine/URLValidator');
const { ValidationError, NetworkError } = require('../src/utils/errors');

// Mock fetch globally for redirect tests
global.fetch = jest.fn();

describe('URLValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new URLValidator();
    jest.clearAllMocks();
  });

  describe('isValid', () => {
    test('should validate correct URLs', () => {
      expect(validator.isValid('https://example.com')).toBe(true);
      expect(validator.isValid('http://example.com')).toBe(true);
    });

    test('should reject invalid URLs', () => {
      expect(validator.isValid('not a url')).toBe(false);
      expect(validator.isValid('example')).toBe(false);
    });
  });

  describe('normalize', () => {
    test('should add protocol if missing', () => {
      const result = validator.normalize('example.com');
      expect(result).toMatch(/^https?:\/\//);
    });

    test('should remove trailing slash', () => {
      const result = validator.normalize('https://example.com/');
      expect(result).toBe('https://example.com');
    });

    test('should trim whitespace', () => {
      const result = validator.normalize('  https://example.com  ');
      expect(result).toBe('https://example.com');
    });
  });

  describe('isPrivateIP', () => {
    test('should detect localhost IPv4', () => {
      expect(validator.isPrivateIP('http://localhost')).toBe(true);
      expect(validator.isPrivateIP('http://127.0.0.1')).toBe(true);
      expect(validator.isPrivateIP('http://0.0.0.0')).toBe(true);
    });

    // HIGH-001 fix: IPv6 localhost must be blocked
    test('should detect IPv6 localhost (SSRF prevention)', () => {
      expect(validator.isPrivateIP('http://[::1]')).toBe(true);
      expect(validator.isPrivateIP('http://[::1]:8080')).toBe(true);
    });

    test('should detect private IPv4 ranges', () => {
      expect(validator.isPrivateIP('http://10.0.0.1')).toBe(true);
      expect(validator.isPrivateIP('http://192.168.1.1')).toBe(true);
      expect(validator.isPrivateIP('http://172.16.0.1')).toBe(true);
    });

    // Link-local / AWS metadata endpoint
    test('should detect link-local range (169.254.x.x)', () => {
      expect(validator.isPrivateIP('http://169.254.169.254')).toBe(true);
    });

    test('should allow public IPs', () => {
      expect(validator.isPrivateIP('http://8.8.8.8')).toBe(false);
      expect(validator.isPrivateIP('https://example.com')).toBe(false);
    });
  });

  describe('followRedirects', () => {
    test('should return URL when no redirect', async () => {
      global.fetch.mockResolvedValue({ status: 200, headers: { get: () => null } });
      const result = await validator.followRedirects('https://example.com');
      expect(result).toBe('https://example.com');
    });

    test('should follow single redirect', async () => {
      global.fetch
        .mockResolvedValueOnce({
          status: 301,
          headers: { get: () => 'https://new.example.com' },
        })
        .mockResolvedValueOnce({ status: 200, headers: { get: () => null } });

      const result = await validator.followRedirects('https://example.com');
      expect(result).toBe('https://new.example.com');
    });

    test('should throw on too many redirects', async () => {
      global.fetch.mockResolvedValue({
        status: 301,
        headers: { get: () => 'https://redirect.com' },
      });

      const { NetworkError } = require('../src/utils/errors');
      await expect(validator.followRedirects('https://example.com')).rejects.toThrow(NetworkError);
    });

    test('should throw on redirect without location header', async () => {
      global.fetch.mockResolvedValue({ status: 301, headers: { get: () => null } });

      const { NetworkError } = require('../src/utils/errors');
      await expect(validator.followRedirects('https://example.com')).rejects.toThrow(NetworkError);
    });

    // HIGH-002: block redirect to private IP
    test('should block redirect to private address (SSRF HIGH-002)', async () => {
      global.fetch.mockResolvedValue({
        status: 301,
        headers: { get: () => 'http://169.254.169.254/metadata' },
      });

      const { NetworkError } = require('../src/utils/errors');
      await expect(validator.followRedirects('https://example.com')).rejects.toThrow(NetworkError);
    });

    test('should throw NetworkError on fetch failure', async () => {
      global.fetch.mockRejectedValue(new Error('connection refused'));

      const { NetworkError } = require('../src/utils/errors');
      await expect(validator.followRedirects('https://example.com')).rejects.toThrow(NetworkError);
    });

    test('should throw on non-2xx non-redirect response', async () => {
      global.fetch.mockResolvedValue({ status: 404, headers: { get: () => null } });

      const { NetworkError } = require('../src/utils/errors');
      await expect(validator.followRedirects('https://example.com')).rejects.toThrow(NetworkError);
    });
  });

  describe('validate', () => {
    test('should validate correct public URLs', () => {
      expect(() => {
        validator.validate('https://example.com');
      }).not.toThrow();
    });

    test('should throw on invalid format', () => {
      expect(() => {
        validator.validate('not a url');
      }).toThrow(ValidationError);
    });

    test('should throw on private IP', () => {
      expect(() => {
        validator.validate('http://localhost');
      }).toThrow(ValidationError);
    });

    test('should normalize and return URL', () => {
      const result = validator.validate('example.com');
      expect(result).toMatch(/^https?:\/\/example\.com/);
    });
  });
});
