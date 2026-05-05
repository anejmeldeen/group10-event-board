"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateSavedService = CreateSavedService;
const node_crypto_1 = require("node:crypto");
const result_1 = require("../lib/result");
class SavedService {
    savedRepo;
    eventRepo;
    constructor(savedRepo, eventRepo) {
        this.savedRepo = savedRepo;
        this.eventRepo = eventRepo;
    }
    async toggleSavedEvent(eventId, currentUser) {
        if (currentUser.role === "admin" || currentUser.role === "staff") {
            return (0, result_1.Err)({
                name: "SavedNotAllowed",
                message: "Only members can save events.",
            });
        }
        const eventResult = await this.eventRepo.findById(eventId);
        if (eventResult.ok === false) {
            return (0, result_1.Err)({
                name: "SavedDependencyError",
                message: eventResult.value.message,
            });
        }
        const event = eventResult.value;
        if (!event) {
            return (0, result_1.Err)({
                name: "SavedEventNotFound",
                message: "Event not found.",
            });
        }
        if (event.status !== "published") {
            return (0, result_1.Err)({
                name: "SavedInvalidEventState",
                message: "Only published events can be saved.",
            });
        }
        const existingResult = await this.savedRepo.findByUserAndEvent(currentUser.userId, eventId);
        if (existingResult.ok === false) {
            return (0, result_1.Err)(existingResult.value);
        }
        const existing = existingResult.value;
        if (existing) {
            const removeResult = await this.savedRepo.remove(currentUser.userId, eventId);
            if (removeResult.ok === false) {
                return (0, result_1.Err)(removeResult.value);
            }
            return (0, result_1.Ok)({ saved: false });
        }
        const createResult = await this.savedRepo.create({
            id: (0, node_crypto_1.randomUUID)(),
            userId: currentUser.userId,
            eventId,
            createdAt: new Date().toISOString(),
        });
        if (createResult.ok === false) {
            return (0, result_1.Err)(createResult.value);
        }
        return (0, result_1.Ok)({ saved: true });
    }
    async getSavedEvents(currentUser) {
        if (currentUser.role === "admin" || currentUser.role === "staff") {
            return (0, result_1.Err)({
                name: "SavedNotAllowed",
                message: "Only members can access saved events.",
            });
        }
        const savedResult = await this.savedRepo.listByUser(currentUser.userId);
        if (savedResult.ok === false) {
            return (0, result_1.Err)(savedResult.value);
        }
        const events = [];
        for (const saved of savedResult.value) {
            const eventResult = await this.eventRepo.findById(saved.eventId);
            if (eventResult.ok === false) {
                return (0, result_1.Err)({
                    name: "SavedDependencyError",
                    message: eventResult.value.message,
                });
            }
            if (eventResult.value) {
                events.push(eventResult.value);
            }
        }
        events.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        return (0, result_1.Ok)(events);
    }
    async getSavedEventIds(currentUser) {
        if (currentUser.role === "admin" || currentUser.role === "staff") {
            return (0, result_1.Ok)(new Set());
        }
        const savedResult = await this.savedRepo.listByUser(currentUser.userId);
        if (savedResult.ok === false) {
            return (0, result_1.Err)(savedResult.value);
        }
        return (0, result_1.Ok)(new Set(savedResult.value.map((s) => s.eventId)));
    }
}
function CreateSavedService(savedRepo, eventRepo) {
    return new SavedService(savedRepo, eventRepo);
}
