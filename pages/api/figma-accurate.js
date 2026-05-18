import { put, list, del } from '@vercel/blob';
import {
  figmaAccurateMarkup,
  parseFigmaUrl,
  getTopFrameIds,
  fetchImageFillUrls,
  getFigmaNodeFull,
  collectIllustrationNodeIds,
  collectImageRefs,
} from '../../lib/figma.js';
import { convertFigmaNode } from '../../lib/figma-converter.js';

const TIMEOUT_MS = 60000;

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('처리 시간이 초과되었습니다.')), TIMEOUT_MS)
    ),
  ]);
}

function collectImageFillNodes(node, result = [], skipIds = new Set()) {
  if (!node || node.visible === false) return result;
  if (skipIds.has(node.id)) return result;
  const fill = (node.fills || []).find(f => f.visible !== false && f.type === 'IMAGE' && f.imageRef);
  if (fill) {
    const vis = (node.children || []).filter(c => c.visible !== false);
    result.push({ id: node.id, ref: fill.imageRef, isPure: vis.length === 0 });
  }
  for (const c of (node.children || [])) collectImageFillNodes(c, result, skipIds);
  return result;
}

async function fetchExportUrls(fileKey, nodeIds) {
  if (!nodeIds.length) return {};
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) return {};
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    const resp = await fetch(
      `https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(nodeIds.join(','))}&format=png&scale=2`,
      { headers: { 'X-Figma-Token': token }, signal: controller.signal }
    );
    clearTimeout(timer);
    if (!resp.ok) return {};
    const body = await resp.json();
    const images = body.images ?? {};
    return Object.fromEntries(Object.entries(images).filter(([, v]) => v));
  } catch (e) {
    console.warn('[일러스트 export 실패]', e.message);
    return {};
  }
}

