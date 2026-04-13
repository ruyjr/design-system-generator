/**
 * SessionManager Tests - AC 6
 */

const SessionManager = require('../src/engine/SessionManager');
const { SessionError } = require('../src/utils/errors');

describe('SessionManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  describe('createSession', () => {
    test('should create session with unique ID', () => {
      const session = manager.createSession('https://example.com');

      expect(session).toHaveProperty('sessionId');
      expect(session.sessionId).toMatch(/^sess_/);
      expect(session.url).toBe('https://example.com');
      expect(session.status).toBe('initializing');
    });

    test('should have metadata', () => {
      const session = manager.createSession('https://example.com');

      expect(session.metadata).toHaveProperty('viewport');
      expect(session.metadata.viewport.width).toBe(1920);
      expect(session.metadata.viewport.height).toBe(1080);
    });
  });

  describe('getSession', () => {
    test('should retrieve existing session', () => {
      const created = manager.createSession('https://example.com');
      const retrieved = manager.getSession(created.sessionId);

      expect(retrieved).toEqual(created);
    });

    test('should return null for non-existent session', () => {
      const result = manager.getSession('invalid-id');
      expect(result).toBeNull();
    });
  });

  describe('updateSessionStatus', () => {
    test('should update session status', () => {
      const session = manager.createSession('https://example.com');
      manager.updateSessionStatus(session.sessionId, 'analyzing');

      const updated = manager.getSession(session.sessionId);
      expect(updated.status).toBe('analyzing');
    });

    test('should throw on invalid session', () => {
      expect(() => {
        manager.updateSessionStatus('invalid-id', 'analyzing');
      }).toThrow(SessionError);
    });
  });

  describe('completeSession', () => {
    test('should complete session with results', () => {
      const session = manager.createSession('https://example.com');
      manager.completeSession(session.sessionId, {
        elementCount: 100,
        screenshotPath: '/tmp/screenshot.png',
      });

      const completed = manager.getSession(session.sessionId);
      expect(completed.status).toBe('complete');
      expect(completed.elementCount).toBe(100);
      expect(completed.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('listActiveSessions', () => {
    test('should list only active sessions', () => {
      const session1 = manager.createSession('https://example1.com');
      const session2 = manager.createSession('https://example2.com');
      manager.completeSession(session1.sessionId, {});

      const active = manager.listActiveSessions();
      expect(active).toContain(session2.sessionId);
      expect(active).not.toContain(session1.sessionId);
    });
  });

  describe('getStats', () => {
    test('should return correct statistics', () => {
      manager.createSession('https://example1.com');
      const session2 = manager.createSession('https://example2.com');
      manager.completeSession(session2.sessionId, { elementCount: 50 });

      const stats = manager.getStats();
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.completed).toBe(1);
    });
  });

  describe('cleanupOldSessions', () => {
    test('should cleanup old sessions', () => {
      const session = manager.createSession('https://example.com');

      // Manually set startTime to old date
      const oldSession = manager.getSession(session.sessionId);
      oldSession.startTime = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

      const cleaned = manager.cleanupOldSessions();
      expect(cleaned).toBe(1);

      const retrieved = manager.getSession(session.sessionId);
      expect(retrieved).toBeNull();
    });
  });
});
