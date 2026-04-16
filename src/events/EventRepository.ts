import type { Event } from "./Event";

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  findAll(): Promise<Event[]>;
  save(event: Event): Promise<Event>;
}