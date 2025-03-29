import { google } from 'googleapis';
import { Volunteer, Event, InsertVolunteer, InsertEvent } from '@shared/schema';
import { IStorage } from './storage';

export async function syncToGoogleSheets(
  sheetId: string, 
  serviceAccountJson: string, 
  volunteers: Volunteer[], 
  events: Event[],
  storage: IStorage
) {
  try {
    // Parse the service account JSON
    let credentials;
    try {
      credentials = JSON.parse(serviceAccountJson);
    } catch (err) {
      throw new Error('Invalid service account JSON format');
    }

    // Create JWT client
    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });

    // Get existing sheets to check if our sheets already exist
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: sheetId
    });

    const existingSheets = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title) || [];

    // First, update the volunteers sheet
    // Sort volunteers alphabetically by name
    const sortedVolunteers = [...volunteers].sort((a, b) => a.name.localeCompare(b.name));
    
    const volunteersData = [
      ['Volunteer ID', 'Name', 'Email', 'Total Events', 'Total Hours'],
      ...await Promise.all(sortedVolunteers.map(async volunteer => {
        const volunteerEvents = events.filter(e => e.volunteerId === volunteer.id);
        
        // Calculate total hours
        let totalHours = 0;
        let totalMinutes = 0;
        volunteerEvents.forEach(event => {
          const [hours, minutes] = event.hours.split(':').map(Number);
          totalHours += hours;
          totalMinutes += minutes;
        });
        
        // Convert excess minutes to hours
        totalHours += Math.floor(totalMinutes / 60);
        totalMinutes = totalMinutes % 60;
        
        const totalHoursFormatted = `${totalHours}:${totalMinutes.toString().padStart(2, '0')}`;
        
        return [
          volunteer.id.toString(),
          volunteer.name,
          volunteer.email || "Not Given",
          volunteerEvents.length.toString(),
          totalHoursFormatted
        ];
      }))
    ];

    // Check if volunteers sheet exists
    if (!existingSheets.includes('Volunteers')) {
      // Create the volunteers sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'Volunteers'
                }
              }
            }
          ]
        }
      });
    }

    // Update the volunteers sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: 'Volunteers!A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: volunteersData
      }
    });

    // Now create/update individual sheets for each volunteer
    for (const volunteer of volunteers) {
      const volunteerEvents = events.filter(e => e.volunteerId === volunteer.id);
      
      // Format the sheet name to be safe for Google Sheets
      const safeSheetName = `Volunteer ${volunteer.id} - ${volunteer.name.replace(/[^\w\s]/gi, '')}`
        .substring(0, 30); // Google Sheets has a 31 character limit for sheet names
      
      // Check if volunteer sheet exists
      if (!existingSheets.includes(safeSheetName)) {
        // Create the volunteer sheet
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: safeSheetName
                  }
                }
              }
            ]
          }
        });
      }
      
      // Sort events by date descending
      const sortedEvents = [...volunteerEvents].sort((a, b) => 
        b.date.localeCompare(a.date)
      );
      
      // Prepare events data for the volunteer
      const volunteerData = [
        ['Date', 'Event', 'Location', 'Hours'],
        ...sortedEvents.map(event => [
          event.date,
          event.event,
          event.location,
          event.hours
        ])
      ];
      
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
      
      // Add a summary row
      volunteerData.push([]);
      volunteerData.push([
        'Total Hours:',
        `${totalHours}:${totalMinutes.toString().padStart(2, '0')}`,
        `Total Events: ${sortedEvents.length}`
      ]);
      
      // Update the volunteer sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${safeSheetName}'!A1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: volunteerData
        }
      });
    }

    // Now, read from Google Sheets to get any new volunteers or events
    await syncFromGoogleSheets(sheets, sheetId, volunteers, events, storage);
    
    return { success: true };
  } catch (error) {
    console.error('Error in Google Sheets sync:', error);
    throw error;
  }
}

// Read data from Google Sheets and add any missing volunteers or events to the app
async function syncFromGoogleSheets(
  sheets: any, 
  sheetId: string, 
  existingVolunteers: Volunteer[], 
  existingEvents: Event[], 
  storage: IStorage
) {
  try {
    // 1. First, get the Volunteers sheet
    const volunteersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Volunteers!A2:C100', // Start from row 2 to skip headers, up to 100 volunteers (including email column)
    });
    
    const volunteersRows = volunteersResponse.data.values || [];
    
    // Process any new volunteers found in the sheet
    for (const row of volunteersRows) {
      // Skip if there are not enough columns
      if (row.length < 2) continue;
      
      const sheetVolunteerId = parseInt(row[0]);
      const name = row[1];
      const email = row.length > 2 ? row[2] : null; // Get email if it exists
      
      // Skip if the volunteer already exists with this ID
      if (!isNaN(sheetVolunteerId) && existingVolunteers.some(v => v.id === sheetVolunteerId)) {
        continue;
      }
      
      // If it has a valid ID but doesn't exist in our system, it's a new volunteer to add
      if (!isNaN(sheetVolunteerId) && name) {
        // Check if a volunteer with this name already exists
        const existingByName = existingVolunteers.find(v => v.name.toLowerCase() === name.toLowerCase());
        
        if (!existingByName) {
          // Add as a new volunteer
          const volunteer: InsertVolunteer = {
            name: name,
            email: email && email !== "Not Given" ? email : null // Use email if available and not "Not Given"
          };
          
          await storage.createVolunteer(volunteer);
          console.log(`Imported new volunteer from Google Sheets: ${name}`);
        }
      }
    }
    
    // 2. Get all updated volunteer list
    const updatedVolunteers = await storage.getVolunteers();
    
    // 3. Iterate through each volunteer's sheet to get their events
    for (const volunteer of updatedVolunteers) {
      // Format the sheet name to match the format used when creating it
      const safeSheetName = `Volunteer ${volunteer.id} - ${volunteer.name.replace(/[^\w\s]/gi, '')}`
        .substring(0, 30);
      
      try {
        // Get events for this volunteer
        const eventsResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${safeSheetName}'!A2:D100`, // Start from row 2 to skip headers
        });
        
        const eventsRows = eventsResponse.data.values || [];
        
        // Process events for this volunteer
        for (const row of eventsRows) {
          // Skip if there are not enough columns or if it's the summary row
          if (row.length < 4 || row[0] === 'Total Hours:') continue;
          
          const date = row[0];
          const eventName = row[1];
          const location = row[2];
          const hours = row[3];
          
          // Validate data
          if (!date || !eventName || !location || !hours) continue;
          
          // Check if this event already exists for this volunteer
          const eventExists = existingEvents.some(e => 
            e.volunteerId === volunteer.id && 
            e.date === date && 
            e.event === eventName && 
            e.location === location &&
            e.hours === hours
          );
          
          if (!eventExists) {
            // Validate hours format (expected: H:MM)
            if (!/^\d+:\d{2}$/.test(hours)) continue;
            
            // Add as a new event
            const newEvent: InsertEvent = {
              volunteerId: volunteer.id,
              event: eventName,
              location: location,
              date: date,
              hours: hours
            };
            
            await storage.createEvent(newEvent);
            console.log(`Imported new event from Google Sheets: ${eventName} for ${volunteer.name}`);
          }
        }
      } catch (error) {
        // Skip if sheet doesn't exist
        console.log(`Sheet for volunteer ${volunteer.name} not found or error accessing it`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error syncing from Google Sheets:', error);
    return false;
  }
}
