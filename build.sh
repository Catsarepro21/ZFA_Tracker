#!/bin/bash

# Install necessary dependencies
npm install 

# Fix path aliases in files using relative paths
echo "Fixing path aliases..."
find ./client/src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@/|../|g'

# Build the client
cd client && npm run build
cd ..

# Build the server
npx tsc -p tsconfig.server.json

echo "Build completed successfully"
