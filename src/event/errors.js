"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnexpectedDependencyError = exports.FieldTooLong = exports.FieldTooShort = exports.MissingRequiredField = exports.InvalidCapacity = exports.InvalidDateFormat = exports.StartDateInPast = exports.EndBeforeStart = exports.EventInvalidState = exports.EventNotAuthorized = exports.EventNotFound = exports.ValidationError = void 0;
const ValidationError = (message, field) => ({
    name: "ValidationError",
    message,
    field,
});
exports.ValidationError = ValidationError;
const EventNotFound = (message) => ({
    name: "EventNotFound",
    message,
});
exports.EventNotFound = EventNotFound;
const EventNotAuthorized = (message) => ({
    name: "EventNotAuthorized",
    message,
});
exports.EventNotAuthorized = EventNotAuthorized;
const EventInvalidState = (message) => ({
    name: "EventInvalidState",
    message,
});
exports.EventInvalidState = EventInvalidState;
const EndBeforeStart = (message) => ({
    name: "EndBeforeStart",
    message,
});
exports.EndBeforeStart = EndBeforeStart;
const StartDateInPast = (message) => ({
    name: "StartDateInPast",
    message,
});
exports.StartDateInPast = StartDateInPast;
const InvalidDateFormat = (message, field) => ({
    name: "InvalidDateFormat",
    message,
    field,
});
exports.InvalidDateFormat = InvalidDateFormat;
const InvalidCapacity = (message) => ({
    name: "InvalidCapacity",
    message,
});
exports.InvalidCapacity = InvalidCapacity;
const MissingRequiredField = (message, field) => ({
    name: "MissingRequiredField",
    message,
    field,
});
exports.MissingRequiredField = MissingRequiredField;
const FieldTooShort = (message, field) => ({
    name: "FieldTooShort",
    message,
    field,
});
exports.FieldTooShort = FieldTooShort;
const FieldTooLong = (message, field) => ({
    name: "FieldTooLong",
    message,
    field,
});
exports.FieldTooLong = FieldTooLong;
const UnexpectedDependencyError = (message) => ({
    name: "UnexpectedDependencyError",
    message,
});
exports.UnexpectedDependencyError = UnexpectedDependencyError;