// 기존 Blob 이미지 전체 삭제
async function clearAllBlobs() {
  try {
    let cursor;
    const urls = [];
    do {
      const result = await list({ prefix: 'figma-markup/', cursor, limit: 1000, token: process.env.BLOB_READ_WRITE_TOKEN });
      urls.push(...result.blobs.map(b => b.url));
      cursor = result.cursor;
      if (!result.hasMore) break;
    } while (cursor);
    if (urls.length > 0) await del(urls, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (e) {
    console.warn('[Blob 정리 실패]', e.message);
  }
}

// Figma CDN에서 이미지를 받아 Vercel Blob에 업로드 후 CDN URL 반환
async function saveImageToBlob(cdnUrl, blobPath) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const resp = await fetch(cdnUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    const ext = ct.includes('jpeg') ? 'jpg' : ct.includes('webp') ? 'webp' : 'png';
    const finalPath = blobPath.replace(/\.\w+$/, '') + '.' + ext;
    const buffer = Buffer.from(await resp.arrayBuffer());
    const { url } = await put(finalPath, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url, fileName: finalPath.split('/').pop() };
  } catch (e) {
    console.warn('[이미지 Blob 저장 실패]', e.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });
  try {
    const { url, markup_type = 'html', project_name = '' } = req.body;
    if (!url) return res.status(400).json({ detail: 'Figma URL이 필요합니다.' });

    // project_name 없으면 기존 방식 (이미지 저장 없음)
    if (!project_name.trim()) {
      const result = await withTimeout(figmaAccurateMarkup(url, markup_type));
      return res.json(result);
    }

    const safeName = project_name.trim().replace(/[\\/:*?"<>|]/g, '_');

    // ── Figma 노드 ID 파악 ────────────────────────────────────
    const [fileKey, nodeId] = parseFigmaUrl(url);
    let nodeIds;
    try {
      nodeIds = nodeId ? [nodeId] : await getTopFrameIds(fileKey);
    } catch (e) {
      throw new Error(`Figma 프레임 조회 실패: ${e.message}`);
    }
    if (!nodeIds.length) throw new Error('내보낼 프레임을 찾을 수 없습니다. Figma URL에 node-id를 포함해 주세요.');

    let allCdnUrls = {};
    try { allCdnUrls = await fetchImageFillUrls(fileKey); } catch { /* 계속 진행 */ }

    // ── Pass 1: 노드 데이터 전체 조회 (429 시 여기서 중단, 이전 이미지 보존) ──
    const nodeDataList = [];
    for (const nid of nodeIds.slice(0, 3)) {
      let nodeData;
      try { nodeData = await getFigmaNodeFull(fileKey, nid); } catch (e) {
        if (e.message === 'FIGMA_RATE_LIMIT' || e.message === 'FIGMA_TOKEN_INVALID') throw e;
        console.warn('[노드 조회 실패]', e.message);
        continue;
      }
      if (nodeData) nodeDataList.push(nodeData);
    }
    if (!nodeDataList.length) throw new Error('마크업 생성에 실패했습니다.');

    // API 성공 확인 후 이전 이미지 삭제 → 새 이미지 업로드 시작
    await clearAllBlobs();

    // ── Pass 2: 이미지 업로드 + 마크업 변환 ──────────────────────────────────
    const allHtml = [], allCss = [], allJsx = [];
    const savedImages = [];
    const blobUrls = {};
    let imgIdx = 0;

    for (const nodeData of nodeDataList) {
      const imageNodeMap = {};
      const bgImageUrls = {};
      const refCache = {};

      // ① 벡터 일러스트 그룹 → Figma export PNG → Blob 업로드
      const illNodeIds = collectIllustrationNodeIds(nodeData);
      if (illNodeIds.length > 0) {
        const exportUrls = await fetchExportUrls(fileKey, illNodeIds);
        const downloadTasks = illNodeIds
          .filter(id => exportUrls[id])
          .map(async (id) => {
            const blobPath = `figma-markup/${safeName}/images/img_${String(++imgIdx).padStart(2, '0')}`;
            const saved = await saveImageToBlob(exportUrls[id], blobPath);
            if (saved) {
              imageNodeMap[id] = saved.url;
              blobUrls[saved.fileName] = saved.url;
              return saved.fileName;
            }
            return null;
          });
        const settled = await Promise.allSettled(downloadTasks);
        settled.forEach(r => { if (r.status === 'fulfilled' && r.value) savedImages.push(r.value); });
      }

      // ② IMAGE fill 노드 → CDN 원본 이미지 → Blob 업로드
      const fillNodes = collectImageFillNodes(nodeData, [], new Set(illNodeIds));
      const fillTasks = fillNodes
        .filter(fn => allCdnUrls[fn.ref] && !refCache[fn.ref])
        .map(async (fn) => {
          const blobPath = `figma-markup/${safeName}/images/img_${String(++imgIdx).padStart(2, '0')}`;
          const saved = await saveImageToBlob(allCdnUrls[fn.ref], blobPath);
          if (saved) {
            refCache[fn.ref] = saved.url;
            bgImageUrls[fn.ref] = saved.url;
            blobUrls[saved.fileName] = saved.url;
            return { fn, blobUrl: saved.url, fileName: saved.fileName };
          }
          return null;
        });

      const fillSettled = await Promise.allSettled(fillTasks);
      fillSettled.forEach(r => {
        if (r.status === 'fulfilled' && r.value) {
          const { fn, blobUrl, fileName } = r.value;
          savedImages.push(fileName);
          if (fn.isPure) imageNodeMap[fn.id] = blobUrl;
          bgImageUrls[fn.ref] = blobUrl;
        }
      });

      fillNodes.forEach(fn => {
        if (refCache[fn.ref]) {
          bgImageUrls[fn.ref] = refCache[fn.ref];
          if (fn.isPure && !imageNodeMap[fn.id]) imageNodeMap[fn.id] = refCache[fn.ref];
        }
      });

      // ③ 마크업 변환
      const result = convertFigmaNode(nodeData, markup_type, bgImageUrls, new Set(), imageNodeMap);

      if (markup_type === 'react') {
        allJsx.push(result.jsx);
        allCss.push(result.css);
      } else {
        allHtml.push(result.html);
        allCss.push(result.css);
      }
    }

    const finalResult = { css: allCss.join('\n\n'), frame_count: allHtml.length || allJsx.length };
    if (markup_type === 'react') finalResult.jsx = allJsx.join('\n\n');
    else finalResult.html = allHtml.join('\n\n');
    if (savedImages.length > 0) finalResult.saved_images = [...new Set(savedImages)];
    if (Object.keys(blobUrls).length > 0) finalResult.blob_urls = blobUrls;

    res.json(finalResult);
  } catch (e) {
    let detail = e.message;
    let status = 500;
    if (e.message === 'FIGMA_RATE_LIMIT') {
      status = 429;
      detail = 'Figma API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.';
    } else if (e.message === 'FIGMA_TOKEN_INVALID') {
      status = 403;
      detail = 'Figma API 토큰이 유효하지 않거나 만료되었습니다. .env.local의 FIGMA_ACCESS_TOKEN을 확인해주세요.';
    } else if (e.message.includes('올바른 Figma URL')) {
      status = 400;
    }
    res.status(status).json({ detail });
  }
}
