import { 
  users, type User, type InsertUser,
  volunteers, type Volunteer, type InsertVolunteer,
  events, type Event, type InsertEvent,
  settings, type Setting, type InsertSetting
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Volunteer methods
  getVolunteers(): Promise<Volunteer[]>;
  getVolunteer(id: number): Promise<Volunteer | undefined>;
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;
  
  // Event methods
  getEvents(): Promise<Event[]>;
  getEventsByVolunteerId(volunteerId: number): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: Partial<InsertEvent>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Settings methods
  getSetting(key: string): Promise<string | undefined>;
  updateSetting(key: string, value: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private volunteers: Map<number, Volunteer>;
  private events: Map<number, Event>;
  private settings: Map<string, string>;
  
  private userCurrentId: number;
  private volunteerCurrentId: number;
  private eventCurrentId: number;

  constructor() {
    this.users = new Map();
    this.volunteers = new Map();
    this.events = new Map();
    this.settings = new Map();
    
    this.userCurrentId = 1;
    this.volunteerCurrentId = 1;
    this.eventCurrentId = 1;
    
    // Initialize with default admin password
    this.settings.set('adminPassword', 'admin123');
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Volunteer methods
  async getVolunteers(): Promise<Volunteer[]> {
    return Array.from(this.volunteers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  
  async getVolunteer(id: number): Promise<Volunteer | undefined> {
    return this.volunteers.get(id);
  }
  
  async createVolunteer(insertVolunteer: InsertVolunteer): Promise<Volunteer> {
    const id = this.volunteerCurrentId++;
    const volunteer: Volunteer = { ...insertVolunteer, id };
    this.volunteers.set(id, volunteer);
    return volunteer;
  }
  
  // Event methods
  async getEvents(): Promise<Event[]> {
    return Array.from(this.events.values()).sort((a, b) => b.date.localeCompare(a.date));
  }
  
  async getEventsByVolunteerId(volunteerId: number): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => event.volunteerId === volunteerId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  
  async getEvent(id: number): Promise<Event | undefined> {
    return this.events.get(id);
  }
  
  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.eventCurrentId++;
    const event: Event = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }
  
  async updateEvent(id: number, eventUpdate: Partial<InsertEvent>): Promise<Event | undefined> {
    const existingEvent = this.events.get(id);
    
    if (!existingEvent) {
      return undefined;
    }
    
    const updatedEvent: Event = { ...existingEvent, ...eventUpdate };
    this.events.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }
  
  // Settings methods
  async getSetting(key: string): Promise<string | undefined> {
    return this.settings.get(key);
  }
  
  async updateSetting(key: string, value: string): Promise<boolean> {
    this.settings.set(key, value);
    return true;
  }
}

export const storage = new MemStorage();
