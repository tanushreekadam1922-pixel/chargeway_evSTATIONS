
'use strict';

/**
 * ChargeWay Server
 * Node.js HTTP server
 * Local: http://localhost:3000
 */

const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');
const dotenv = require('dotenv');

// ======================================================
// ENVIRONMENT CONFIGURATION
// ======================================================

dotenv.config({
  path: path.resolve(__dirname, '../.env')
});

console.log(
  '[ENV] Open Charge Map API key loaded:',
  Boolean(process.env.EV_API_KEY)
);

// ======================================================
// EXISTING PROJECT IMPORTS
// ======================================================

const { db, seed } = require('./db');
const { verifyToken } = require('./lib/auth');
const { HttpError, findRoute } = require('./lib/util');

// Initialize database
seed();

// Register existing API routes
require('./routes/auth');
require('./routes/user');
require('./routes/stations');
require('./routes/admin');

// ======================================================
// SERVER CONFIGURATION
// ======================================================

const PORT = Number(process.env.PORT) || 3000;

const PUBLIC_DIR = path.resolve(
  process.env.CLIENT_DIR ||
  path.join(__dirname, '..', 'client', 'dist')
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json'
};

// ======================================================
// RESPONSE HELPER
// ======================================================

function send(res, status, data, headers = {}) {

  const body =
    typeof data === 'string' || Buffer.isBuffer(data)
      ? data
      : JSON.stringify(data);

  res.writeHead(status, {
    'Content-Type':
      typeof data === 'object' && !Buffer.isBuffer(data)
        ? 'application/json; charset=utf-8'
        : 'text/plain; charset=utf-8',

    'Content-Length': Buffer.byteLength(body),

    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',

    ...headers
  });

  res.end(body);
}

// ======================================================
// JSON REQUEST READER
// ======================================================

