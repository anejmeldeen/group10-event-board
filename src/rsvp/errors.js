"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RsvpRepositoryError = exports.RsvpInvalidEventState = exports.RsvpNotAllowed = exports.RsvpEventNotFound = void 0;
const RsvpEventNotFound = (message) => ({
    name: "RsvpEventNotFound",
    message,
});
exports.RsvpEventNotFound = RsvpEventNotFound;
const RsvpNotAllowed = (message) => ({
    name: "RsvpNotAllowed",
    message,
});
exports.RsvpNotAllowed = RsvpNotAllowed;
const RsvpInvalidEventState = (message) => ({
    name: "RsvpInvalidEventState",
    message,
});
exports.RsvpInvalidEventState = RsvpInvalidEventState;
const RsvpRepositoryError = (message) => ({
    name: "RsvpRepositoryError",
    message,
});
exports.RsvpRepositoryError = RsvpRepositoryError;
