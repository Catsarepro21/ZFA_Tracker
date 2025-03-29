# Volunteer Tracker

A comprehensive volunteer management platform that streamlines event coordination, volunteer tracking, and administrative workflows. Built as a Progressive Web App (PWA) with offline functionality and Google Sheets integration.

## Features

- Track volunteers and their participation in events
- Calculate total hours worked by each volunteer
- Alphabetical sorting of volunteer names
- Chronological sorting of events by date
- Google Sheets synchronization (manual and automatic hourly sync)
- Progressive Web App (PWA) with offline functionality
- Fire OS compatibility for tablet usage

## Technology Stack

- TypeScript React frontend
- Node.js Express backend
- In-memory database (can be upgraded to PostgreSQL)
- Google Sheets API integration
- Responsive web design for all devices

## Deploying to Render.com

This application is configured for easy deployment on Render.com's free tier.

### Step 1: Prepare Your Project

1. Download your project from Replit as a ZIP file
2. Extract the ZIP file to your local machine
3. (Optional) Create a GitHub repository and push your code there

### Step 2: Set Up Render.com

1. Sign up for a free account at [Render.com](https://render.com/)
2. From your dashboard, click "New +" and select "Web Service"
3. Connect your GitHub repository OR upload your code directly
4. Configure your web service:
   - **Name**: volunteer-tracker (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Step 3: Configure Environment Variables

Add the following environment variables in the Render dashboard:
- `NODE_ENV`: production
- `PORT`: 5000

### Step 4: Deploy

1. Click "Create Web Service"
2. Wait for the deployment to complete (this may take a few minutes)
3. Your application will be available at the URL provided by Render

## Google Sheets Integration

To use the Google Sheets integration:

1. Create a Google Cloud project and enable the Google Sheets API
2. Create a service account and download the JSON credentials
3. Create a Google Sheet and share it with your service account email
4. In the Admin Panel of your application:
   - Enter the Google Sheet ID
   - Paste the service account JSON
   - Enable auto-sync if desired

## Keeping Your App Awake (Optional)

To prevent your free Render instance from sleeping:

1. Sign up for a free account at [UptimeRobot](https://uptimerobot.com/)
2. Create a new monitor with your Render URL
3. Set the monitoring interval to 5 minutes

## PWA Installation on Fire OS

1. Open the Silk Browser on your Fire tablet
2. Navigate to your application's URL
3. Tap the browser menu (three dots)
4. Select "Add to Home Screen" or "Install App"
5. The app will be installed on your home screen

## Further Customization

The application is built with:
- React for the frontend
- Express.js for the backend
- Tailwind CSS for styling
- Shadcn UI components

Modify these files for customization:
- `client/src/pages/` - Main application pages
- `client/src/components/` - UI components
- `server/` - Backend API and functionality
- `theme.json` - Application theming