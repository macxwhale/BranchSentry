// server.js
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// For an IIS production deployment, we must ensure the app runs in production mode.
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(process.env.PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${process.env.PORT}`);
  });
});
