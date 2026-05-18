import path from 'path';
import { generateCanvasHwpx } from '../../lib/generate-canvas-hwpx.js';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: '50mb',
  },
};

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ detail: '저장할 이미지가 없습니다.' });

    const templatePath = path.join(process.cwd(), 'template.hwpx');
    const hwpx = generateCanvasHwpx(templatePath, { image });
    res.setHeader('Content-Type', 'application/vnd.hancom.hwpx');
    res.setHeader('Content-Disposition', 'attachment; filename="klic-canvas.hwpx"');
    res.setHeader('Content-Length', String(hwpx.length));
    res.send(hwpx);
  } catch (error) {
    res.status(500).json({ detail: error.message });
  }
}
