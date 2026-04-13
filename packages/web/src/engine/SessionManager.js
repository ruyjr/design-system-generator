/**
 * Session Manager - AC 6: Session Management
 * Creates, tracks, and manages analysis sessions
 */

const { v4: uuidv4 } = require('uuid');
const { SessionError } = require('../utils/errors');
const logger = require('../utils/logger');

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  /**
   * Create a new analysis session
   * @param {string} url - Website URL being analyzed
   * @returns {Object} - Session object with metadata
   */
  createSession(url) {
    const sessionId = `sess_${uuidv4()}`;
    const session = {
      sessionId,
      url,
      status: 'initializing',
      startTime: new Date().toISOString(),
      endTime: null,
      duration: null,
      elementCount: 0,
      errorMessage: null,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
        viewport: { width: 1920, height: 1080 },
        screenshotPath: null,
      },
    };

    this.sessions.set(sessionId, session);
    logger.info('Session created', { sessionId, url });
    return session;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null} - Session object or null if not found
   */
  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return null;
    }
    return session;
  }

  /**
   * Update session status
   * @param {string} sessionId - Session ID
   * @param {string} status - New status
   * @param {Object} updates - Additional fields to update
   */
  updateSessionStatus(sessionId, status, updates = {}) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new SessionError('Session not found', { sessionId });
    }

    session.status = status;
    Object.assign(session, updates);
    logger.debug('Session updated', { sessionId, status, ...updates });
  }

  /**
   * Complete a session
   * @param {string} sessionId - Session ID
   * @param {Object} results - Analysis results
   */
  completeSession(sessionId, results = {}) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new SessionError('Session not found', { sessionId });
    }

    session.endTime = new Date().toISOString();
    session.duration = new Date(session.endTime) - new Date(session.startTime);
    session.status = results.error ? 'error' : 'complete';

    if (results.elementCount !== undefined) {
      session.elementCount = results.elementCount;
    }
    if (results.errorMessage !== undefined) {
      session.errorMessage = results.errorMessage;
    }
    if (results.screenshotPath !== undefined) {
      session.metadata.screenshotPath = results.screenshotPath;
    }

    logger.info('Session completed', {
      sessionId,
      status: session.status,
      duration: session.duration,
      elementCount: session.elementCount,
    });
  }

  /**
   * List all active sessions
   * @returns {Array} - Array of active session IDs
   */
  listActiveSessions() {
    const active = Array.from(this.sessions.entries())
      .filter(([, session]) => session.status !== 'complete' && session.status !== 'error')
      .map(([id]) => id);

    logger.debug('Listed active sessions', { count: active.length });
    return active;
  }

  /**
   * Cleanup old sessions (>24 hours)
   * @returns {number} - Number of sessions cleaned up
   */
  cleanupOldSessions() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const sessionStartTime = new Date(session.startTime).getTime();
      const sessionAge = now - sessionStartTime;

      if (sessionAge > this.sessionTimeout) {
        this.sessions.delete(sessionId);
        cleanedCount++;
        logger.debug('Cleaned old session', { sessionId, age: sessionAge });
      }
    }

    if (cleanedCount > 0) {
      logger.info('Cleanup completed', { cleanedCount, remainingSessions: this.sessions.size });
    }

    return cleanedCount;
  }

  /**
   * Get session statistics
   * @returns {Object} - Statistics about sessions
   */
  getStats() {
    const stats = {
      total: this.sessions.size,
      active: 0,
      completed: 0,
      error: 0,
      averageDuration: 0,
      totalElements: 0,
    };

    let totalDuration = 0;
    let completedCount = 0;

    for (const session of this.sessions.values()) {
      if (session.status === 'complete') {
        stats.completed++;
        if (session.duration) {
          totalDuration += session.duration;
          completedCount++;
        }
        stats.totalElements += session.elementCount;
      } else if (session.status === 'error') {
        stats.error++;
      } else {
        stats.active++;
      }
    }

    if (completedCount > 0) {
      stats.averageDuration = Math.round(totalDuration / completedCount);
    }

    return stats;
  }

  /**
   * Clear all sessions (mainly for testing)
   */
  clearAll() {
    this.sessions.clear();
    logger.debug('All sessions cleared');
  }
}

module.exports = SessionManager;
