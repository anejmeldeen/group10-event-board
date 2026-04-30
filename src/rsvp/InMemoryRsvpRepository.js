"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInMemoryRsvpRepository = CreateInMemoryRsvpRepository;
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
function compositeKey(eventId, userId) {
    return `${eventId}:${userId}`;
}
class InMemoryRsvpRepository {
    rsvps = new Map();
    async findByEventAndUser(eventId, userId) {
        try {
            return (0, result_1.Ok)(this.rsvps.get(compositeKey(eventId, userId)) ?? null);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to find RSVP."));
        }
    }
    async upsert(rsvp) {
        try {
            const key = compositeKey(rsvp.eventId, rsvp.userId);
            this.rsvps.set(key, { ...rsvp });
            return (0, result_1.Ok)({ ...rsvp });
        }
        catch {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to save RSVP."));
        }
    }
    async countGoing(eventId) {
        try {
            let count = 0;
            for (const rsvp of this.rsvps.values()) {
                if (rsvp.eventId === eventId && rsvp.status === "going") {
                    count++;
                }
            }
            return (0, result_1.Ok)(count);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to count RSVPs."));
        }
    }
    async listByUser(userId) {
        try {
            const results = [];
            for (const rsvp of this.rsvps.values()) {
                if (rsvp.userId === userId) {
                    results.push({ ...rsvp });
                }
            }
            return (0, result_1.Ok)(results);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to list RSVPs for user."));
        }
    }
    async listByEvent(eventId) {
        try {
            const results = [];
            for (const rsvp of this.rsvps.values()) {
                if (rsvp.eventId === eventId) {
                    results.push({ ...rsvp });
                }
            }
            return (0, result_1.Ok)(results);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to list RSVPs for event."));
        }
    }
}
function CreateInMemoryRsvpRepository() {
    return new InMemoryRsvpRepository();
}
