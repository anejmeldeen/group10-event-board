"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialAppSession = createInitialAppSession;
exports.recordPageView = recordPageView;
exports.touchAppSession = touchAppSession;
exports.signInAuthenticatedUser = signInAuthenticatedUser;
exports.signOutAuthenticatedUser = signOutAuthenticatedUser;
exports.getAuthenticatedUser = getAuthenticatedUser;
exports.isAuthenticatedSession = isAuthenticatedSession;
const node_crypto_1 = require("node:crypto");
function createBrowserLabel(browserId) {
    return `Browser ${browserId.slice(0, 4).toUpperCase()}`;
}
function createInitialAppSession(now = new Date(), browserId = (0, node_crypto_1.randomUUID)()) {
    const timestamp = now.toISOString();
    return {
        browserId,
        browserLabel: createBrowserLabel(browserId),
        visitCount: 0,
        createdAt: timestamp,
        lastSeenAt: timestamp,
        authenticatedUser: null,
    };
}
function ensureAppSession(store, now = new Date()) {
    if (!store.app) {
        store.app = createInitialAppSession(now);
    }
    return store.app;
}
function snapshotSession(session) {
    return { ...session };
}
function recordPageView(store, now = new Date()) {
    const session = ensureAppSession(store, now);
    session.visitCount += 1;
    session.lastSeenAt = now.toISOString();
    return snapshotSession(session);
}
function touchAppSession(store, now = new Date()) {
    const session = ensureAppSession(store, now);
    session.lastSeenAt = now.toISOString();
    return snapshotSession(session);
}
// The session stores authenticated identity only; passwords stay out of the session.
function signInAuthenticatedUser(store, user, now = new Date()) {
    const session = ensureAppSession(store, now);
    session.authenticatedUser = {
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        signedInAt: now.toISOString(),
    };
    session.lastSeenAt = now.toISOString();
    return snapshotSession(session);
}
function signOutAuthenticatedUser(store, now = new Date()) {
    const session = ensureAppSession(store, now);
    session.authenticatedUser = null;
    session.lastSeenAt = now.toISOString();
    return snapshotSession(session);
}
function getAuthenticatedUser(store, now = new Date()) {
    return ensureAppSession(store, now).authenticatedUser;
}
function isAuthenticatedSession(store, now = new Date()) {
    return getAuthenticatedUser(store, now) !== null;
}
