import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import * as cheerio from 'cheerio';
import { chromium, firefox, webkit } from 'playwright';
import { crawl } from './lib/crawler.js';
import { autoMarkup, footerAutoMarkup } from './lib/ai-mapper.js';
import {
  figmaAccurateMarkup,
  parseFigmaUrl,
  getTopFrameIds,
  collectImageRefs,
  fetchImageFillUrls,
  getFigmaNodeFull,
  collectIllustrationNodeIds,
} from './lib/figma.js';
import { convertFigmaNode } from './lib/figma-converter.js';
import { generateHwpx } from './lib/generate-hwpx.js';

const app = express();
app.use(express.json({ limit: '10mb' }));

const TIMEOUT_MS = 60000;
const BROWSER_CONFIGS = {
  chrome: { engine: 'chromium', viewport: { width: 1920, height: 1080 } },
  edge: {
    engine: 'chromium',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0',
  },
  whale: {
    engine: 'chromium',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Whale/3.26.224.18 Safari/537.36',
  },
  firefox: { engine: 'firefox', viewport: { width: 1920, height: 1080 } },
  safari: {
    engine: 'chromium',
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  },
  ios: {
    engine: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  },
  android: {
    engine: 'chromium',
    viewport: { width: 412, height: 915 },
    isMobile: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  },
};
const PLAYWRIGHT_ENGINES = { chromium, firefox, webkit };

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.')), TIMEOUT_MS)
    ),
  ]);
}

app.post('/api/crawl', async (req, res) => {
  try {
    const { url, selector = '' } = req.body;
    const result = await withTimeout(crawl(url, selector));
    if (!result.success) return res.status(400).json({ detail: result.error });
    res.json(result);
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
});

app.post('/api/auto-markup', async (req, res) => {
  try {
    const { url, selector = '', html: directHtml = '', context = '' } = req.body;
    let crawled;
    if (directHtml) {
      crawled = { success: true, html: directHtml, text: '', images: [], school_name: '' };
    } else {
      crawled = await withTimeout(crawl(url, selector));
      if (!crawled.success) return res.status(400).json({ detail: crawled.error });
    }
    const markupFn = context === 'footer' ? footerAutoMarkup : autoMarkup;
    const html = await withTimeout(markupFn(crawled));
    res.json({ html, crawled });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
});

// ─── 피그마 이미지 저장 유틸 ────────────────────────────────────────────────────

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
    // null 값(렌더 불가 노드) 제거 후 반환
    const images = body.images ?? {};
    return Object.fromEntries(Object.entries(images).filter(([, v]) => v));
  } catch (e) {
    console.warn('[일러스트 export 실패]', e.message);
    return {};
  }
}

