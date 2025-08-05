#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Parse URL
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // Default to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }

  // Get file path
  const filePath = path.join(__dirname, 'dist', pathname);
  const extname = path.extname(filePath).toLowerCase();

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    // Read file
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }

      // Set content type
      const contentType = mimeTypes[extname] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });

      // Send response
      res.end(data);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Real Remote Desktop Web Client Development Server`);
  console.log(`📡 Server running at http://${HOST}:${PORT}`);
  console.log(`🌐 Open your browser and navigate to the URL above`);
  console.log(`📁 Serving files from: ${path.join(__dirname, 'dist')}`);
  console.log(`⏹️  Press Ctrl+C to stop the server`);
  console.log('');
  console.log(`💡 To connect to a Windows agent:`);
  console.log(`   1. Run the agent on Windows: ./real-remote-desktop-agent.exe`);
  console.log(`   2. Open this web client in your browser`);
  console.log(`   3. Enter the agent's IP address and port (default: 8080)`);
  console.log(`   4. Click Connect to start the remote session`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down development server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
}); 