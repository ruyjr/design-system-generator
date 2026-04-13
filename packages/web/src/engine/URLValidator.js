/**
 * URL Validator - AC 3: URL Validation
 * Validates, normalizes, and handles URL redirects
 */

const { ValidationError, NetworkError } = require('../utils/errors');
const logger = require('../utils/logger');

class URLValidator {
  constructor() {
    this.maxRedirects = 5;
    this.redirectCount = 0;
  }

  /**
   * Validate URL format and content rules
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid
   */
  isValid(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalize URL: add protocol, clean up
   * @param {string} url - URL to normalize
   * @returns {string} - Normalized URL
   */
  normalize(url) {
    let normalized = url.trim();

    // Add protocol if missing
    if (!normalized.match(/^https?:\/\//i)) {
      normalized = `https://${normalized}`;
    }

    // Remove trailing slash for consistency
    normalized = normalized.replace(/\/$/, '');

    return normalized;
  }

  /**
   * Check if URL is a private IP address
   * @param {string} url - URL to check
   * @returns {boolean} - True if private IP
   */
  isPrivateIP(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // IPv4 localhost and unspecified
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
        return true;
      }

      // IPv6 localhost (::1 with or without brackets)
      if (hostname === '::1' || hostname === '[::1]') {
        return true;
      }

      // Strip IPv6 brackets for range checks
      const bare = hostname.replace(/^\[|\]$/g, '');

      // IPv6 loopback / unspecified
      if (bare === '::1' || bare === '::' || bare === '0:0:0:0:0:0:0:1') {
        return true;
      }

      // Private IPv4 ranges
      const privateRanges = [
        /^10\./,                           // 10.0.0.0/8
        /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16.0.0/12
        /^192\.168\./,                     // 192.168.0.0/16
        /^169\.254\./,                     // 169.254.0.0/16 (link-local / AWS metadata)
      ];

      return privateRanges.some((range) => range.test(bare));
    } catch {
      return false;
    }
  }

  /**
   * Follow HTTP redirects
   * @param {string} url - Initial URL
   * @returns {Promise<string>} - Final URL after redirects
   */
  async followRedirects(url) {
    this.redirectCount = 0;
    return this._followRedirectsRecursive(url);
  }

  async _followRedirectsRecursive(url) {
    if (this.redirectCount >= this.maxRedirects) {
      throw new NetworkError('Too many redirects', {
        url,
        redirectCount: this.redirectCount,
      });
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        timeout: 10000,
      });

      // Handle redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const redirectUrl = response.headers.get('location');
        if (!redirectUrl) {
          throw new NetworkError('Redirect without location header', { url });
        }

        // SECURITY: block redirects to private/local addresses (SSRF prevention)
        if (this.isPrivateIP(redirectUrl)) {
          throw new NetworkError('Redirect to private address blocked (SSRF prevention)', {
            from: url,
            to: redirectUrl,
          });
        }

        this.redirectCount += 1;
        logger.info('Following redirect', { from: url, to: redirectUrl });
        return this._followRedirectsRecursive(redirectUrl);
      }

      // Check for successful response
      if (response.status < 200 || response.status >= 300) {
        throw new NetworkError(`HTTP ${response.status}`, { url });
      }

      return url;
    } catch (error) {
      if (error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError(error.message, { url });
    }
  }

  /**
   * Validate URL with all checks
   * @param {string} url - URL to validate
   * @throws {ValidationError} - If validation fails
   * @returns {string} - Normalized, validated URL
   */
  validate(url) {
    logger.debug('Validating URL', { url });

    // Normalize
    const normalized = this.normalize(url);
    logger.debug('URL normalized', { original: url, normalized });

    // Check format
    if (!this.isValid(normalized)) {
      throw new ValidationError('Invalid URL format', { url: normalized });
    }

    // Check for private IP
    if (this.isPrivateIP(normalized)) {
      throw new ValidationError('URL points to private/local address', {
        url: normalized,
      });
    }

    logger.info('URL validated successfully', { url: normalized });
    return normalized;
  }
}

module.exports = URLValidator;
