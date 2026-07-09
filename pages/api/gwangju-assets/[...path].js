import fs from 'fs';
import path from 'path';

const BASE_DIR = path.join(process.cwd(), 'src', 'common', 'gwangju');

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

export default function handler(req, res) {
  const segments = req.query.path;
  if (!Array.isArray(segments) || segments.length === 0) {
    res.status(400).end('잘못된 경로입니다.');
    return;
  }

  const requestedPath = path.join(BASE_DIR, ...segments);
  const resolved = path.normalize(requestedPath);

  if (resolved !== BASE_DIR && !resolved.startsWith(BASE_DIR + path.sep)) {
    res.status(400).end('허용되지 않는 경로입니다.');
    return;
  }

  let data;
  try {
    if (!fs.statSync(resolved).isFile()) throw new Error('not a file');
    data = fs.readFileSync(resolved);
  } catch {
    res.status(404).end('파일을 찾을 수 없습니다.');
    return;
  }

  const ext = path.extname(resolved).toLowerCase();
  res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).send(data);
}
