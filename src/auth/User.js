"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAuthenticatedUser = toAuthenticatedUser;
exports.toUserSummary = toUserSummary;
function toAuthenticatedUser(user) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
    };
}
function toUserSummary(user) {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
    };
}
