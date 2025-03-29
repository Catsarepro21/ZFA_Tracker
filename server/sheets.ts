import { google } from 'googleapis';
import { Volunteer, Event } from '@shared/schema';

export async function syncToGoogleSheets(
  sheetId: string, 
  serviceAccountJson: string, 
  volunteers: Volunteer[], 
  events: Event[]
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
    const volunteersData = [
      ['Volunteer ID', 'Name', 'Total Events', 'Total Hours'],
      ...await Promise.all(volunteers.map(async volunteer => {
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

    return { success: true };
  } catch (error) {
    console.error('Error in Google Sheets sync:', error);
    throw error;
  }
}
