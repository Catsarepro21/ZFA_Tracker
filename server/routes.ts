import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertVolunteerSchema, 
  insertEventSchema, 
  googleSheetsConfigSchema,
  passwordChangeSchema
} from "@shared/schema";
import { syncToGoogleSheets } from "./sheets";

// Utility function to handle validation errors
function handleValidationError(err: unknown, res: Response) {
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json({ message: validationError.message });
  }
  return res.status(500).json({ message: 'Internal server error' });
}

// Authentication middleware
function checkAdminPassword(req: Request, res: Response, next: Function) {
  // Check for password in request body, query parameters, or headers (case insensitive)
  const password = req.body.password || 
                  req.query.password || 
                  req.headers['x-admin-password'] || 
                  req.headers['x-ADMIN-PASSWORD'] || 
                  req.headers['X-ADMIN-PASSWORD'] ||
                  req.headers['X-Admin-Password'];
  
  console.log('Auth check - Method:', req.method);
  console.log('Auth check - URL:', req.url);
  console.log('Auth check - Body:', JSON.stringify(req.body));
  console.log('Auth check - Query:', JSON.stringify(req.query));
  
  // Log headers with all possible case variations
  console.log('Auth check - Header x-admin-password:', req.headers['x-admin-password']);
  console.log('Auth check - Header X-ADMIN-PASSWORD:', req.headers['X-ADMIN-PASSWORD']);
  console.log('Auth check - Header X-Admin-Password:', req.headers['X-Admin-Password']);
  console.log('Auth check - Password received:', password);
  
  if (!password) {
    return res.status(401).json({ message: 'Password is required' });
  }
  
  storage.getSetting('adminPassword').then(storedPassword => {
    console.log('Auth check - Stored password exists:', !!storedPassword);
    if (password === storedPassword) {
      console.log('Auth check - Password match: PASS');
      next();
    } else {
      console.log('Auth check - Password match: FAIL');
      res.status(401).json({ message: 'Invalid password' });
    }
  }).catch(err => {
    console.error('Error checking password:', err);
    res.status(500).json({ message: 'Internal server error' });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes
  
  // Volunteers
  app.get('/api/volunteers', async (req, res) => {
    try {
      const volunteers = await storage.getVolunteers();
      
      // For each volunteer, get the event count
      const volunteersWithCount = await Promise.all(
        volunteers.map(async (volunteer) => {
          const events = await storage.getEventsByVolunteerId(volunteer.id);
          return {
            ...volunteer,
            eventCount: events.length
          };
        })
      );
      
      // Sort volunteers alphabetically by name
      const sortedVolunteers = volunteersWithCount.sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      res.json(sortedVolunteers);
    } catch (err) {
      console.error('Error getting volunteers:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/volunteers', async (req, res) => {
    try {
      const volunteerData = insertVolunteerSchema.parse(req.body);
      const volunteer = await storage.createVolunteer(volunteerData);
      res.status(201).json(volunteer);
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  app.get('/api/volunteers/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid volunteer ID' });
      }
      
      const volunteer = await storage.getVolunteer(id);
      if (!volunteer) {
        return res.status(404).json({ message: 'Volunteer not found' });
      }
      
      const events = await storage.getEventsByVolunteerId(id);
      
      // Sort events by date (newest first)
      const sortedEvents = [...events].sort((a, b) => 
        b.date.localeCompare(a.date)
      );
      
      // Calculate total hours
      let totalHours = 0;
      let totalMinutes = 0;
      
      sortedEvents.forEach(event => {
        const [hours, minutes] = event.hours.split(':').map(Number);
        totalHours += hours;
        totalMinutes += minutes;
      });
      
      // Convert excess minutes to hours
      totalHours += Math.floor(totalMinutes / 60);
      totalMinutes = totalMinutes % 60;
      
      const formattedTotalHours = `${totalHours}:${totalMinutes.toString().padStart(2, '0')}`;
      
      res.json({
        volunteer,
        events: sortedEvents,
        stats: {
          totalEvents: sortedEvents.length,
          totalHours: formattedTotalHours
        }
      });
    } catch (err) {
      console.error('Error getting volunteer:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Events
  app.post('/api/events', async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.status(201).json(event);
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  app.put('/api/events/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      // Only validate the fields that are provided
      const eventUpdate = req.body;
      const event = await storage.updateEvent(id, eventUpdate);
      
      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.json(event);
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  app.delete('/api/events/:id', checkAdminPassword, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid event ID' });
      }
      
      const success = await storage.deleteEvent(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Event not found' });
      }
      
      res.status(204).send();
    } catch (err) {
      console.error('Error deleting event:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Admin
  app.post('/api/admin/verify', async (req, res) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Password is required' });
      }
      
      const storedPassword = await storage.getSetting('adminPassword');
      
      if (password === storedPassword) {
        res.json({ success: true });
      } else {
        res.status(401).json({ message: 'Invalid password' });
      }
    } catch (err) {
      console.error('Error verifying admin password:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/admin/password', checkAdminPassword, async (req, res) => {
    try {
      const passwordData = passwordChangeSchema.parse(req.body);
      
      const storedPassword = await storage.getSetting('adminPassword');
      
      if (passwordData.currentPassword !== storedPassword) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      await storage.updateSetting('adminPassword', passwordData.newPassword);
      
      res.json({ success: true });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  app.post('/api/admin/sheets-config', async (req, res) => {
    try {
      const config = googleSheetsConfigSchema.parse(req.body);
      
      await storage.updateSetting('googleSheetsId', config.sheetId);
      await storage.updateSetting('googleServiceAccount', config.serviceAccount);
      
      // Handle auto-sync settings
      if (config.autoSync !== undefined) {
        await storage.updateSetting('googleSheetsAutoSync', config.autoSync.toString());
      }
      
      if (config.lastSyncTimestamp !== undefined) {
        await storage.updateSetting('googleSheetsLastSync', config.lastSyncTimestamp.toString());
      }
      
      res.json({ success: true });
    } catch (err) {
      handleValidationError(err, res);
    }
  });
  
  app.get('/api/admin/sheets-config', async (req, res) => {
    try {
      const sheetId = await storage.getSetting('googleSheetsId') || '';
      const serviceAccount = await storage.getSetting('googleServiceAccount') || '';
      const autoSyncStr = await storage.getSetting('googleSheetsAutoSync') || 'false';
      const lastSyncTimestampStr = await storage.getSetting('googleSheetsLastSync') || '0';
      
      const autoSync = autoSyncStr === 'true';
      const lastSyncTimestamp = parseInt(lastSyncTimestampStr) || 0;
      
      res.json({
        sheetId,
        serviceAccount,
        autoSync,
        lastSyncTimestamp
      });
    } catch (err) {
      console.error('Error getting Google Sheets config:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.get('/api/admin/export-csv', async (req, res) => {
    try {
      const volunteers = await storage.getVolunteers();
      const allEvents = await storage.getEvents();
      
      // Sort volunteers alphabetically by name
      const sortedVolunteers = [...volunteers].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      // Format: "id,name,event,location,hours,date"
      let csv = 'volunteer_id,volunteer_name,event,location,hours,date\n';
      
      // For each volunteer (in alphabetical order)
      for (const volunteer of sortedVolunteers) {
        // Get all events for this volunteer
        const volunteerEvents = allEvents.filter(e => e.volunteerId === volunteer.id);
        
        // Sort events by date (newest first)
        const sortedEvents = [...volunteerEvents].sort((a, b) => 
          b.date.localeCompare(a.date)
        );
        
        // Add each event to the CSV
        for (const event of sortedEvents) {
          csv += `${volunteer.id},${volunteer.name},${event.event},${event.location},${event.hours},${event.date}\n`;
        }
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=volunteer_events.csv');
      res.send(csv);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  app.post('/api/admin/sync-sheets', async (req, res) => {
    try {
      const sheetId = await storage.getSetting('googleSheetsId');
      const serviceAccount = await storage.getSetting('googleServiceAccount');
      
      if (!sheetId || !serviceAccount) {
        return res.status(400).json({ message: 'Google Sheets configuration is missing' });
      }
      
      const volunteers = await storage.getVolunteers();
      const events = await storage.getEvents();
      
      // Sort volunteers alphabetically
      const sortedVolunteers = [...volunteers].sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      
      const result = await syncToGoogleSheets(sheetId, serviceAccount, sortedVolunteers, events, storage);
      
      res.json(result);
    } catch (err) {
      console.error('Error syncing with Google Sheets:', err);
      res.status(500).json({ 
        message: 'Error syncing with Google Sheets', 
        error: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
