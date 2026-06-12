import JSZip from 'jszip';

function getSafeDownloadName(value, fallback = '마크업') {
  const safeName = String(value || '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');
  return safeName || fallback;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  try {
    const { files, siteName = '마크업' } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ detail: '다운로드할 파일이 없습니다.' });
    }

    const zip = new JSZip();
    const usedNames = new Set();

    for (const { name, html } of files) {
      if (!html?.trim()) continue;

      let safeName = getSafeDownloadName(name);

      // 중복 파일명 방지
      let finalName = safeName;
      let counter = 1;
      while (usedNames.has(finalName)) {
        finalName = `${safeName}(${counter++})`;
      }
      usedNames.add(finalName);

      const fullHtml = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name || '마크업'}</title>
</head>
<body>
${html}
</body>
</html>`;

      zip.file(`${finalName}.html`, fullHtml);
    }

    const safeZipName = getSafeDownloadName(siteName);
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(safeZipName)}.zip`
    );
    res.send(zipBuffer);
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
}
