import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const volunteers = pgTable("volunteers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  hourGoal: text("hour_goal"), // stored as "HH:MM" format
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  volunteerId: integer("volunteer_id").notNull(),
  event: text("event").notNull(),
  location: text("location").notNull(),
  hours: text("hours").notNull(), // stored as "HH:MM" format
  date: text("date").notNull(), // stored as "YYYY-MM-DD" format
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

// Volunteer schemas
export const insertVolunteerSchema = createInsertSchema(volunteers).pick({
  name: true,
  email: true,
  hourGoal: true,
});

export const volunteerSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().nullable(),
  hourGoal: z.string().regex(/^([0-9]+):([0-5][0-9])$/, "Hours must be in HH:MM format").optional().nullable(),
});

// Event schemas
export const insertEventSchema = createInsertSchema(events).pick({
  volunteerId: true,
  event: true,
  location: true,
  hours: true,
  date: true,
});

export const eventSchema = z.object({
  id: z.number(),
  volunteerId: z.number(),
  event: z.string().min(1, "Event name is required"),
  location: z.string().min(1, "Location is required"),
  hours: z.string().regex(/^([0-9]+):([0-5][0-9])$/, "Hours must be in HH:MM format"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
});

// Settings schemas
export const insertSettingSchema = createInsertSchema(settings).pick({
  key: true,
  value: true,
});

export const googleSheetsConfigSchema = z.object({
  sheetId: z.string().min(1, "Sheet ID is required"),
  serviceAccount: z.string().min(1, "Service account JSON is required"),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Types
export type Volunteer = typeof volunteers.$inferSelect;
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type GoogleSheetsConfig = z.infer<typeof googleSheetsConfigSchema>;
export type PasswordChange = z.infer<typeof passwordChangeSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