async function saveImage(cdnUrl, blobPath) {
  if (process.env.FIGMA_MOCK === 'true') {
    const fileName = blobPath.split('/').pop() + '.jpg';
    return { url: cdnUrl, fileName };
  }
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
    const { put } = await import('@vercel/blob');
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

// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/figma-accurate', async (req, res) => {
  try {
    const { url, markup_type = 'html', project_name = '' } = req.body;
    if (!url) return res.status(400).json({ detail: 'Figma URL이 필요합니다.' });

    // 프로젝트명 없으면 기존 방식 사용
    if (!project_name.trim()) {
      const result = await withTimeout(figmaAccurateMarkup(url, markup_type));
      return res.json(result);
    }

    const safeName = project_name.trim().replace(/[\\/:*?"<>|]/g, '_');

    // ── Figma 노드 ID 파악 ────────────────────────────────────────────────
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

    const allHtml = [], allCss = [], allJsx = [];
    const savedImages = [];
    let imgIdx = 0;

    for (const nid of nodeIds.slice(0, 3)) {
      let nodeData;
      try { nodeData = await getFigmaNodeFull(fileKey, nid); } catch (e) {
        if (e.message.startsWith('FIGMA_RATE_LIMIT') || e.message === 'FIGMA_TOKEN_INVALID') throw e;
        console.warn('[노드 조회 실패]', e.message);
        continue;
      }
      if (!nodeData) continue;

      const imageNodeMap = {};
      const bgImageUrls = {};
      const refCache = {};

      // ① 벡터 일러스트 그룹 → Figma export API로 PNG 렌더링
      const illNodeIds = collectIllustrationNodeIds(nodeData);
      if (illNodeIds.length > 0) {
        const exportUrls = await fetchExportUrls(fileKey, illNodeIds);
        const downloadTasks = illNodeIds
          .filter(id => exportUrls[id])
          .map(async (id) => {
            const blobPath = `figma-markup/${safeName}/images/img_${String(++imgIdx).padStart(2, '0')}`;
            const saved = await saveImage(exportUrls[id], blobPath);
            if (saved) {
              imageNodeMap[id] = saved.url;
              return saved.fileName;
            }
            return null;
          });
        const settled = await Promise.allSettled(downloadTasks);
        settled.forEach(r => { if (r.status === 'fulfilled' && r.value) savedImages.push(r.value); });
      }

      // ② IMAGE fill 노드 → CDN 원본 이미지 다운로드
      const fillNodes = collectImageFillNodes(nodeData, [], new Set(illNodeIds));
      const fillTasks = fillNodes
        .filter(fn => allCdnUrls[fn.ref] && !refCache[fn.ref])
        .map(async (fn) => {
          const blobPath = `figma-markup/${safeName}/images/img_${String(++imgIdx).padStart(2, '0')}`;
          const saved = await saveImage(allCdnUrls[fn.ref], blobPath);
          if (saved) {
            refCache[fn.ref] = saved.url;
            bgImageUrls[fn.ref] = saved.url;
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

    if (!allHtml.length && !allJsx.length) throw new Error('마크업 생성에 실패했습니다.');

    const finalResult = { css: allCss.join('\n\n'), frame_count: allHtml.length || allJsx.length };
    if (markup_type === 'react') finalResult.jsx = allJsx.join('\n\n');
    else finalResult.html = allHtml.join('\n\n');
    if (savedImages.length > 0) finalResult.saved_images = [...new Set(savedImages)];

    res.json(finalResult);
  } catch (e) {
    let detail = e.message;
    let status = 500;
    if (e.message.startsWith('FIGMA_RATE_LIMIT')) {
      status = 429;
      const waitSec = parseInt(e.message.split(':')[1] || '0', 10);
      const waitStr = waitSec <= 0 ? '잠시'
        : waitSec < 60 ? `${waitSec}초`
        : waitSec < 3600 ? `${Math.ceil(waitSec / 60)}분`
        : `${Math.ceil(waitSec / 3600)}시간`;
      detail = `Figma API 요청 한도를 초과했습니다. ${waitStr} 후 다시 시도해주세요.`;
    } else if (e.message === 'FIGMA_TOKEN_INVALID') {
      status = 403;
      detail = 'Figma API 토큰이 유효하지 않거나 만료되었습니다. .env.local의 FIGMA_ACCESS_TOKEN을 확인해주세요.';
    } else if (e.message.includes('올바른 Figma URL')) {
      status = 400;
    }
    res.status(status).json({ detail });
  }
});

app.post('/api/w3c', async (req, res) => {
  let browser;
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ detail: 'url은 필수입니다.' });
    if (!isSafeUrl(url)) return res.status(400).json({ detail: '허용되지 않는 URL입니다.' });

    const validatorUrl = `https://validator.w3.org/nu/?doc=${encodeURIComponent(url)}&out=json`;
    const response = await fetch(validatorUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MarkupTool-W3C-Checker/1.0)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) return res.status(502).json({ detail: `W3C validator 응답 오류: ${response.status}` });

    const data = await response.json();
    const messages = data.messages ?? [];
    let validatorScreenshot = null;

    if (messages.length === 0) {
      try {
        const vnuVersion = data.version ?? '26.5.9';
        const evidenceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #000; background: #fff; }
h1 { background: #396592; color: #fff; font-size: 22px; font-weight: bold; padding: 12px 16px; margin: 0; }
.subtitle { color: #396592; font-size: 13px; padding: 8px 16px 4px; }
.showing { font-weight: bold; font-size: 13px; padding: 4px 16px 12px; }
.checker-input { border: 1px solid #aaa; margin: 0 16px 16px; padding: 10px 12px; }
.checker-input legend { font-weight: bold; padding: 0 4px; font-size: 13px; }
.show-row { display: flex; align-items: center; gap: 14px; margin-bottom: 8px; font-size: 13px; }
.show-row label { display: flex; align-items: center; gap: 3px; }
.check-row { display: flex; align-items: center; gap: 8px; font-size: 13px; margin-bottom: 8px; }
.url-input { width: 100%; border: 1px solid #aaa; padding: 3px 5px; font-size: 13px; margin-bottom: 8px; font-family: monospace; }
.check-btn, .options-btn { border: 1px solid #aaa; background: #e8e8e8; padding: 3px 10px; font-size: 13px; cursor: default; }
.result-ok { background: #cfc; border: 1px solid #090; padding: 8px 12px; margin: 0 16px 8px; font-weight: bold; font-size: 14px; }
.result-meta { color: #555; font-size: 12px; padding: 0 16px 4px; }
hr { border: none; border-top: 1px solid #ccc; margin: 12px 16px; }
.footer { padding: 8px 16px; font-size: 12px; color: #396592; }
select { font-size: 13px; border: 1px solid #aaa; padding: 1px 2px; }
</style>
</head>
<body>
<h1>Nu Html Checker</h1>
<p class="subtitle">This tool is an ongoing experiment in better HTML checking, and its behavior remains subject to change</p>
<p class="showing">Showing results for ${url} (checked with vnu ${vnuVersion})</p>
<fieldset class="checker-input">
<legend>Checker Input</legend>
<div class="show-row"><span>Show</span><label><input type="checkbox" disabled> source</label><label><input type="checkbox" disabled> outline</label><label><input type="checkbox" disabled> image report</label><label><input type="checkbox" disabled> errors &amp; warnings only</label><button class="options-btn" disabled>Options...</button></div>
<div class="check-row"><span>Check by</span><select disabled><option>address</option></select></div>
<input class="url-input" type="text" value="${url}" readonly>
<button class="check-btn" disabled>Check</button>
</fieldset>
<p class="result-ok">Document checking completed. No errors or warnings to show.</p>
<p class="result-meta">Used the HTML parser. Externally specified character encoding was UTF-8.</p>
<hr><p class="footer">About this checker &bull; Report an issue</p>
</body>
</html>`;
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1280, height: 600 } });
        const page = await context.newPage();
        await page.setContent(evidenceHtml, { waitUntil: 'load' });
        const contentHeight = await page.evaluate(() => document.body.scrollHeight);
        await page.setViewportSize({ width: 1280, height: contentHeight });
        const buffer = await page.screenshot({ type: 'png', fullPage: false });
        validatorScreenshot = buffer.toString('base64');
      } catch {
        // 검사 결과는 캡처 실패와 무관하게 반환합니다.
      } finally {
        if (browser) await browser.close().catch(() => {});
        browser = null;
      }
    }

    res.json({ ...data, validatorScreenshot });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ detail: e.message });
  }
});

app.post('/api/css', async (req, res) => {
  let browser;
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ detail: 'url은 필수입니다.' });
    if (!isSafeUrl(url)) return res.status(400).json({ detail: '허용되지 않는 URL입니다.' });

    const apiUrl = `https://jigsaw.w3.org/css-validator/validator?uri=${encodeURIComponent(url)}&output=json`;
    const apiResponse = await fetch(apiUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarkupTool/1.0)' },
      signal: AbortSignal.timeout(30000),
    });
    if (!apiResponse.ok) return res.status(502).json({ detail: `CSS 검사기 응답 오류: ${apiResponse.status}` });

    const data = await apiResponse.json();
    const cssvalidation = data.cssvalidation ?? {};
    const result = cssvalidation.result ?? {};
    const errorCount = result.errorcount ?? 0;
    const warningCount = result.warningcount ?? 0;
    let errors = cssvalidation.errors ?? [];
    let warnings = cssvalidation.warnings ?? [];
    if (!Array.isArray(errors)) errors = errors ? [errors] : [];
    if (!Array.isArray(warnings)) warnings = warnings ? [warnings] : [];

    let cssScreenshot = null;
    try {
      const pageUrl = `https://jigsaw.w3.org/css-validator/validator?uri=${encodeURIComponent(url)}&lang=ko&warning=0`;
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        ['#results ~ *', '.boxtitle', 'table.cssSource', '#footer', 'div.footer', '#parsedSection'].forEach(sel => {
          try { document.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
        });
        const results = document.getElementById('results');
        if (results) {
          let next = results.nextElementSibling;
          while (next) {
            const target = next;
            next = next.nextElementSibling;
            target.remove();
          }
          ['#errors', '#warnings', '.error-list', '.warning-list', 'dl', 'table'].forEach(sel => {
            try { results.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
          });
        }
      });
      const contentHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.setViewportSize({ width: 1280, height: Math.min(contentHeight, 1200) });
      const buffer = await page.screenshot({ type: 'png', fullPage: false });
      cssScreenshot = buffer.toString('base64');
    } catch {
      // 검사 결과는 캡처 실패와 무관하게 반환합니다.
    } finally {
      if (browser) await browser.close().catch(() => {});
      browser = null;
    }

    res.json({ errors, warnings, errorCount, warningCount, cssScreenshot });
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ detail: e.message });
  }
});

app.post('/api/screenshot', async (req, res) => {
  let browser;
  try {
    const { url, browser: browserId } = req.body;
    if (!url || !browserId) return res.status(400).json({ detail: 'url과 browser는 필수입니다.' });
    if (!isSafeUrl(url)) return res.status(400).json({ detail: '허용되지 않는 URL입니다.' });

    const config = BROWSER_CONFIGS[browserId];
    if (!config) return res.status(400).json({ detail: `지원하지 않는 브라우저: ${browserId}` });

    const engineType = PLAYWRIGHT_ENGINES[config.engine];
    browser = await engineType.launch({ headless: true });
    const contextOptions = { viewport: config.viewport };
    if (config.userAgent) contextOptions.userAgent = config.userAgent;
    if (config.isMobile) contextOptions.isMobile = true;

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);
    const fullHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: config.viewport.width, height: fullHeight });
    await page.waitForTimeout(300);
    const buffer = await page.screenshot({ type: 'png', fullPage: false });

    res.json({ image: buffer.toString('base64') });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});

app.post('/api/download-hwpx', async (req, res) => {
  try {
    const { items = [] } = req.body;
    if (!items.length) return res.status(400).json({ detail: '항목이 없습니다.' });

    const uniqueUrls = [...new Set(items.map(item => item.url).filter(Boolean))];
    const titleMap = {};
    await Promise.all(uniqueUrls.map(async url => {
      titleMap[url] = await fetchTitle(url);
    }));

    const enrichedItems = items.map(item => ({
      ...item,
      title: titleMap[item.url] || item.url,
    }));

    const templatePath = path.join(process.cwd(), 'template.hwpx');
    const hwpx = generateHwpx(templatePath, { items: enrichedItems });
    res.setHeader('Content-Type', 'application/vnd.hancom.hwpx');
    res.setHeader('Content-Disposition', 'attachment; filename="webstandard_inspection.hwpx"');
    res.setHeader('Content-Length', String(hwpx.length));
    res.send(hwpx);
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
});

// ─── URL 추출 ────────────────────────────────────────────────
async function extractUrlsFromSitemap(origin) {
  const candidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/sitemap.xml`,
  ];
  for (const u of candidates) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const xml = await res.text();
      const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
        .map(m => m[1].trim())
        .filter(u => !u.endsWith('.xml'));
      if (urls.length > 0) return urls;
    } catch {}
  }
  return null;
}

async function extractUrlsFromNav(pageUrl) {
  const origin = new URL(pageUrl).origin;
  let html;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    html = await page.content();
  } catch {
    const res = await fetch(pageUrl, { signal: AbortSignal.timeout(8000) });
    html = await res.text();
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  const $ = cheerio.load(html);
  // url → 메뉴명 맵 (처음 발견한 앵커 텍스트 우선)
  const urlMap = new Map();

  const addLink = (a) => {
    try {
      const href = new URL($(a).attr('href'), pageUrl).href;
      if (href.startsWith(origin) && !href.match(/\.(jpg|jpeg|png|gif|pdf|zip|hwp|docx?)(\?|$)/i)) {
        if (!urlMap.has(href)) {
          const text = $(a).text().replace(/\s+/g, ' ').trim();
          urlMap.set(href, text);
        }
      }
    } catch {}
  };

  // 네비게이션/메뉴 영역 우선 탐색
  const NAV_SEL = 'nav, #gnb, #lnb, .gnb, .lnb, .nav, .menu, .navigation, header ul, #menu, .top-menu, .site-map';
  $(NAV_SEL).find('a[href]').each((_, a) => addLink(a));

  // 네비게이션에서 충분히 못 찾으면 전체 링크에서 추가
  if (urlMap.size < 5) {
    $('a[href]').each((_, a) => addLink(a));
  }

  return urlMap;
}

async function fetchTitle(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
    });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = cheerio.load(html);
    return $('title').first().text().trim().replace(/\s+/g, ' ') || '';
  } catch { return ''; }
}

async function fetchTitles(urls, concurrency = 5) {
  const results = new Array(urls.length).fill('');
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const titles = await Promise.all(batch.map(fetchTitle));
    titles.forEach((t, j) => { results[i + j] = t; });
  }
  return results;
}

app.post('/api/extract-urls', async (req, res) => {
  try {
    const { url } = req.body;
    const origin = new URL(url).origin;
    const homeUrl = origin + '/';

    // 사이트맵과 nav 메뉴명 맵을 항상 병렬로 수집
    const [sitemapUrls, mapFromInput, mapFromHome] = await Promise.all([
      extractUrlsFromSitemap(origin),
      extractUrlsFromNav(url),
      homeUrl !== url ? extractUrlsFromNav(homeUrl) : Promise.resolve(new Map()),
    ]);

    // nav 결과 병합 (입력 URL 결과 우선)
    const navMap = new Map([...mapFromHome, ...mapFromInput]);

    let urlList;
    let source;
    if (sitemapUrls && sitemapUrls.length > 0) {
      urlList = sitemapUrls;
      source = 'sitemap';
    } else {
      urlList = [...navMap.keys()];
      source = 'nav';
    }

    const unique = [...new Set(urlList)].slice(0, 200);
    // nav 맵에 메뉴명이 있으면 우선 사용, 없으면 빈 문자열
    const items = unique.map(u => ({ url: u, title: navMap.get(u) || '' }));

    res.json({ items, source, total: items.length });
  } catch (e) {
    res.status(500).json({ detail: e.message });
  }
});

// ─── 원본 HTML 단순 가져오기 (AI 없음, charset 자동 감지) ─────────────────
function isSafeUrl(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (!['http:', 'https:'].includes(protocol)) return false;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|::1)/.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

app.post('/api/fetch-markup', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL이 필요합니다.' });
  if (!isSafeUrl(url)) return res.status(400).json({ error: '허용되지 않는 URL입니다.' });

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return res.status(response.status).json({ error: `페이지를 가져올 수 없습니다. (${response.status})` });

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || '';
    let charset = 'utf-8';
    const ctMatch = contentType.match(/charset=([^\s;]+)/i);
    if (ctMatch) charset = ctMatch[1].toLowerCase();

    const preview = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 4096));
    const metaMatch = preview.match(/<meta[^>]+charset=["']?\s*([^"'\s;>]+)/i);
    if (metaMatch) charset = metaMatch[1].toLowerCase();

    if (['euc-kr', 'ks_c_5601-1987', 'x-windows-949', 'cp949'].includes(charset)) charset = 'euc-kr';

    const html = new TextDecoder(charset, { fatal: false }).decode(buffer);
    res.json({ html });
  } catch (err) {
    res.status(500).json({ error: `요청 실패: ${err.message}` });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