function readJson(req) {

  return new Promise((resolve, reject) => {

    let size = 0;
    const chunks = [];

    req.on('data', chunk => {

      size += chunk.length;

      if (size > 100 * 1024) {

        reject(new HttpError(413, 'Request too large'));

        req.destroy();

        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {

      if (!chunks.length) {
        return resolve({});
      }

      try {

        const value = JSON.parse(
          Buffer.concat(chunks).toString('utf8')
        );

        resolve(
          value &&
          typeof value === 'object' &&
          !Array.isArray(value)
            ? value
            : {}
        );

      } catch {

        reject(
          new HttpError(400, 'Invalid JSON body')
        );
      }
    });

    req.on('error', reject);
  });
}

// ======================================================
// USER AUTHENTICATION
// ======================================================

function authenticate(req) {

  const header = req.headers.authorization || '';

  const payload = header.startsWith('Bearer ')
    ? verifyToken(header.slice(7))
    : null;

  if (!payload) return null;

  const user = db.prepare(
    'SELECT * FROM users WHERE id=?'
  ).get(payload.uid);

  // Check current database status on every request.

  if (
    !user ||
    user.status !== 'active' ||
    user.role !== payload.role
  ) {
    return null;
  }

  return user;
}

// ======================================================
// API REQUEST HANDLER
// ======================================================

async function handleApi(req, res, url) {

  const found = findRoute(
    req.method,
    url.pathname
  );

  if (!found) {
    throw new HttpError(404, 'API endpoint not found');
  }

  const { route, params } = found;

  let user = null;

  // Authentication
  if (route.auth) {

    user = authenticate(req);

    if (!user) {
      throw new HttpError(401, 'Please sign in');
    }

    if (user.role !== route.auth) {

      throw new HttpError(
        403,
        'You do not have access to this resource'
      );
    }
  }

  const body = [
    'POST',
    'PUT',
    'PATCH',
    'DELETE'
  ].includes(req.method)
    ? await readJson(req)
    : {};

  // Execute registered route
  const data = await route.handler({

    req,
    res,
    user,
    params,
    body,

    query: Object.fromEntries(
      url.searchParams
    )
  });

  const status =
    req.method === 'POST' &&
    data &&
    data.id &&
    !data.token
      ? 201
      : 200;

  send(
    res,
    status,
    data ?? { ok: true },
    {
      'Cache-Control': 'no-store'
    }
  );
}

// ======================================================
// STATIC FILE HANDLER
// ======================================================

function sendFile(req, res, file, stats) {

  res.writeHead(200, {

    'Content-Type':
      MIME[path.extname(file).toLowerCase()] ||
      'application/octet-stream',

    'Content-Length': stats.size,

    'Cache-Control':
      path.basename(file) === 'index.html'
        ? 'no-cache'
        : 'public, max-age=3600',

    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY'
  });

  if (req.method === 'HEAD') {
    return res.end();
  }

  fs.createReadStream(file).pipe(res);
}

// ======================================================
// REACT FRONTEND SERVING
// ======================================================

function serveStatic(req, res, pathname) {

  if (
    req.method !== 'GET' &&
    req.method !== 'HEAD'
  ) {
    throw new HttpError(405, 'Method not allowed');
  }

  const file = path.resolve(
    PUBLIC_DIR,
    '.' + (
      pathname === '/'
        ? '/index.html'
        : pathname
    )
  );

  // Prevent path traversal and hidden file access.

  if (
    !file.startsWith(PUBLIC_DIR + path.sep) ||
    path.basename(file).startsWith('.')
  ) {
    throw new HttpError(404, 'Not found');
  }

  fs.stat(file, (err, stats) => {

    if (!err && stats.isFile()) {

      return sendFile(
        req,
        res,
        file,
        stats
      );
    }

    if (path.extname(file)) {
      return send(res, 404, 'Not found');
    }

    const index = path.join(
      PUBLIC_DIR,
      'index.html'
    );

    fs.stat(index, (indexError, indexStats) => {

      if (indexError) {

        return send(
          res,
          404,
          'The React application is not built yet. Run npm run build in the client folder, or start the frontend development server.'
        );
      }

      sendFile(
        req,
        res,
        index,
        indexStats
      );
    });
  });
}

// ======================================================
// MAIN HTTP SERVER
// ======================================================

const server = http.createServer(
  async (req, res) => {

    try {

      const url = new URL(
        req.url,
        'http://localhost'
      );

      let pathname;

      try {

        pathname = decodeURIComponent(
          url.pathname
        );

      } catch {

        throw new HttpError(400, 'Bad URL');
      }

      if (pathname.startsWith('/api/')) {

        await handleApi(req, res, url);

      } else {

        serveStatic(
          req,
          res,
          pathname
        );
      }

    } catch (error) {

      if (res.headersSent) {
        return res.end();
      }

      if (error instanceof HttpError) {

        return send(
          res,
          error.status,
          { error: error.message }
        );
      }

      if (
        error &&
        String(error.message).includes(
          'UNIQUE constraint'
        )
      ) {

        return send(
          res,
          409,
          { error: 'That record already exists' }
        );
      }

      console.error(
        '[SERVER ERROR]',
        error
      );

      send(
        res,
        500,
        { error: 'Something went wrong on the server' }
      );
    }
  }
);

// ======================================================
// START SERVER
// ======================================================

server.listen(PORT, '0.0.0.0', () => {

  console.log('\n================================');
  console.log('       CHARGEWAY SERVER');
  console.log('================================');

  console.log(
    `Local: http://localhost:${PORT}`
  );

  console.log(
    'API Key:',
    process.env.EV_API_KEY
      ? 'Loaded successfully'
      : 'Missing'
  );

  console.log(
    'Frontend:',
    PUBLIC_DIR
  );

  for (
    const interfaces of Object.values(
      os.networkInterfaces()
    )
  ) {

    for (const item of interfaces || []) {

      if (
        item.family === 'IPv4' &&
        !item.internal
      ) {

        console.log(
          `Network: http://${item.address}:${PORT}`
        );
      }
    }
  }

  console.log('\nAdmin login: /admin/login');

  console.log(
    'Demo user: demo@chargeway.com'
  );

  console.log('================================\n');
});

// ======================================================
// GRACEFUL SHUTDOWN
// ======================================================

process.on('SIGINT', () => {

  console.log('\nShutting down ChargeWay...');

  server.close(() => {

    db.close();

    process.exit(0);
  });
});

process.on('SIGTERM', () => {

  server.close(() => {

    db.close();

    process.exit(0);
  });
});
