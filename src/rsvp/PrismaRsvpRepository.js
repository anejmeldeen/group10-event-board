"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePrismaRsvpRepository = CreatePrismaRsvpRepository;
const result_1 = require("../lib/result");
const errors_1 = require("./errors");
function toRsvpRecord(row) {
    return {
        id: row.id,
        eventId: row.eventId,
        userId: row.userId,
        status: row.status,
        createdAt: row.createdAt,
    };
}
class PrismaRsvpRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByEventAndUser(eventId, userId) {
        try {
            const row = await this.prisma.rsvp.findUnique({
                where: { eventId_userId: { eventId, userId } },
            });
            return (0, result_1.Ok)(row ? toRsvpRecord(row) : null);
        }
        catch (error) {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to find RSVP."));
        }
    }
    async upsert(rsvp) {
        try {
            const row = await this.prisma.rsvp.upsert({
                where: { eventId_userId: { eventId: rsvp.eventId, userId: rsvp.userId } },
                create: {
                    id: rsvp.id,
                    eventId: rsvp.eventId,
                    userId: rsvp.userId,
                    status: rsvp.status,
                    createdAt: rsvp.createdAt,
                },
                update: {
                    status: rsvp.status,
                },
            });
            return (0, result_1.Ok)(toRsvpRecord(row));
        }
        catch (error) {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to save RSVP."));
        }
    }
    // Feature 8 Sprint 3: aggregates attendee count per event using prisma.rsvp.count
    // replaces in-memory counting from Sprint 1
    async countGoing(eventId) {
        try {
            const count = await this.prisma.rsvp.count({
                where: {
                    eventId,
                    status: "going",
                },
            });
            return (0, result_1.Ok)(count);
        }
        catch (error) {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to count RSVPs."));
        }
    }
    // Feature 7 Sprint 3: retrieves all RSVPs for a user ordered by createdAt
    // used by getMyRsvpDashboard to group into upcoming and history sections
    async listByUser(userId) {
        try {
            const rows = await this.prisma.rsvp.findMany({
                where: { userId },
                orderBy: { createdAt: 'asc' },
            });
            return (0, result_1.Ok)(rows.map(toRsvpRecord));
        }
        catch (error) {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to list RSVPs for user."));
        }
    }
    async listByEvent(eventId) {
        try {
            const rows = await this.prisma.rsvp.findMany({
                where: { eventId },
                orderBy: { createdAt: 'asc' },
            });
            return (0, result_1.Ok)(rows.map(toRsvpRecord));
        }
        catch (error) {
            return (0, result_1.Err)((0, errors_1.RsvpRepositoryError)("Failed to list RSVPs for event."));
        }
    }
}
function CreatePrismaRsvpRepository(prisma) {
    return new PrismaRsvpRepository(prisma);
}
