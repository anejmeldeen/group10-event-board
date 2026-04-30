"use strict";
/**
 * In-memory implementation of IEventRepository.
 *
 * Events are stored in a plain array and lost on server restart.
 * This mirrors InMemoryUserRepository from the auth layer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateInMemoryEventRepository = CreateInMemoryEventRepository;
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
class InMemoryEventRepository {
    events = [];
    async create(event) {
        try {
            this.events.push({ ...event });
            return (0, result_1.Ok)({ ...event });
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to create the event."));
        }
    }
    async findById(id) {
        try {
            const match = this.events.find((e) => e.id === id) ?? null;
            return (0, result_1.Ok)(match ? { ...match } : null);
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to read events."));
        }
    }
    async findAll() {
        try {
            return (0, result_1.Ok)(this.events.map((e) => ({ ...e })));
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to list events."));
        }
    }
    async findByOrganizerId(organizerId) {
        try {
            const matches = this.events.filter((e) => e.organizerId === organizerId);
            return (0, result_1.Ok)(matches.map((e) => ({ ...e })));
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to list events for organizer."));
        }
    }
    async findPublishedUpcoming(query, category, startDate, endDate) {
        try {
            const now = new Date();
            const trimmedQuery = query.trim().toLowerCase();
            const trimmedCategory = category.trim().toLowerCase();
            const matches = this.events.filter((event) => {
                if (event.status !== "published")
                    return false;
                const eventStart = new Date(event.startDate);
                if (eventStart < now)
                    return false;
                if (trimmedQuery) {
                    const matchesQuery = event.title.toLowerCase().includes(trimmedQuery) ||
                        event.description.toLowerCase().includes(trimmedQuery) ||
                        event.location.toLowerCase().includes(trimmedQuery);
                    if (!matchesQuery)
                        return false;
                }
                if (trimmedCategory && event.category.toLowerCase() !== trimmedCategory) {
                    return false;
                }
                if (startDate && eventStart < startDate)
                    return false;
                if (endDate && eventStart > endDate)
                    return false;
                return true;
            });
            matches.sort((a, b) => new Date(a.startDate).getTime() -
                new Date(b.startDate).getTime());
            return (0, result_1.Ok)(matches.map((e) => ({ ...e })));
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to filter events."));
        }
    }
    async update(event) {
        try {
            const index = this.events.findIndex((e) => e.id === event.id);
            if (index === -1) {
                return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(`Event ${event.id} not found.`));
            }
            this.events[index] = { ...event };
            return (0, result_1.Ok)({ ...event });
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to update the event."));
        }
    }
}
function CreateInMemoryEventRepository() {
    return new InMemoryEventRepository();
}
