const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer(async (req, res) => {
  const { method, url, httpVersion, headers } = req;
  const parsedUrl = new URL(url, `http://${headers.host}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  if (pathname === '/hello') {
    res.writeHead(200, { 'Content-Type': CONTENT_TYPES['.html'] });
    res.end('<h1>Hello World</h1>');
    return;
  }

  if (pathname === '/details') {
    const headersList = Object.entries(headers)
      .map(([key, value]) => `<li><strong>${key}</strong>: ${value}</li>`)
      .join('');

    const html = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Request Details</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; line-height: 1.6; }
          h1 { margin-bottom: 12px; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Request Details</h1>
        <p><strong>Method:</strong> <code>${method}</code></p>
        <p><strong>URL:</strong> <code>${parsedUrl.pathname}${parsedUrl.search}</code></p>
        <p><strong>HTTP Version:</strong> <code>${httpVersion}</code></p>
        <p><strong>Headers:</strong></p>
        <ul>${headersList}</ul>
      </body>
    </html>`;

    res.writeHead(200, { 'Content-Type': CONTENT_TYPES['.html'] });
    res.end(html);
    return;
  }

  try {
    const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const relativePath =
      safePath === '/' ? 'index.html' : safePath.replace(/^[/\\]/, '');
    const filePath = path.join(PUBLIC_DIR, relativePath);
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(PUBLIC_DIR))) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const fileStat = await fs.stat(resolvedPath);
    if (fileStat.isDirectory()) {
      throw new Error('EISDIR');
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'text/plain; charset=utf-8';
    const content = await fs.readFile(resolvedPath);

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    if (error.code !== 'ENOENT' && error.message !== 'EISDIR') {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Basic HTTP server listening on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('- /hello -> Hello World');
  console.log('- /details -> request details');
  console.log('- / -> resume page from public/index.html');
});
