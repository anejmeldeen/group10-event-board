"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnexpectedDependencyError = exports.ValidationError = exports.ProtectedUserOperation = exports.UserNotFound = exports.UserAlreadyExists = exports.AuthorizationRequired = exports.AuthenticationRequired = exports.InvalidCredentials = void 0;
const InvalidCredentials = (message) => ({
    name: "InvalidCredentials",
    message,
});
exports.InvalidCredentials = InvalidCredentials;
const AuthenticationRequired = (message) => ({
    name: "AuthenticationRequired",
    message,
});
exports.AuthenticationRequired = AuthenticationRequired;
const AuthorizationRequired = (message) => ({
    name: "AuthorizationRequired",
    message,
});
exports.AuthorizationRequired = AuthorizationRequired;
const UserAlreadyExists = (message) => ({
    name: "UserAlreadyExists",
    message,
});
exports.UserAlreadyExists = UserAlreadyExists;
const UserNotFound = (message) => ({
    name: "UserNotFound",
    message,
});
exports.UserNotFound = UserNotFound;
const ProtectedUserOperation = (message) => ({
    name: "ProtectedUserOperation",
    message,
});
exports.ProtectedUserOperation = ProtectedUserOperation;
const ValidationError = (message) => ({
    name: "ValidationError",
    message,
});
exports.ValidationError = ValidationError;
const UnexpectedDependencyError = (message) => ({
    name: "UnexpectedDependencyError",
    message,
});
exports.UnexpectedDependencyError = UnexpectedDependencyError;
