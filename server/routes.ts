// server/routes.ts
import express, { Express, Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import cors from 'cors';
import MemoryStore from 'memorystore';
import { z } from 'zod';
import { ZodError } from 'zod-validation-error';
import { storage, IStorage } from './storage';
import {
  Event,
  Volunteer,
  insertEventSchema,
  insertVolunteerSchema,
  googleSheetsConfigSchema,
  passwordChangeSchema
} from '../shared/schema';
import { syncToGoogleSheets } from './sheets';

function handleValidationError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unexpected error:', err);
  return res.status(500).json({ error: 'Internal server error' });
}

function checkAdminPassword(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for all routes
  app.use(cors({
    origin: '*', // You should restrict this to your frontend domain in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Initialize session middleware
  const SessionStore = MemoryStore(session);
  app.use(session({
    secret: process.env.SESSION_SECRET || 'development-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new SessionStore({
      checkPeriod: 86400000 // 24 hours
    })
  }));

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy for authentication
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return done(null, false, { message: 'Invalid credentials' });
      }
      if (password !== user.password) { // In a real app, use proper password hashing
        return done(null, false, { message: 'Invalid credentials' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Login route
  app.post('/api/login', express.json(), (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info.message });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.status(200).json({ message: 'Login successful' });
      });
    })(req, res, next);
  });

  // Logout route
  app.post('/api/logout', (req, res) => {
    req.logout(() => {
      res.status(200).json({ message: 'Logout successful' });
    });
  });

  // Check auth status
  app.get('/api/auth-status', (req, res) => {
    if (req.isAuthenticated()) {
      return res.status(200).json({ isAuthenticated: true });
    }
    return res.status(200).json({ isAuthenticated: false });
  });

  // Get all volunteers
  app.get('/api/volunteers', async (req, res) => {
    try {
      const volunteers = await storage.getVolunteers();
      // Sort volunteers alphabetically by name
      volunteers.sort((a, b) => a.name.localeCompare(b.name));
      res.status(200).json(volunteers);
    } catch (err) {
      console.error('Error fetching volunteers:', err);
      res.status(500).json({ error: 'Failed to fetch volunteers' });
    }
  });

  // Get volunteer by ID
  app.get('/api/volunteers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const volunteer = await storage.getVolunteer(id);
      if (!volunteer) {
        return res.status(404).json({ error: 'Volunteer not found' });
      }
      
      const events = await storage.getEventsByVolunteerId(id);
      // Sort events by date in descending order (newest first)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Calculate total hours
      const totalHours = events.reduce((sum, event) => {
        const hours = parseFloat(event.hours);
        return sum + (isNaN(hours) ? 0 : hours);
      }, 0);
      
      res.status(200).json({
        volunteer,
        events,
        stats: {
          totalEvents: events.length,
          totalHours: totalHours.toFixed(1)
        }
      });
    } catch (err) {
      console.error('Error fetching volunteer:', err);
      res.status(500).json({ error: 'Failed to fetch volunteer details' });
    }
  });

  // Create volunteer
  app.post('/api/volunteers', express.json(), async (req, res) => {
    try {
      const volunteerData = insertVolunteerSchema.parse(req.body);
      const newVolunteer = await storage.createVolunteer(volunteerData);
      res.status(201).json(newVolunteer);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Get all events
  app.get('/api/events', async (req, res) => {
    try {
      const events = await storage.getEvents();
      // Sort events by date in descending order (newest first)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.status(200).json(events);
    } catch (err) {
      console.error('Error fetching events:', err);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Create event
  app.post('/api/events', express.json(), async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const newEvent = await storage.createEvent(eventData);
      res.status(201).json(newEvent);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Update event
  app.put('/api/events/:id', express.json(), async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const eventData = insertEventSchema.parse(req.body);
      const updatedEvent = await storage.updateEvent(id, eventData);
      if (!updatedEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.status(200).json(updatedEvent);
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  // Delete event
  app.delete('/api/events/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const deleted = await storage.deleteEvent(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.status(200).json({ message: 'Event deleted successfully' });
    } catch (err) {
      console.error('Error deleting event:', err);
      res.status(500).json({ error: 'Failed to delete event' });
    }
  });

  // Google Sheets sync
  app.post('/api/sync/google-sheets', express.json(), checkAdminPassword, async (req, res) => {
    try {
      const config = googleSheetsConfigSchema.parse(req.body);
      await syncToGoogleSheets(config, storage);
      
      // Update last sync timestamp
      const now = new Date().toISOString();
      await storage.updateSetting('lastSyncTime', now);
      
      res.status(200).json({ message: 'Sync successful', timestamp: now });
    } catch (err) {
      console.error('Error syncing with Google Sheets:', err);
      if (err instanceof Error) {
        return res.status(500).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Failed to sync with Google Sheets' });
    }
  });

  // Get sync status
  app.get('/api/sync/status', async (req, res) => {
    try {
      const lastSyncTime = await storage.getSetting('lastSyncTime');
      const autoSyncEnabled = await storage.getSetting('autoSyncEnabled');
      
      res.status(200).json({
        lastSyncTime: lastSyncTime || null,
        autoSyncEnabled: autoSyncEnabled === 'true'
      });
    } catch (err) {
      console.error('Error fetching sync status:', err);
      res.status(500).json({ error: 'Failed to fetch sync status' });
    }
  });

  // Toggle auto-sync
  app.post('/api/sync/auto-toggle', express.json(), checkAdminPassword, async (req, res) => {
    try {
      const { enabled } = req.body;
      await storage.updateSetting('autoSyncEnabled', enabled ? 'true' : 'false');
      
      res.status(200).json({ 
        message: `Auto-sync ${enabled ? 'enabled' : 'disabled'}`,
        autoSyncEnabled: enabled
      });
    } catch (err) {
      console.error('Error toggling auto-sync:', err);
      res.status(500).json({ error: 'Failed to toggle auto-sync' });
    }
  });

  // Change admin password
  app.post('/api/admin/change-password', express.json(), checkAdminPassword, async (req, res) => {
    try {
      const passwordData = passwordChangeSchema.parse(req.body);
      const user = await storage.getUserByUsername('admin');
      
      if (!user) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      if (passwordData.currentPassword !== user.password) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // In a real app, hash the password before storing
      await storage.updateUser(user.id, { password: passwordData.newPassword });
      
      res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
      handleValidationError(err, res);
    }
  });

  return app;
}
