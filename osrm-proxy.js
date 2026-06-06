#!/usr/bin/env node

/**
 * Simple OSRM Proxy Server
 * Runs on localhost:3001 and forwards requests to the public OSRM service
 * Use this when the app can't reach router.project-osrm.org directly
 */

const http = require('http');

const OSRM_HOST = 'router.project-osrm.org';

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  // Forward the request to OSRM
  const options = {
    hostname: OSRM_HOST,
    port: 443,
    path: req.url,
    method: 'GET',
    headers: req.headers
  };

  const https = require('https');
  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('OSRM request error:', err.message);
    res.writeHead(502);
    res.end(`Gateway error: ${err.message}`);
  });

  req.pipe(proxyReq);
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ OSRM Proxy listening on http://0.0.0.0:${PORT}`);
  console.log(`📱 Use http://10.0.2.2:${PORT} from Android Emulator`);
  console.log(`📱 Use http://<your-ip>:${PORT} from LD Player`);
});
