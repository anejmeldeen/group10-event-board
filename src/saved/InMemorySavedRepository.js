"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInMemorySavedRepository = CreateInMemorySavedRepository;
const result_1 = require("../lib/result");
class InMemorySavedRepository {
    records = [];
    async findByUserAndEvent(userId, eventId) {
        try {
            const match = this.records.find((r) => r.userId === userId && r.eventId === eventId) ?? null;
            return (0, result_1.Ok)(match ? { ...match } : null);
        }
        catch {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: "Unable to read saved events.",
            });
        }
    }
    async listByUser(userId) {
        try {
            return (0, result_1.Ok)(this.records
                .filter((r) => r.userId === userId)
                .map((r) => ({ ...r })));
        }
        catch {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: "Unable to list saved events.",
            });
        }
    }
    async create(record) {
        try {
            this.records.push({ ...record });
            return (0, result_1.Ok)({ ...record });
        }
        catch {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: "Unable to save this event.",
            });
        }
    }
    async remove(userId, eventId) {
        try {
            const index = this.records.findIndex((r) => r.userId === userId && r.eventId === eventId);
            if (index >= 0) {
                this.records.splice(index, 1);
            }
            return (0, result_1.Ok)(undefined);
        }
        catch {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: "Unable to remove saved event.",
            });
        }
    }
}
function CreateInMemorySavedRepository() {
    return new InMemorySavedRepository();
}
