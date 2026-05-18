import { launchBrowser } from '../../lib/playwright-helper.js';
import Groq from 'groq-sdk';
import { getRemediation, getMessageKo } from '../../src/utils/w3c-remediation.js';

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

async function fetchHtmlWithPlaywright(url) {
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const html = await page.content();
    return html;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function callGroq(prompt) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const result = await groq.chat.completions.create({
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
  });
  return result.choices[0].message.content.trim();
}

async function translateMessages(texts) {
  if (!texts.length || !process.env.GROQ_API_KEY) return {};
  const prompt = `다음 W3C HTML 검사 메시지들을 자연스러운 한국어로 번역하세요.
HTML, CSS, alt, src, href, aria 등 기술 용어와 태그명은 그대로 유지하세요.
JSON 배열 형식으로만 반환하세요. 다른 설명 없이 번역문 배열만 출력하세요.

입력: ${JSON.stringify(texts)}`;

  const content = await callGroq(prompt);
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return {};
  const translated = JSON.parse(match[0]);
  return Object.fromEntries(texts.map((t, i) => [t, translated[i] ?? t]));
}

async function generateRemediations(texts) {
  if (!texts.length || !process.env.GROQ_API_KEY) return {};
  const prompt = `당신은 웹 접근성 및 HTML 전문가입니다.
다음 W3C HTML 검사 오류 메시지들에 대해 각각 한국어로 문제점과 조치방법을 작성하세요.
HTML, CSS, aria 등 기술 용어와 태그명은 그대로 유지하세요.
아래 JSON 배열 형식으로만 반환하세요. 다른 설명 없이 배열만 출력하세요.

형식:
[
  { "problem": "문제점 설명 (1~3문장)", "fix": "조치방법 (구체적인 코드 예시 포함)" },
  ...
]

입력 메시지:
${JSON.stringify(texts)}`;

  const content = await callGroq(prompt);
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return {};
  const items = JSON.parse(match[0]);
  return Object.fromEntries(texts.map((t, i) => [t, items[i] ?? null]));
}

async function fetchHtmlWithFetch(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AccessibilityChecker/1.0)' },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ detail: 'Method not allowed' });

  const { url } = req.body ?? {};
  if (!url) return res.status(400).json({ detail: 'url은 필수입니다.' });
  if (!isSafeUrl(url)) return res.status(400).json({ detail: '허용되지 않는 URL입니다.' });

  let html;
  try {
    html = await fetchHtmlWithPlaywright(url);
  } catch {
    try {
      html = await fetchHtmlWithFetch(url);
    } catch (e) {
      return res.status(502).json({ detail: `HTML 수집 실패: ${e.message}` });
    }
  }

  try {
    const validatorRes = await fetch('https://validator.w3.org/nu/?out=json', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (compatible; AccessibilityChecker/1.0)',
      },
      body: html,
      signal: AbortSignal.timeout(30000),
    });
    if (!validatorRes.ok) return res.status(502).json({ detail: `W3C validator 응답 오류: ${validatorRes.status}` });

    const data = await validatorRes.json();
    const messages = data.messages ?? [];
    const uniqueTexts = [...new Set(messages.map(m => m.message).filter(Boolean))];

    // 정적 규칙 없는 메시지만 Groq로 조치 생성
    const textsNeedingRemediation = uniqueTexts.filter(t => !getRemediation(t) || !getMessageKo(t));

    const [translations, aiRemediations] = await Promise.all([
      translateMessages(uniqueTexts.filter(t => !getMessageKo(t))).catch(() => ({})),
      generateRemediations(textsNeedingRemediation).catch(() => ({})),
    ]);

    return res.json({ messages, html, translations, aiRemediations });
  } catch (e) {
    return res.status(500).json({ detail: e.message });
  }
}
