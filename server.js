import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(process.cwd(), 'dist');
const routes = new Set(['activity', 'ai-assistant', 'auth', 'claims', 'collections', 'dealers', 'knowledge', 'notifications', 'order-items', 'orders', 'outlets', 'products', 'statistics', 'ticket-messages', 'tickets', 'training', 'users']);
const types = { '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    const route = url.pathname.slice(5);
    if (!routes.has(route)) return json(res, 404, { error: 'Не найдено' });
    req.query = Object.fromEntries(url.searchParams);
    res.status = (status) => { res.statusCode = status; return res; };
    res.json = (value) => {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(value));
      return res;
    };
    let body = '';
    for await (const chunk of req) body += chunk;
    try { req.body = body ? JSON.parse(body) : {}; } catch { return json(res, 400, { error: 'Некорректный JSON' }); }
    try {
      const handler = (await import(pathToFileURL(join(process.cwd(), 'api', `${route}.js`)).href)).default;
      return handler(req, res);
    } catch (error) {
      console.error(error);
      return json(res, 500, { error: 'Внутренняя ошибка сервера' });
    }
  }

  const relative = normalize(url.pathname === '/' ? 'index.html' : url.pathname).replace(/^([/\\])+/, '');
  let file = join(root, relative);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log('Aftora CRM listening'));
