"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePrismaEventRepository = CreatePrismaEventRepository;
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
function toEventRecord(event) {
    return {
        ...event,
        status: event.status,
        isPrivate: Boolean(event.isPrivate),
        invitedEmails: event.invitedEmails ? JSON.parse(event.invitedEmails) : [],
    };
}
class PrismaEventRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(event) {
        try {
            const created = await this.prisma.event.create({
                data: {
                    ...event,
                    invitedEmails: JSON.stringify(event.invitedEmails || []),
                },
            });
            return (0, result_1.Ok)(toEventRecord(created));
        }
        catch (e) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(`Unable to create event: ${e?.message ?? String(e)}`));
        }
    }
    async findById(id) {
        try {
            const event = await this.prisma.event.findUnique({ where: { id } });
            return (0, result_1.Ok)(event ? toEventRecord(event) : null);
        }
        catch (e) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(`Unable to read event: ${e?.message ?? String(e)}`));
        }
    }
    async findAll() {
        try {
            const events = await this.prisma.event.findMany();
            return (0, result_1.Ok)(events.map(toEventRecord));
        }
        catch (e) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(`Unable to list events: ${e?.message ?? String(e)}`));
        }
    }
    // Feature 8 Sprint 3: retrieves all events for a specific organizer
    // used by getOrganizerDashboard to group events by status
    async findByOrganizerId(organizerId) {
        try {
            const events = await this.prisma.event.findMany({
                where: { organizerId },
            });
            return (0, result_1.Ok)(events.map(toEventRecord));
        }
        catch (e) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(`Unable to list events for organizer: ${e?.message ?? String(e)}`));
        }
    }
    async findPublishedUpcoming(query, category, startDate, endDate) {
        try {
            const now = new Date();
            const trimmedQuery = query.trim();
            const trimmedCategory = category.trim();
            const events = await this.prisma.event.findMany({
                where: {
                    status: "published",
                    startDate: {
                        gte: startDate ? startDate.toISOString() : now.toISOString(),
                        ...(endDate ? { lte: endDate.toISOString() } : {}),
                    },
                    ...(trimmedCategory ? { category: trimmedCategory } : {}),
                    ...(trimmedQuery
                        ? {
                            OR: [
                                { title: { contains: trimmedQuery } },
                                { description: { contains: trimmedQuery } },
                                { location: { contains: trimmedQuery } },
                            ],
                        }
                        : {}),
                },
                orderBy: {
                    startDate: "asc",
                },
            });
            return (0, result_1.Ok)(events.map(toEventRecord));
        }
        catch {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)("Unable to filter events."));
        }
    }
    async update(event) {
        try {
            const updated = await this.prisma.event.update({
                where: { id: event.id },
                data: {
                    ...event,
                    invitedEmails: JSON.stringify(event.invitedEmails || []),
                },
            });
            return (0, result_1.Ok)(toEventRecord(updated));
        }
        catch (e) {
            return (0, result_1.Err)((0, errors_1.UnexpectedDependencyError)(`Unable to update event: ${e?.message ?? String(e)}`));
        }
    }
}
function CreatePrismaEventRepository(prisma) {
    return new PrismaEventRepository(prisma);
}
