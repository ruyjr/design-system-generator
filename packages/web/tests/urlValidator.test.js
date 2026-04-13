/**
 * URLValidator Tests - AC 3
 */

const URLValidator = require('../src/engine/URLValidator');
const { ValidationError, NetworkError } = require('../src/utils/errors');

describe('URLValidator', () => {
  let validator;

  beforeEach(() => {
    validator = new URLValidator();
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
    test('should detect localhost', () => {
      expect(validator.isPrivateIP('http://localhost')).toBe(true);
      expect(validator.isPrivateIP('http://127.0.0.1')).toBe(true);
    });

    test('should detect private IP ranges', () => {
      expect(validator.isPrivateIP('http://10.0.0.1')).toBe(true);
      expect(validator.isPrivateIP('http://192.168.1.1')).toBe(true);
      expect(validator.isPrivateIP('http://172.16.0.1')).toBe(true);
    });

    test('should allow public IPs', () => {
      expect(validator.isPrivateIP('http://8.8.8.8')).toBe(false);
      expect(validator.isPrivateIP('https://example.com')).toBe(false);
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
