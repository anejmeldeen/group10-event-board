"use strict";
/**
 * Event model types and status definitions.
 *
 * An event starts in "draft" status and is not visible to members
 * until it is explicitly published by an organizer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEventSummary = toEventSummary;
function toEventSummary(event) {
    return {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        category: event.category,
        startDate: event.startDate,
        endDate: event.endDate,
        organizerName: event.organizerName,
        status: event.status,
        capacity: event.capacity,
        attendeeCount: event.attendeeCount,
        isPrivate: event.isPrivate,
    };
}
