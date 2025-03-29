# Volunteer Tracker

A comprehensive application for tracking volunteer hours and activities, available as both a Progressive Web App (PWA) and a desktop application.

## Features

- Track volunteer activities with event details, locations, and hours
- View volunteer statistics and hour goals with progress indicators
- Offline functionality with local data storage
- Admin mode for managing data and syncing with Google Sheets
- Installable as a PWA for mobile and desktop
- Available as a native desktop application for Windows, macOS, and Linux

## Running the Application

### On Replit

The application is set up to run automatically in the Replit environment.

### Running Locally After Download

If you've downloaded the application as a ZIP file, follow these steps:

1. **Extract the ZIP file** to a folder on your computer

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Set environment variable for localhost**:
   
   To prevent the "ENOTSUP: operation not supported on socket" error that can occur on some systems, set an environment variable before starting the app:

   **Windows (Command Prompt)**:
   ```
   set USE_LOCALHOST=true
   ```

   **Windows (PowerShell)**:
   ```
   $env:USE_LOCALHOST="true"
   ```

   **Mac/Linux**:
   ```
   export USE_LOCALHOST=true
   ```

4. **Start the application**:
   ```
   npm run dev
   ```

5. **Access the application**:
   ```
   http://localhost:5000
   ```

## PWA Features

The application can be installed as a Progressive Web App:

1. Using a supported browser (Chrome, Edge, Firefox, etc.), you'll see an "Install" option in the address bar or a prompt at the bottom of the screen.

2. After installation, the app will work offline and can be launched from your desktop or home screen.

3. Data entered while offline will sync when you reconnect to the internet.

## Admin Access

To access admin features:

1. Click the lock icon in the top right corner
2. Enter the default password: `admin123`

Admin features include:
- Editing and deleting events
- Managing volunteer information
- Exporting data to CSV
- Syncing with Google Sheets

## Google Sheets Sync

To configure Google Sheets synchronization, you'll need:

1. A Google Service Account JSON key
2. A Google Sheets spreadsheet ID

Enter these in the admin panel under "Google Sheets Configuration".

## Desktop Application

The application is also available as a native desktop application using Electron:

### Running in Desktop Mode

To run the application as a desktop app in development mode:

1. **Windows**:
   ```
   electron-start.bat
   ```

2. **Mac/Linux**:
   ```
   chmod +x electron-start.sh
   ./electron-start.sh
   ```

### Building Desktop Application

To create installable packages for distribution:

1. **Windows**:
   ```
   build-electron.bat
   ```

2. **Mac/Linux**:
   ```
   chmod +x build-electron.sh
   ./build-electron.sh
   ```

This will create distribution packages in the `electron-dist` folder for your platform:
- Windows: NSIS installer (.exe) and portable (.exe)
- macOS: DMG (.dmg) and ZIP (.zip)
- Linux: AppImage (.AppImage) and Debian package (.deb)

## Troubleshooting

If you encounter errors when running locally:

1. **Port already in use**: Change the port in server/index.ts
2. **Socket errors**: Make sure to set USE_LOCALHOST=true as described above
3. **Module not found errors**: Run `npm install` again to ensure all dependencies are installed
4. **Electron errors**: Make sure to install Electron properly with `npm install electron electron-builder`