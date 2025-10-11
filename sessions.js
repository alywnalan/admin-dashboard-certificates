// Simple in-memory session store. Replace with Redis/DB in production.

const tokenIdToSession = new Map();
const adminIdToSessions = new Map();

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function addSession({ tokenId, adminId, username, ip, userAgent, expiresAt }) {
  const sessionId = generateId();
  const session = {
    sessionId,
    tokenId,
    adminId,
    username,
    ip: ip || 'unknown',
    userAgent: userAgent || 'unknown',
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
    revoked: false
  };
  tokenIdToSession.set(tokenId, session);
  if (!adminIdToSessions.has(adminId)) adminIdToSessions.set(adminId, new Map());
  adminIdToSessions.get(adminId).set(sessionId, session);
  return session;
}

export function updateActivity(tokenId) {
  const session = tokenIdToSession.get(tokenId);
  if (session && !session.revoked) {
    session.lastActivityAt = new Date().toISOString();
  }
}

export function revokeBySessionId(adminId, sessionId) {
  const sessions = adminIdToSessions.get(adminId);
  if (!sessions) return false;
  const session = sessions.get(sessionId);
  if (!session) return false;
  session.revoked = true;
  tokenIdToSession.delete(session.tokenId);
  sessions.delete(sessionId);
  return true;
}

export function revokeByTokenId(tokenId) {
  const session = tokenIdToSession.get(tokenId);
  if (!session) return false;
  session.revoked = true;
  tokenIdToSession.delete(tokenId);
  const sessions = adminIdToSessions.get(session.adminId);
  if (sessions) sessions.delete(session.sessionId);
  return true;
}

export function isRevoked(tokenId) {
  return !tokenId || !tokenIdToSession.has(tokenId);
}

export function listSessionsForAdmin(adminId) {
  const sessions = adminIdToSessions.get(adminId);
  if (!sessions) return [];
  return Array.from(sessions.values())
    .sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt));
}


