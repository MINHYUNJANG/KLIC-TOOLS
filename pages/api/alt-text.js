import { launchBrowser } from '../../lib/playwright-helper.js';
import Groq from 'groq-sdk';
import * as cheerio from 'cheerio';

export const config = {
  api: { bodyParser: { sizeLimit: '16mb' } },
};

// 확인된 Groq 비전 모델만 사용
const VISION_MODELS = [
  'meta-llama/llama-4-scout-17b-16e-instruct',
  'llama-3.2-90b-vision-preview',
  'llama-3.2-11b-vision-preview',
];

const MAX_URL_IMAGES = 10;

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

const PROMPT = `당신은 웹 접근성(KWCAG 2.1) 전문가입니다. 이미지를 분석하여 적절한 대체텍스트를 생성해주세요.

다음 JSON 형식으로만 응답하세요 (코드블록 없이 JSON 객체만):
{
  "altText": "대체텍스트 (최대 100자, 장식용이면 빈 문자열)",
  "isDecorative": false,
  "isComplex": false,
  "description": "상세 설명 (isComplex가 true인 경우만 작성, 나머지는 빈 문자열)"
}

판단 기준:
- isDecorative: 순수 장식용(배경패턴·구분선·의미없는 장식)이면 true. altText는 반드시 ""
- isComplex: 차트·그래프·인포그래픽·텍스트 포함 이미지처럼 100자 이내 alt로 모든 정보 전달 불가능하면 true
- altText: 이미지 핵심 정보를 한국어로 간결하게. isDecorative이면 ""
- description: isComplex인 경우 이미지 내 모든 정보(수치·항목 등)를 빠짐없이 설명`;

async function analyzeImage(imageUrl, context) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const userText = context ? `이미지 맥락: ${context}\n\n${PROMPT}` : PROMPT;

  let lastError;
  for (const model of VISION_MODELS) {
    try {
      const result = await groq.chat.completions.create({
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl } },
            { type: 'text', text: userText },
          ],
        }],
        temperature: 0.1,
        max_tokens: 1024,
      });
      const raw = result.choices[0]?.message?.content?.trim() ?? '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error(`JSON 파싱 실패: ${raw.slice(0, 80)}`);
      return JSON.parse(match[0]);
    } catch (e) {
      lastError = e;
      // 다음 모델 시도 (모든 에러에 대해 계속 시도)
    }
  }
  throw new Error(`모든 모델 실패: ${lastError?.message ?? '알 수 없음'}`);
}

// 학교 CMS 서브콘텐츠 영역 셀렉터 우선순위 목록
const SUBCONTENT_SELECTORS = [
  '#cntnts',          // 나이스 CMS (cntntsId URL 파라미터 기반)
  '#subContent',
  '.subContent',
  '#sub_content',
  '.sub_content',
  '#content_area',
  '.content_area',
  '.cont_wrap',
  '.con_wrap',
  '.view_content',
  '.view_con',
  '.board_view',
  '.board_content',
  '.bbs_view',
  'article',
  'main',
  '#content',
  '.content',
];

function findContentRoot($, userSelector) {
  if (userSelector) {
    const el = $(userSelector);
    if (el.length) return el.first();
  }
  for (const sel of SUBCONTENT_SELECTORS) {
    const el = $(sel);
    if (el.length) return el.first();
  }
  return $('body');
}

function extractImagesFromHtml(html, pageUrl, userSelector) {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const root = findContentRoot($, userSelector);
  const results = [];

  root.find('img').each((_, el) => {
    const rawSrc = $(el).attr('src') || '';
    if (!rawSrc || rawSrc.startsWith('data:')) return;

    let src;
    try {
      src = new URL(rawSrc, base).href;
    } catch {
      return;
    }

    const ext = src.split('?')[0].split('.').pop()?.toLowerCase();
    if (['gif', 'ico', 'cur', 'svg'].includes(ext)) return;

    const w = parseInt($(el).attr('width') || '0', 10);
    const h = parseInt($(el).attr('height') || '0', 10);
    if (w > 0 && w < 16) return;
    if (h > 0 && h < 16) return;

    let context = '';
    const figure = $(el).closest('figure');
    if (figure.length) {
      const cap = figure.find('figcaption').first().text().trim();
      if (cap) context += `캡션: ${cap}. `;
    }
    let parent = $(el).parent();
    for (let i = 0; i < 6 && parent.length; i++) {
      const heading = parent.find('h1,h2,h3,h4,h5,h6').first();
      if (heading.length) { context += `제목: ${heading.text().trim()}.`; break; }
      parent = parent.parent();
    }

    results.push({
      src,
      currentAlt: $(el).attr('alt') ?? '',
      width: w,
      height: h,
      context: context.trim(),
    });
  });

  return results;
}

function detectUsedSelector($, userSelector) {
  if (userSelector && $(userSelector).length) return userSelector;
  for (const sel of SUBCONTENT_SELECTORS) {
    if ($(sel).length) return sel;
  }
  return null;
}

async function crawlPageImages(url, selector) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AltTextBot/1.0)' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    return {
      images: extractImagesFromHtml(html, url, selector),
      detectedSelector: detectUsedSelector($, selector),
    };
  } catch (fetchErr) {
    let browser;
    try {
      browser = await launchBrowser();
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const html = await page.content();
      const $ = cheerio.load(html);
      return {
        images: extractImagesFromHtml(html, url, selector),
        detectedSelector: detectUsedSelector($, selector),
      };
    } catch {
      throw fetchErr;
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed' });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ detail: 'GROQ_API_KEY가 설정되지 않았습니다.' });
  }

  const { url, selector, images: uploadedImages } = req.body ?? {};

  if (!url && !uploadedImages?.length) {
    return res.status(400).json({ detail: 'url 또는 images 중 하나는 필수입니다.' });
  }

  try {
    // 업로드 모드
    if (uploadedImages?.length) {
      const settled = await Promise.allSettled(
        uploadedImages.slice(0, 5).map(async ({ dataUri, name }) => {
          try {
            const analysis = await analyzeImage(dataUri, name ? `파일명: ${name}` : '');
            return { src: null, name: name ?? '', currentAlt: '', ...analysis };
          } catch (e) {
            return { src: null, name: name ?? '', currentAlt: '', altText: '', isDecorative: false, isComplex: false, description: '', error: String(e.message) };
          }
        })
      );
      return res.json({ images: settled.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) }) });
    }

    // URL 모드
    if (!isSafeUrl(url)) {
      return res.status(400).json({ detail: '허용되지 않는 URL입니다.' });
    }

    const { images: imgList, detectedSelector } = await crawlPageImages(url, selector?.trim() || null);
    const filtered = imgList.slice(0, MAX_URL_IMAGES);

    if (!filtered.length) {
      return res.json({ images: [], detectedSelector });
    }

    const settled = await Promise.allSettled(
      filtered.map(async img => {
        try {
          // 이미지 URL을 Groq에 직접 전달 (base64 변환 없음)
          const analysis = await analyzeImage(img.src, img.context);
          return { ...img, ...analysis };
        } catch (e) {
          return { ...img, altText: '', isDecorative: false, isComplex: false, description: '', error: String(e.message) };
        }
      })
    );

    return res.json({ images: settled.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) }), detectedSelector });

  } catch (e) {
    return res.status(500).json({ detail: String(e.message ?? e) });
  }
}
