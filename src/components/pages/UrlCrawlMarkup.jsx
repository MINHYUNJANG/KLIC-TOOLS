import { useState, useRef, useEffect } from 'react';
import PageHowTo from '../PageHowTo';
import { formatHtml } from '../../utils/formatHtml';
import { isImageOnlyContent, hasContentImage, getContentImageUrls } from '../../utils/ocrSymbol';
import greeting from '../../templates/greeting';
import history from '../../templates/history';
import symbol from '../../templates/symbol';

// auto-markup 결과 HTML의 테이블 구조만 정규화
// applyTableSemantics는 내부에서 메인 document.createElement를 쓰므로
// DOMParser document와 컨텍스트가 달라 래핑이 깨짐 → 직접 구현
function applyTableProcessing(html) {
  if (!html || !html.includes('<table')) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');

  Array.from(doc.querySelectorAll('table')).forEach(table => {
    if (table.closest('table')) return; // 중첩 테이블 제외

    table.removeAttribute('class');

    // div.tbl-st 래핑 보정
    const parent = table.parentElement;
    const parentIsTblSt = parent && parent.tagName === 'DIV' && /\btbl-st\b/.test(parent.className || '');
    if (parentIsTblSt) {
      // 이미 올바른 wrapper div가 있음 — 클래스 유지 (scroll-w 포함)
    } else if (parent && parent.tagName === 'DIV' && parent.children.length === 1) {
      parent.className = 'tbl-st scroll-w';
    } else {
      const wrapper = doc.createElement('div');
      wrapper.className = 'tbl-st scroll-w';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }

    // thead / tbody 분리 + 첫 행 th 변환
    const allRows = Array.from(
      table.querySelectorAll(':scope > tr, :scope > tbody > tr, :scope > thead > tr, :scope > tfoot > tr')
    );
    if (!allRows.length) return;

    const thead = doc.createElement('thead');
    const tbody = doc.createElement('tbody');

    allRows.forEach((row, i) => {
      if (i === 0) {
        Array.from(row.cells).forEach(cell => {
          if (cell.tagName === 'TD') {
            const th = doc.createElement('th');
            th.setAttribute('scope', 'col');
            while (cell.firstChild) th.appendChild(cell.firstChild);
            Array.from(cell.attributes).forEach(a => {
              if (a.name !== 'scope') th.setAttribute(a.name, a.value);
            });
            cell.replaceWith(th);
          } else {
            cell.setAttribute('scope', 'col');
          }
        });
        thead.appendChild(row);
      } else {
        tbody.appendChild(row);
      }
    });

    // caption 자동 생성
    const headerTexts = Array.from(thead.querySelectorAll('th'))
      .map(th => th.textContent.trim()).filter(Boolean);

    const existingCaption = table.querySelector('caption');
    table.innerHTML = '';
    if (existingCaption) {
      table.appendChild(existingCaption);
    } else if (headerTexts.length) {
      const caption = doc.createElement('caption');
      caption.textContent = `${headerTexts.join(', ')}의 정보를 포함한 표입니다.`;
      table.appendChild(caption);
    }
    if (thead.hasChildNodes()) table.appendChild(thead);
    table.appendChild(tbody);
  });

  return doc.body.innerHTML;
}

const ALL_TEMPLATES = [...greeting, ...history, ...symbol];
const CATEGORY_TEMPLATES = { greeting, history, symbol };

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

function shortLabel(url, title) {
  if (title) return title.length > 20 ? title.slice(0, 20) + '…' : title;
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : u.hostname;
  } catch { return url; }
}

function buildIframeDoc(bodyContent, previewStyle = '') {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.css">
  <link rel="stylesheet" href="/basic.css">
  <link rel="stylesheet" href="/con_com.css">
  <link rel="stylesheet" href="/theme.css">
  <link rel="stylesheet" href="/sub_com.css">
  ${previewStyle ? `<style>${previewStyle}</style>` : ''}
  <script>
    window.addEventListener('error', function (event) {
      if (event.message && event.message.indexOf("reading 'classList'") > -1) {
        event.preventDefault();
      }
    });
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason;
      var message = reason && (reason.message || String(reason));
      if (message && message.indexOf("reading 'classList'") > -1) {
        event.preventDefault();
      }
    });
  </script>
  <script src="https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
</head>
<body style="padding:1.5rem 2.5rem;">
${bodyContent}
</body>
</html>`;
}

const INNER_NOISE_KEYWORDS = [
  'header', 'footer', 'gnb', 'lnb', 'snb', 'sidebar',
  'nav', 'navigation', 'menu', 'quick', 'banner', 'ad',
  'location', 'breadcrumb', 'crumb', 'sns', 'snsbox', 'share',
  'print', 'toolbar', 'util', 'floating', 'popup',
  'title_bar', 'titlebar', 'tit_bar', 'titbar',
  'sub_visual', 'page_head', 'cont_head', 'sub_head',
];

function removeInnerNoise(el) {
  el.querySelectorAll('div, nav, ul, ol, p, span, button, a').forEach(child => {
    const id = (child.id || '').toLowerCase();
    const cls = (child.className || '').toLowerCase();
    if (INNER_NOISE_KEYWORDS.some(kw => id.includes(kw) || cls.includes(kw))) {
      child.remove();
    }
  });
}

// 텍스트 패턴 기반 breadcrumb 제거 (HOME > 학교소개 > ... 등)
// 클래스명에 무관하게 "HOME >" 또는 "홈 >" 으로 시작하는 위치 표시 요소를 제거
function removeBreadcrumb(el) {
  el.querySelectorAll('div, nav, ul, ol, p').forEach(child => {
    const text = child.textContent.replace(/\s+/g, ' ').trim();
    if (text.length < 200 && /^(HOME|홈|메인)\s*[>▶›»·]/i.test(text)) {
      child.remove();
    }
  });
}

function extractContent(html, selector = '', baseUrl = '') {
  const absolutizeImages = (doc) => {
    if (!baseUrl) return;
    doc.querySelectorAll('img[src]').forEach(img => {
      try { img.src = new URL(img.getAttribute('src'), baseUrl).href; } catch {}
    });
  };

  let doc;
  if (selector.trim()) {
    doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
    absolutizeImages(doc);
    const matched = Array.from(doc.querySelectorAll(selector.trim()));
    if (matched.length > 0) {
      matched.forEach(el => {
        removeInnerNoise(el);
        removeBreadcrumb(el);
        el.querySelectorAll('*').forEach(child => {
          ['style', 'onclick', 'onload', 'onerror'].forEach(attr => child.removeAttribute(attr));
        });
      });
      return formatHtml(matched.map(el => el.outerHTML).join('\n'));
    }
  }
  // 전체 HTML에서 DOM 셀렉터로 먼저 탐색 (<!-- contents --> 커멘트가 여러 개일 때 잘못된 구간이 잡히는 문제 방지)
  doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
  absolutizeImages(doc);
  const DOM_SELECTORS = [
    '.greeting',
    '#subContent', '#sub_content',
    '#sub_container', '#subContainer',
    'main',
    '#content', '#contents',
    '.contents', '.content',
    '#container',
    '#contArea', '#cont_area', '#contWrap', '#cont_wrap',
    '#contentArea', '#content_area', '#contentWrap', '#content_wrap',
    '#pageContent', '#page_content',
    '.sub_cont', '.subCont', '.sub_content',
    '#wrap_content', '#wrapContent',
  ];
  let target = null;
  for (const sel of DOM_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el) { target = el; break; }
  }
  if (target) {
    removeInnerNoise(target);
    removeBreadcrumb(target);
    target.querySelectorAll('*').forEach(el => {
      ['style', 'onclick', 'onload', 'onerror'].forEach(attr => el.removeAttribute(attr));
    });
    return formatHtml(target.innerHTML);
  }
  // 폴백: <!-- contents --> 커멘트 구간 추출
  const match = html.match(/<!--\s*contents\s*-->([\s\S]*?)<!--[^>]*contents[^>]*-->/i);
  const sourceHtml = match ? match[1].trim() : html;
  const fallbackDoc = new DOMParser().parseFromString(sourceHtml, 'text/html');
  fallbackDoc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
  absolutizeImages(fallbackDoc);
  removeInnerNoise(fallbackDoc.body);
  removeBreadcrumb(fallbackDoc.body);
  fallbackDoc.body.querySelectorAll('*').forEach(el => {
    ['style', 'onclick', 'onload', 'onerror'].forEach(attr => el.removeAttribute(attr));
  });
  return formatHtml(fallbackDoc.body.innerHTML);
}

// 푸터 영역만 추출 (푸터메뉴 카테고리 전용)
function extractFooterContent(html, baseUrl = '') {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());

  if (baseUrl) {
    doc.querySelectorAll('a[href]').forEach(a => {
      try { a.href = new URL(a.getAttribute('href'), baseUrl).href; } catch {}
    });
  }

  const FOOTER_SELECTORS = [
    'footer', '#footer', '.footer', '.fnb',
    '[class*="footer"]', '[id*="footer"]',
    '[class*="fnb"]', '[id*="fnb"]',
  ];

  let footerEl = null;
  for (const sel of FOOTER_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el) { footerEl = el; break; }
  }

  if (!footerEl) return formatHtml(doc.body.innerHTML);

  footerEl.querySelectorAll('*').forEach(el => {
    ['style', 'onclick', 'onload', 'onerror'].forEach(attr => el.removeAttribute(attr));
  });

  return formatHtml(footerEl.innerHTML);
}

function applyMarkupToTemplate(sourceMarkup, templateCode, templateId) {
  const template = ALL_TEMPLATES.find(t => t.id === templateId);
  if (template?.applyMapping) return template.applyMapping(sourceMarkup, templateCode);
  return templateCode;
}

function resizeIframe(iframe) {
  if (!iframe?.contentDocument?.body) return;
  const doc = iframe.contentDocument;
  const height = Math.max(
    doc.body.scrollHeight,
    doc.body.offsetHeight,
    doc.documentElement.scrollHeight,
    doc.documentElement.offsetHeight
  );
  iframe.style.height = height + 'px';
}

// ─── 결과 뷰어 ────────────────────────────────────────────────
function ResultViewer({ markup, onMarkupChange, templateId }) {
  const [tab, setTab] = useState(templateId ? 'preview' : 'code');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (tab !== 'preview' || !iframeRef.current) return;
    const tpl = templateId ? ALL_TEMPLATES.find(t => t.id === templateId) : null;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(buildIframeDoc(markup, tpl?.previewStyle || ''));
    doc.close();
    if (tpl?.previewHeight) {
      iframe.style.height = tpl.previewHeight + 'px';
    } else {
      iframe.onload = () => resizeIframe(iframe);
      setTimeout(() => resizeIframe(iframe), 300);
      setTimeout(() => resizeIframe(iframe), 1000);
    }
    return () => { iframe.onload = null; };
  }, [tab, markup, templateId]);

  async function handleCopy() {
    await navigator.clipboard.writeText(markup);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="crawl-result">
      <div className="crawl-result-header">
        <div className="crawl-tabs">
          <button className={`crawl-tab ${tab === 'code' ? 'is-active' : ''}`} onClick={() => setTab('code')}>마크업</button>
          <button className={`crawl-tab crawl-tab--preview ${tab === 'preview' ? 'is-active' : ''}`} onClick={() => setTab('preview')}>미리보기</button>
        </div>
        <button className="crawl-copy-btn" onClick={handleCopy}>{copied ? '복사됨 ✓' : '복사'}</button>
      </div>
      {tab === 'code' ? (
        <textarea className="crawl-textarea" value={markup} onChange={e => onMarkupChange(e.target.value)} spellCheck={false} />
      ) : (
        <iframe ref={iframeRef} className="crawl-preview" title="미리보기" sandbox="allow-same-origin allow-scripts" />
      )}
    </div>
  );
}

// ─── 셀렉터 재추출 패널 ──────────────────────────────────────
function BatchRetryPanel({ result, onRetry }) {
  const [retryUrl, setRetryUrl] = useState(result.url);
  const [retrySelector, setRetrySelector] = useState(result.selector || '');
  const [loading, setLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  async function handleRetry() {
    if (!retryUrl.trim()) return;
    setLoading(true);
    try {
      let html = '';

      if (result.templateId) {
        // 템플릿 모드 재시도
        const tpl = ALL_TEMPLATES.find(t => t.id === result.templateId);
        if (tpl) {
          const fetchRes = await fetch('/api/fetch-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: retryUrl.trim() }),
          });
          let fetchData = {};
          try { fetchData = await fetchRes.json(); } catch {}
          if (!fetchRes.ok) throw new Error(fetchData.error || '실패');

          const extracted = extractContent(fetchData.html, retrySelector.trim(), retryUrl.trim());

          if (tpl.category === '상징') {
            // 상징 템플릿: DOM에서 상징 아이템 파싱 가능 여부 먼저 확인
            const { parseSymbolSource } = await import('../../templates/symbol.js');
            const docForCheck = new DOMParser().parseFromString(extracted, 'text/html');
            const symbolItems = parseSymbolSource(docForCheck.body);

            if (symbolItems.length > 0) {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            } else {
              const imgUrls = getContentImageUrls(extracted, retryUrl.trim());
              if (imgUrls.length > 0) {
                setOcrStatus('이미지 OCR 분석 중…');
                try {
                  const SYMBOL_PROMPT = `이 이미지는 학교 상징 페이지입니다. 아래 형식으로 각 항목의 이름과 설명을 추출하세요.

교목 [이름]
[교목 설명 (있는 경우)]
교화 [이름]
[교화 설명 (있는 경우)]
교표
[교표 설명 (있는 경우)]
교기
[교기 설명 (있는 경우)]
교훈: [교훈 내용]
교가: 있음 (교가 악보가 보이는 경우)

규칙: 없는 항목은 완전히 생략하세요. "없음" 같은 값은 절대 쓰지 마세요.`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: SYMBOL_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  const { parseSymbolOcr, buildSyntheticSymbolHtml, findSongImageFromHtml, extractSongLyricsFromImage } = await import('../../utils/ocrSymbol.js');
                  const detectedSongUrl = findSongImageFromHtml(extracted, retryUrl.trim())
                    || (imgUrls.length >= 2 ? imgUrls[imgUrls.length - 1] : '');
                  if (ocrText.trim()) {
                    const { items, sloganText, hasSong } = parseSymbolOcr(ocrText);
                    const songImgUrl = detectedSongUrl || (hasSong ? imgUrls[0] : '');
                    if (items.length > 0) {
                      const songLyrics = songImgUrl ? await extractSongLyricsFromImage(songImgUrl).catch(() => null) : null;
                      html = formatHtml(applyMarkupToTemplate(
                        buildSyntheticSymbolHtml(items, sloganText, songImgUrl, '', songLyrics),
                        tpl.code, tpl.id
                      ));
                    } else {
                      html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                    }
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                } finally {
                  setOcrStatus('');
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else if (tpl.category === '연혁') {
            const directResult = applyMarkupToTemplate(extracted, tpl.code, tpl.id);
            if (directResult !== tpl.code) {
              html = formatHtml(directResult);
            } else {
              const imgUrls = getContentImageUrls(extracted, retryUrl.trim());
              if (imgUrls.length > 0) {
                setOcrStatus('연혁 이미지 OCR 분석 중…');
                try {
                  const HISTORY_PROMPT = `이 이미지는 학교 연혁(학교 역사) 페이지입니다. 연도별 내용을 아래 형식으로 추출하세요.\n\n2024년\n3. 1 제47회 입학식(신입생 273명)\n2. 9 제45회 졸업식(졸업생 293명)\n2023년\n3. 2 제46회 입학식\n\n규칙:\n- 연도는 반드시 단독 줄에 YYYY년 형식\n- 날짜는 월. 일 형식 (예: 3. 1)\n- 내용은 날짜 뒤에 한 칸 공백 후 작성\n- 설명 없이 데이터만 출력`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: HISTORY_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  if (ocrText.trim()) {
                    const paragraphs = ocrText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 1).map(l => `<p>${l}</p>`).join('\n');
                    html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                } finally {
                  setOcrStatus('');
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else if (isImageOnlyContent(extracted)) {
            const imgUrls = getContentImageUrls(extracted, retryUrl.trim());
            if (imgUrls.length > 0) {
              setOcrStatus('이미지 OCR 분석 중…');
              try {
                const ocrRes = await fetch('/api/ocr-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageUrl: imgUrls[0] }),
                });
                const ocrData = await ocrRes.json();
                const ocrText = ocrData.text || '';
                if (ocrText.trim()) {
                  const paragraphs = ocrText.split(/\n+/).map(l => l.trim()).filter(l => l.length > 3).map(l => `<p>${l}</p>`).join('\n');
                  html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                } else {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                }
              } catch {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              } finally {
                setOcrStatus('');
              }
            } else {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            }
          } else {
            html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
          }
        }
      } else if (result.category === 'footer') {
        // 푸터메뉴 재시도: 푸터 전용 마크업 규칙 적용
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: retryUrl.trim(), context: 'footer' }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw new Error(data.detail || '실패');
        html = applyTableProcessing(data.html || '');
      } else {
        // 기타 모드 재시도 (auto-markup)
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: retryUrl.trim(), selector: retrySelector.trim() }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw new Error(data.detail || '실패');
        html = applyTableProcessing(data.html || '');
      }

      onRetry({ url: retryUrl.trim(), selector: retrySelector.trim(), html, error: null });
    } catch (e) {
      onRetry({ url: retryUrl.trim(), selector: retrySelector.trim(), html: '', error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="crawl-retry-panel">
      {result.error && <p className="crawl-error">{result.error}</p>}
      <div className="crawl-retry-fields">
        <input
          type="url" className="crawl-input"
          value={retryUrl} onChange={e => setRetryUrl(e.target.value)}
          placeholder="URL"
          disabled={loading}
        />
        <input
          type="text" className="crawl-input crawl-input--selector"
          value={retrySelector} onChange={e => setRetrySelector(e.target.value)}
          placeholder="CSS 선택자 입력 (예: #content, .article-body)"
          onKeyDown={e => e.key === 'Enter' && !loading && handleRetry()}
          disabled={loading}
          autoFocus
        />
        <button className="crawl-btn crawl-btn--retry" onClick={handleRetry} disabled={loading}>
          {loading ? <><span className="crawl-spinner" />{ocrStatus || ''}</> : '재추출'}
        </button>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────────
export default function UrlCrawlMarkup() {
  const [batchRootUrl, setBatchRootUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [urlItems, setUrlItems] = useState([]); // { id, url, title, category, templateId, selector }
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [addUrlInput, setAddUrlInput] = useState('');
  const [addTitleInput, setAddTitleInput] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [ocrStatus, setOcrStatus] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const [classifying, setClassifying] = useState(false);
  const [classifyProgress, setClassifyProgress] = useState({ done: 0, total: 0 });
  const [urlCopied, setUrlCopied] = useState(false);
  const [siteName, setSiteName] = useState('');
  const [siteNameLocked, setSiteNameLocked] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const classifyAbortRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [typeModalItemId, setTypeModalItemId] = useState(null);
  const [showUrlExportModal, setShowUrlExportModal] = useState(false);
  const [modalCategory, setModalCategory] = useState('other');
  const [modalTemplateId, setModalTemplateId] = useState(null);

  // ─── 소스 직접 입력 모드 ────────────────────────────────────
  const [mode, setMode] = useState('url'); // 'url' | 'source'
  const [sourceHtml, setSourceHtml] = useState('');
  const [sourceSelector, setSourceSelector] = useState('');
  const [sourceCategory, setSourceCategory] = useState('other');
  const [sourceTemplateId, setSourceTemplateId] = useState(null);
  const [sourceResult, setSourceResult] = useState(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  // ─── URL 아이템 수정/삭제 ───────────────────────────────────
  function updateItem(id, field, value) {
    setUrlItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function updateItemCategory(id, category) {
    const templates = CATEGORY_TEMPLATES[category];
    const defaultTemplateId = templates?.[0]?.id ?? null;
    setUrlItems(prev => prev.map(item =>
      item.id === id ? { ...item, category, templateId: defaultTemplateId, selector: '' } : item
    ));
  }

  function removeItem(id) {
    setUrlItems(prev => prev.filter(item => item.id !== id));
  }

  function handleAddManualUrl() {
    const url = addUrlInput.trim();
    if (!url || !isValidUrl(url)) return;
    const newId = urlItems.length > 0 ? Math.max(...urlItems.map(i => i.id)) + 1 : 0;
    setUrlItems(prev => [...prev, {
      id: newId,
      url,
      title: addTitleInput.trim(),
      category: null,
      templateId: null,
      selector: '',
      checked: true,
      contentType: 'unknown',
    }]);
    setAddUrlInput('');
    setAddTitleInput('');
  }

  function closeAddUrlForm() {
    setShowAddUrl(false);
    setAddUrlInput('');
    setAddTitleInput('');
  }

  function openPreview(url) {
    setPreviewUrl(url);
    setPreviewOpen(true);
  }

  function closePreview() {
    setPreviewOpen(false);
  }

  function openTypeModal(item) {
    setTypeModalItemId(item.id);
    setModalCategory(item.category ?? 'other');
    setModalTemplateId(item.templateId);
  }

  function closeTypeModal() {
    setTypeModalItemId(null);
  }

  function handleModalCategorySelect(category) {
    const templates = CATEGORY_TEMPLATES[category];
    setModalCategory(category);
    setModalTemplateId(templates?.[0]?.id ?? null);
  }

  function applyTypeModal() {
    if (typeModalItemId === null) return;
    const templates = CATEGORY_TEMPLATES[modalCategory];
    const templateId = templates ? (modalTemplateId || templates[0]?.id || null) : null;
    setUrlItems(prev => prev.map(item =>
      item.id === typeModalItemId
        ? { ...item, category: modalCategory, templateId, selector: '' }
        : item
    ));
    setTypeModalItemId(null);
  }

  // ─── URL 추출 ─────────────────────────────────────────────
  async function handleExtractUrls() {
    if (!batchRootUrl.trim()) { setExtractError('URL을 입력해주세요.'); return; }
    if (!isValidUrl(batchRootUrl.trim())) { setExtractError('올바른 URL 형식이 아닙니다.'); return; }
    classifyAbortRef.current = true;
    setClassifying(false);
    setExtracting(true); setExtractError(''); setUrlItems([]); setSiteName(''); setSiteNameLocked(false);
    try {
      const res = await fetch('/api/extract-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: batchRootUrl.trim() }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) { setExtractError(data.detail || `서버 오류 (${res.status})`); return; }
      if (data.siteName) { setSiteName(data.siteName); setSiteNameLocked(true); }
      const newItems = data.items.map((item, i) => ({
        id: i,
        url: item.url,
        title: item.title || '',
        category: null,
        templateId: null,
        selector: '',
        checked: true,
        contentType: 'unknown',
      }));
      setUrlItems(newItems);
      classifyUrlItems(newItems);
    } catch (e) {
      setExtractError(`오류: ${e.message}`);
    } finally {
      setExtracting(false);
    }
  }

  // ─── URL 페이지 유형 분류 (이미지형 / 텍스트형) ───────────────
  async function classifyUrlItems(items) {
    classifyAbortRef.current = false;
    setClassifying(true);
    setClassifyProgress({ done: 0, total: items.length });
    const CONCURRENCY = 3;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      if (classifyAbortRef.current) break;
      const batch = items.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(async (item) => {
        try {
          const res = await fetch('/api/fetch-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: item.url }),
          });
          if (!res.ok) return { id: item.id, contentType: 'error' };
          const data = await res.json();
          const extracted = extractContent(data.html, '', item.url);
          return { id: item.id, contentType: hasContentImage(extracted) ? 'image' : 'text' };
        } catch {
          return { id: item.id, contentType: 'error' };
        }
      }));
      if (classifyAbortRef.current) break;
      setClassifyProgress({ done: Math.min(i + CONCURRENCY, items.length), total: items.length });
      setUrlItems(prev => {
        const map = Object.fromEntries(results.map(r => [r.id, r.contentType]));
        return prev.map(it => map[it.id] !== undefined ? { ...it, contentType: map[it.id] } : it);
      });
    }
    if (!classifyAbortRef.current) setClassifying(false);
  }

  function toggleAllChecked() {
    const allChecked = urlItems.every(item => item.checked);
    setUrlItems(prev => prev.map(item => ({ ...item, checked: !allChecked })));
  }

  function toggleAllRegularChecked() {
    setUrlItems(prev => {
      const regularOnes = prev.filter(i => i.contentType !== 'image');
      const allChecked = regularOnes.every(i => i.checked);
      return prev.map(item =>
        item.contentType !== 'image' ? { ...item, checked: !allChecked } : item
      );
    });
  }

  function toggleAllImageChecked() {
    setUrlItems(prev => {
      const imageOnes = prev.filter(i => i.contentType === 'image');
      const allChecked = imageOnes.every(i => i.checked);
      return prev.map(item =>
        item.contentType === 'image' ? { ...item, checked: !allChecked } : item
      );
    });
  }

  async function handleCopySelectedUrls() {
    const urls = urlItems.filter(i => i.checked && i.url).map(i => i.url);
    if (!urls.length) return;
    await navigator.clipboard.writeText(urls.join('\n'));
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  }

  // ─── 일괄 마크업 생성 ─────────────────────────────────────
  async function handleBatchGenerate() {
    const validItems = urlItems.filter(({ url, checked }) => checked && url && isValidUrl(url));
    if (validItems.length === 0) { setExtractError('유효한 URL이 없습니다.'); return; }
    setBatchLoading(true);
    setBatchResults([]);
    setBatchProgress({ done: 0, total: validItems.length });
    setActiveResultIdx(0);

    const results = [];
    for (let i = 0; i < validItems.length; i++) {
      const { url, title, category, templateId, selector: itemSelector } = validItems[i];
      const tpl = templateId ? ALL_TEMPLATES.find(t => t.id === templateId) : null;
      try {
        let html = '';

        if (tpl) {
          // 템플릿 모드: HTML 가져오기 → 콘텐츠 추출 → 템플릿 적용
          const res = await fetch('/api/fetch-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          let data = {};
          try { data = await res.json(); } catch {}
          if (!res.ok) throw new Error(data.error || '실패');
          const extracted = extractContent(data.html, itemSelector, url);

          if (tpl.category === '상징') {
            // 상징 템플릿: DOM에서 상징 아이템 파싱 가능 여부 먼저 확인
            const { parseSymbolSource } = await import('../../templates/symbol.js');
            const docForCheck = new DOMParser().parseFromString(extracted, 'text/html');
            const symbolItems = parseSymbolSource(docForCheck.body);

            if (symbolItems.length > 0) {
              // DOM에 파싱 가능한 아이템 있음 → 일반 매핑
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            } else {
              // 아이템 없음 → 서버사이드 Groq Vision OCR 시도
              const imgUrls = getContentImageUrls(extracted, url);
              if (imgUrls.length > 0) {
                setOcrStatus('이미지 OCR 분석 중…');
                try {
                  const SYMBOL_PROMPT = `이 이미지는 학교 상징 페이지입니다. 아래 형식으로 각 항목의 이름과 설명을 추출하세요.

교목 [이름]
[교목 설명 (있는 경우)]
교화 [이름]
[교화 설명 (있는 경우)]
교표
[교표 설명 (있는 경우)]
교기
[교기 설명 (있는 경우)]
교훈: [교훈 내용]
교가: 있음 (교가 악보가 보이는 경우)

규칙: 없는 항목은 완전히 생략하세요. "없음" 같은 값은 절대 쓰지 마세요.`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: SYMBOL_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  const { parseSymbolOcr, buildSyntheticSymbolHtml, findSongImageFromHtml, extractSongLyricsFromImage } = await import('../../utils/ocrSymbol.js');
                  const detectedSongUrl = findSongImageFromHtml(extracted, url)
                    || (imgUrls.length >= 2 ? imgUrls[imgUrls.length - 1] : '');
                  if (ocrText.trim()) {
                    const { items, sloganText, hasSong } = parseSymbolOcr(ocrText);
                    const songImgUrl = detectedSongUrl || (hasSong ? imgUrls[0] : '');
                    if (items.length > 0) {
                      const songLyrics = songImgUrl ? await extractSongLyricsFromImage(songImgUrl).catch(() => null) : null;
                      html = formatHtml(applyMarkupToTemplate(
                        buildSyntheticSymbolHtml(items, sloganText, songImgUrl, '', songLyrics),
                        tpl.code, tpl.id
                      ));
                    } else {
                      html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                    }
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                } finally {
                  setOcrStatus('');
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else if (tpl.category === '연혁') {
            // 연혁 템플릿: HTML에서 먼저 파싱 시도, 실패 시 이미지 OCR
            const directResult = applyMarkupToTemplate(extracted, tpl.code, tpl.id);
            if (directResult !== tpl.code) {
              html = formatHtml(directResult);
            } else {
              const imgUrls = getContentImageUrls(extracted, url);
              if (imgUrls.length > 0) {
                setOcrStatus('연혁 이미지 OCR 분석 중…');
                try {
                  const HISTORY_PROMPT = `이 이미지는 학교 연혁(학교 역사) 페이지입니다. 연도별 내용을 아래 형식으로 추출하세요.

2024년
3. 1 제47회 입학식(신입생 273명)
2. 9 제45회 졸업식(졸업생 293명)
2023년
3. 2 제46회 입학식

규칙:
- 연도는 반드시 단독 줄에 YYYY년 형식
- 날짜는 월. 일 형식 (예: 3. 1)
- 내용은 날짜 뒤에 한 칸 공백 후 작성
- 설명 없이 데이터만 출력`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: HISTORY_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  if (ocrText.trim()) {
                    const paragraphs = ocrText
                      .split(/\n+/)
                      .map(line => line.trim())
                      .filter(line => line.length > 1)
                      .map(line => `<p>${line}</p>`)
                      .join('\n');
                    html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                } finally {
                  setOcrStatus('');
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else if (isImageOnlyContent(extracted)) {
            // 인사말 등 일반 템플릿: 이미지 전용 콘텐츠 → Groq Vision OCR
            const imgUrls = getContentImageUrls(extracted, url);
            if (imgUrls.length > 0) {
              setOcrStatus('이미지 OCR 분석 중…');
              try {
                const ocrRes = await fetch('/api/ocr-image', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imageUrl: imgUrls[0] }),
                });
                const ocrData = await ocrRes.json();
                const ocrText = ocrData.text || '';
                if (ocrText.trim()) {
                  const paragraphs = ocrText
                    .split(/\n+/)
                    .map(line => line.trim())
                    .filter(line => line.length > 3)
                    .map(line => `<p>${line}</p>`)
                    .join('\n');
                  html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                } else {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                }
              } catch {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              } finally {
                setOcrStatus('');
              }
            } else {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            }
          } else {
            html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
          }
        } else if (category === 'footer') {
          // 푸터메뉴 모드: 푸터 전용 마크업 규칙(개인정보처리방침 등) 적용
          const res = await fetch('/api/auto-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, context: 'footer' }),
          });
          let data = {};
          try { data = await res.json(); } catch {}
          if (!res.ok) throw new Error(data.detail || '실패');
          html = applyTableProcessing(data.html || '');
        } else {
          // 기타 모드: auto-markup
          const res = await fetch('/api/auto-markup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, selector: '' }),
          });
          let data = {};
          try { data = await res.json(); } catch {}
          if (!res.ok) throw new Error(data.detail || '실패');
          html = applyTableProcessing(data.html || '');
        }

        results.push({ url, title, category, templateId, html, error: null });
      } catch (e) {
        results.push({ url, title, category, templateId, html: '', error: e.message });
      }
      setBatchProgress({ done: i + 1, total: validItems.length });
      setBatchResults([...results]);
    }
    setBatchLoading(false);
  }

  // ─── 마크업 ZIP 다운로드 ───────────────────────────────────
  async function handleDownloadZip() {
    const readyResults = batchResults.filter(r => r.html?.trim() && !r.error);
    if (readyResults.length === 0) return;
    setDownloading(true);
    try {
      const files = readyResults.map(r => ({
        name: r.title || new URL(r.url).pathname.split('/').filter(Boolean).pop() || '마크업',
        html: r.html,
      }));
      const hostname = new URL(batchRootUrl.trim()).hostname || '마크업';
      const zipName = siteName || hostname;
      const res = await fetch('/api/batch-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, siteName: zipName }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); alert(d.detail || '다운로드 실패'); return; }
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${zipName}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert(`다운로드 오류: ${e.message}`);
    } finally {
      setDownloading(false);
    }
  }

  function handleSourceCategoryChange(category) {
    const templates = CATEGORY_TEMPLATES[category];
    setSourceCategory(category);
    setSourceTemplateId(templates?.[0]?.id ?? null);
  }

  // ─── 소스 직접 입력 → 마크업 생성 (URL 배치 모드와 동일한 분기) ─
  async function handleSourceMarkup() {
    if (!sourceHtml.trim()) return;
    setSourceLoading(true);
    setSourceResult(null);
    try {
      const extracted = extractContent(sourceHtml.trim(), sourceSelector.trim(), '');
      let html = '';

      if (['greeting', 'history', 'symbol'].includes(sourceCategory) && sourceTemplateId) {
        const tpl = ALL_TEMPLATES.find(t => t.id === sourceTemplateId);
        if (tpl) {
          if (tpl.category === '상징') {
            const { parseSymbolSource } = await import('../../templates/symbol.js');
            const docForCheck = new DOMParser().parseFromString(extracted, 'text/html');
            const symbolItems = parseSymbolSource(docForCheck.body);
            if (symbolItems.length > 0) {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            } else {
              const imgUrls = getContentImageUrls(extracted, '');
              if (imgUrls.length > 0) {
                try {
                  const SYMBOL_PROMPT = `이 이미지는 학교 상징 페이지입니다. 교목, 교화, 교표, 교기, 교훈, 교가 항목의 이름과 설명을 추출하세요. 없는 항목은 생략하세요.`;
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0], prompt: SYMBOL_PROMPT }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  const { parseSymbolOcr, buildSyntheticSymbolHtml, findSongImageFromHtml, extractSongLyricsFromImage } = await import('../../utils/ocrSymbol.js');
                  const detectedSongUrl = findSongImageFromHtml(extracted, '');
                  if (ocrText.trim()) {
                    const { items, sloganText, hasSong } = parseSymbolOcr(ocrText);
                    const songImgUrl = detectedSongUrl || (hasSong ? imgUrls[0] : '');
                    if (items.length > 0) {
                      const songLyrics = songImgUrl ? await extractSongLyricsFromImage(songImgUrl).catch(() => null) : null;
                      html = formatHtml(applyMarkupToTemplate(
                        buildSyntheticSymbolHtml(items, sloganText, songImgUrl, '', songLyrics),
                        tpl.code, tpl.id
                      ));
                    } else {
                      html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                    }
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            }
          } else {
            // 인사말·연혁: 이미지 전용인지 확인 후 템플릿 적용
            if (isImageOnlyContent(extracted)) {
              const imgUrls = getContentImageUrls(extracted, '');
              if (imgUrls.length > 0) {
                try {
                  const ocrRes = await fetch('/api/ocr-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: imgUrls[0] }),
                  });
                  const ocrData = await ocrRes.json();
                  const ocrText = ocrData.text || '';
                  if (ocrText.trim()) {
                    const paragraphs = ocrText
                      .split(/\n+/)
                      .map(line => line.trim())
                      .filter(line => line.length > 3)
                      .map(line => `<p>${line}</p>`)
                      .join('\n');
                    html = formatHtml(applyMarkupToTemplate(`<div>${paragraphs}</div>`, tpl.code, tpl.id));
                  } else {
                    html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                  }
                } catch {
                  html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
                }
              } else {
                html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
              }
            } else {
              html = formatHtml(applyMarkupToTemplate(extracted, tpl.code, tpl.id));
            }
          }
        }
      } else if (sourceCategory === 'footer') {
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: extracted, context: 'footer' }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw new Error(data.detail || '실패');
        html = applyTableProcessing(data.html || '');
      } else {
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: extracted }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (!res.ok) throw new Error(data.detail || '마크업 변환 실패');
        html = applyTableProcessing(data.html || '');
      }

      setSourceResult(formatHtml(html));
    } catch (e) {
      setSourceResult(`<!-- 마크업 생성 중 오류: ${e.message} -->`);
    } finally {
      setSourceLoading(false);
    }
  }

  const imageItems = urlItems.filter(i => i.contentType === 'image');
  const regularItems = urlItems.filter(i => i.contentType !== 'image');

  function renderUrlItemRow(item, isLast) {
    return (
      <div key={item.id} className={`url-item-row${item.checked ? '' : ' url-item-row--unchecked'}`}>
        <input
          type="checkbox"
          className="url-item-check"
          checked={item.checked}
          onChange={e => updateItem(item.id, 'checked', e.target.checked)}
          disabled={batchLoading}
        />
        <button
          className="url-item-preview-btn"
          onClick={() => openPreview(item.url)}
          title="미리보기"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </button>
        <div className="url-item-info">
          <span className="url-item-title">{item.title || '—'}</span>
          <span className="url-item-url">{item.url}</span>
        </div>
        <button
          className={`url-item-type-btn${item.category !== null ? ' has-selection' : ''}`}
          onClick={() => openTypeModal(item)}
          disabled={batchLoading}
        >
          <span className="url-item-type-main">
            {{ greeting: '인사말', symbol: '상징', history: '연혁', footer: '푸터메뉴', other: '기타' }[item.category] || '마크업 유형 선택'}
          </span>
          {item.templateId && (
            <span className="url-item-type-sub">
              {ALL_TEMPLATES.find(t => t.id === item.templateId)?.label.replace(/^(인사말|연혁|상징)\s+/, '')}
            </span>
          )}
        </button>
        <button
          className="url-item-remove"
          onClick={() => removeItem(item.id)}
          disabled={batchLoading}
          title="제거"
        >✕</button>
      </div>
    );
  }

  function renderTypeModal() {
    return (
      <div className="url-type-modal" onClick={e => e.stopPropagation()}>
        <div className="url-type-modal-head">
          <span className="url-type-modal-title">마크업 유형 선택</span>
          <button className="url-type-modal-close" onClick={closeTypeModal}>✕</button>
        </div>
        <div className="url-type-modal-body">
          <div className="url-type-modal-cats">
            {[
              { value: 'greeting', label: '인사말' },
              { value: 'symbol', label: '상징' },
              { value: 'history', label: '연혁' },
              { value: 'footer', label: '푸터메뉴' },
              { value: 'other', label: '기타' },
            ].map(opt => (
              <button
                key={opt.value}
                className={`url-type-modal-cat${modalCategory === opt.value ? ' is-active' : ''}`}
                onClick={() => handleModalCategorySelect(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {modalCategory && CATEGORY_TEMPLATES[modalCategory] && (
            <div className="url-type-modal-tpls">
              {CATEGORY_TEMPLATES[modalCategory].map(tpl => (
                <button
                  key={tpl.id}
                  className={`url-type-modal-tpl-card${modalTemplateId === tpl.id ? ' is-active' : ''}`}
                  onClick={() => setModalTemplateId(tpl.id)}
                >
                  {tpl.label.replace(/^(인사말|연혁|상징)\s+/, '')}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="url-type-modal-footer">
          <button className="url-type-modal-cancel" onClick={closeTypeModal}>취소</button>
          <button className="url-type-modal-apply" onClick={applyTypeModal}>적용</button>
        </div>
      </div>
    );
  }

  return (
    <div className="crawl-page">
      <div className="crawl-page-inner">
        <h2 className="crawl-title">크롤링 마크업</h2>

        {/* ─── 모드 탭 ─── */}
        <div className="crawl-mode-tabs">
          <button
            className={`crawl-mode-tab ${mode === 'url' ? 'is-active' : ''}`}
            onClick={() => setMode('url')}
          >
            URL 크롤링
          </button>
          <button
            className={`crawl-mode-tab ${mode === 'source' ? 'is-active' : ''}`}
            onClick={() => setMode('source')}
          >
            소스 직접 입력
          </button>
        </div>

        {/* ─── URL 크롤링 모드 ─── */}
        {mode === 'url' && <>
        <p className="crawl-desc">URL을 입력하면 본문을 자동으로 크롤링하여 마크업을 생성합니다.</p>

        <PageHowTo title="복사하고자하는 학교의 URL을 붙여넣으면 본문을 자동 크롤링해 KLIC 스타일의 마크업을 즉시 생성합니다">
          <p>
            사이트 루트 URL을 입력하면 사이트맵을 찾아 여러 URL을 한 번에 처리하며, 탭(Tab)으로 구분해서 각 페이지에 맞는 마크업을 한꺼번에 생성합니다.
          </p>
        </PageHowTo>

        <div className="crawl-form">
            <div className="crawl-url-row">
              <input
                type="url" className="crawl-input"
                placeholder="사이트 루트 URL (예: https://example.com)"
                value={batchRootUrl} onChange={e => setBatchRootUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !extracting && handleExtractUrls()}
                disabled={extracting || batchLoading}
              />
              <button className="crawl-btn crawl-btn--extract" onClick={handleExtractUrls} disabled={extracting || batchLoading}>
                {extracting ? <span className="crawl-spinner" /> : 'URL 추출'}
              </button>
              {urlItems.length === 0 && !extracting && (
                <button
                  className="crawl-btn crawl-btn--add-url-standalone"
                  onClick={() => setShowAddUrl(true)}
                  disabled={batchLoading}
                >
                  + URL 직접 추가
                </button>
              )}
            </div>
            {extractError && <p className="crawl-error">{extractError}</p>}

            {(urlItems.length > 0 || showAddUrl) && (
              <>
                {urlItems.length > 0 && (
                <div className="crawl-batch-urls-header">
                  <div className="crawl-batch-urls-header-left">
                    {siteNameLocked
                      ? <span className="url-site-name-inline">{siteName}</span>
                      : <input
                          className="url-site-name-input"
                          type="text"
                          placeholder="학교명을 입력하세요."
                          value={siteName}
                          onChange={e => setSiteName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && siteName.trim()) setSiteNameLocked(true); }}
                        />
                    }
                  </div>
                  <div className="crawl-batch-urls-header-right">
                    {classifying && (
                      <span className="url-classify-inline">
                        <span className="crawl-spinner crawl-spinner--sm" />
                        {classifyProgress.done} / {classifyProgress.total} 분석 중
                      </span>
                    )}
                    <span className="crawl-result-label">
                      {urlItems.filter(i => i.checked).length} / {urlItems.length}개 선택
                    </span>
                    <button
                      className="crawl-btn crawl-btn--add-url"
                      onClick={() => showAddUrl ? closeAddUrlForm() : setShowAddUrl(true)}
                      disabled={batchLoading}
                    >
                      {showAddUrl ? '입력 닫기' : '+ URL 추가'}
                    </button>
                  </div>
                </div>
                )}
                <div className="url-sections-row">
                  {regularItems.length > 0 && (
                    <div className="url-section-col">
                      <div className="url-section-top">
                        <span className="url-text-section-title">텍스트형 페이지</span>
                        <span className="url-text-section-badge">{regularItems.length}</span>
                      </div>
                      <div className="url-text-section">
                        <div className="url-text-section-header">
                          <label className="crawl-check-all url-section-check-all">
                            <input
                              type="checkbox"
                              checked={regularItems.length > 0 && regularItems.every(i => i.checked)}
                              onChange={toggleAllRegularChecked}
                              disabled={batchLoading}
                            />
                            <span>전체 선택</span>
                          </label>
                        </div>
                        <div className="url-items-list">
                          {regularItems.map((item, i) => renderUrlItemRow(item, i >= regularItems.length - 3))}
                        </div>
                        {typeModalItemId !== null && regularItems.some(i => i.id === typeModalItemId) && (
                          <div className="url-type-modal-overlay" onClick={closeTypeModal}>
                            {renderTypeModal()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {imageItems.length > 0 && (
                    <div className="url-section-col">
                      <div className="url-section-top">
                        <span className="url-image-section-title">이미지형 페이지</span>
                        <span className="url-image-section-badge">{imageItems.length}</span>
                        <button
                          className="url-export-btn"
                          onClick={() => setShowUrlExportModal(true)}
                          title="URL 내보내기"
                        >URL 내보내기</button>
                      </div>
                      <div className="url-image-section">
                        <div className="url-image-section-header">
                          <label className="crawl-check-all url-section-check-all">
                            <input
                              type="checkbox"
                              checked={imageItems.length > 0 && imageItems.every(i => i.checked)}
                              onChange={toggleAllImageChecked}
                              disabled={batchLoading}
                            />
                            <span>전체 선택</span>
                          </label>
                        </div>
                        <div className="url-items-list">
                          {imageItems.map((item, i) => renderUrlItemRow(item, i >= imageItems.length - 3))}
                        </div>
                        {typeModalItemId !== null && imageItems.some(i => i.id === typeModalItemId) && (
                          <div className="url-type-modal-overlay" onClick={closeTypeModal}>
                            {renderTypeModal()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {showAddUrl && (
                  <div className="url-add-form">
                    <input
                      className="url-add-input url-add-input--url"
                      type="text"
                      placeholder="URL 입력 (https://...)"
                      value={addUrlInput}
                      onChange={e => setAddUrlInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddManualUrl(); }}
                      autoFocus
                    />
                    <input
                      className="url-add-input url-add-input--title"
                      type="text"
                      placeholder="페이지 제목 (선택)"
                      value={addTitleInput}
                      onChange={e => setAddTitleInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddManualUrl(); }}
                    />
                    <button
                      className="crawl-btn crawl-btn--extract"
                      onClick={handleAddManualUrl}
                      disabled={!addUrlInput.trim() || !isValidUrl(addUrlInput.trim())}
                    >
                      추가
                    </button>
                    <button
                      className="url-item-remove"
                      onClick={closeAddUrlForm}
                      title="닫기"
                    >✕</button>
                  </div>
                )}
                {urlItems.length > 0 && (
                <button
                  className="crawl-btn crawl-btn--batch"
                  onClick={handleBatchGenerate}
                  disabled={batchLoading || urlItems.every(i => !i.checked)}
                >
                  {batchLoading
                    ? <><span className="crawl-spinner" /> {ocrStatus || `${batchProgress.done} / ${batchProgress.total} 처리 중…`}</>
                    : `마크업 생성 (${urlItems.filter(i => i.checked).length}개)`}
                </button>
                )}
              </>
            )}
          </div>

        {/* ─── 일괄 결과 탭 ─── */}
        {batchResults.length > 0 && (
          <div className="crawl-batch-results">
            <div className="crawl-batch-tabs-row">
              <div className="crawl-batch-tabs">
              {batchResults.map((r, i) => (
                <button
                  key={i}
                  className={`crawl-batch-tab ${activeResultIdx === i ? 'is-active' : ''} ${r.error ? 'is-error' : ''}`}
                  onClick={() => setActiveResultIdx(i)}
                  title={r.url}
                >
                  {shortLabel(r.url, r.title)}
                  {batchLoading && i === batchProgress.done - 1 && !r.error && (
                    <span className="crawl-tab-badge">✓</span>
                  )}
                  {r.error && <span className="crawl-tab-badge crawl-tab-badge--error">!</span>}
                </button>
              ))}
              </div>
              {!batchLoading && batchResults.some(r => r.html?.trim() && !r.error) && (
                <button
                  className="crawl-btn crawl-btn--download"
                  onClick={handleDownloadZip}
                  disabled={downloading}
                  title="생성된 마크업을 ZIP으로 다운로드"
                >
                  {downloading ? <span className="crawl-spinner" /> : '다운로드'}
                </button>
              )}
            </div>
            {batchResults[activeResultIdx] && (
              (batchResults[activeResultIdx].error || !batchResults[activeResultIdx].html?.trim()) ? (
                <BatchRetryPanel
                  result={batchResults[activeResultIdx]}
                  onRetry={updated => {
                    const next = [...batchResults];
                    next[activeResultIdx] = { ...next[activeResultIdx], ...updated };
                    setBatchResults(next);
                  }}
                />
              ) : (
                <ResultViewer
                  markup={batchResults[activeResultIdx].html}
                  templateId={batchResults[activeResultIdx].templateId}
                  onMarkupChange={html => {
                    const next = [...batchResults];
                    next[activeResultIdx] = { ...next[activeResultIdx], html };
                    setBatchResults(next);
                  }}
                />
              )
            )}
          </div>
        )}
        </>}

        {/* ─── 소스 직접 입력 모드 ─── */}
        {mode === 'source' && (
          <div className="crawl-source-mode">
            <p className="crawl-desc">
              CMS·JavaScript로 동적 로딩되어 크롤링이 안 되는 요소도 아래 방법으로 캡처할 수 있습니다.
            </p>
            <div className="crawl-source-guide">
              <div className="crawl-source-guide-item">
                <strong>방법 1 — 페이지 소스 보기 (서버 렌더링 데이터)</strong>
                <span>브라우저에서 <kbd>Ctrl+U</kbd> → 전체 선택 (<kbd>Ctrl+A</kbd>) → 복사 (<kbd>Ctrl+C</kbd>)</span>
              </div>
              <div className="crawl-source-guide-item">
                <strong>방법 2 — 렌더링된 DOM 복사 (JS 동적 데이터 포함)</strong>
                <span><kbd>F12</kbd> → Elements 탭 → <code>&lt;html&gt;</code> 우클릭 → Copy → Copy outerHTML</span>
              </div>
            </div>
            <textarea
              className="crawl-textarea crawl-textarea--source"
              placeholder="복사한 HTML 소스를 여기에 붙여넣으세요..."
              value={sourceHtml}
              onChange={e => setSourceHtml(e.target.value)}
              spellCheck={false}
            />
            <div className="crawl-source-options">
              <div className="crawl-selector-row">
                <input
                  type="text"
                  className="crawl-input crawl-input--selector"
                  placeholder="CSS 선택자 (선택사항, 예: #content, .sub-content)"
                  value={sourceSelector}
                  onChange={e => setSourceSelector(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !sourceLoading && sourceHtml.trim() && handleSourceMarkup()}
                  disabled={sourceLoading}
                />
                <select
                  className="url-item-select"
                  value={sourceCategory}
                  onChange={e => handleSourceCategoryChange(e.target.value)}
                  disabled={sourceLoading}
                >
                  <option value="greeting">인사말</option>
                  <option value="symbol">상징</option>
                  <option value="history">연혁</option>
                  <option value="footer">푸터메뉴</option>
                  <option value="other">기타</option>
                </select>
                <button
                  className="crawl-btn"
                  onClick={handleSourceMarkup}
                  disabled={!sourceHtml.trim() || sourceLoading}
                >
                  {sourceLoading ? <span className="crawl-spinner" /> : '마크업 생성'}
                </button>
              </div>
              {sourceCategory !== 'other' && sourceCategory !== 'footer' && CATEGORY_TEMPLATES[sourceCategory] && (
                <div className="url-item-type-group">
                  {CATEGORY_TEMPLATES[sourceCategory].map(tpl => (
                    <label key={tpl.id} className="url-item-type-label">
                      <input
                        type="radio"
                        name="source-template"
                        value={tpl.id}
                        checked={sourceTemplateId === tpl.id}
                        onChange={() => setSourceTemplateId(tpl.id)}
                        disabled={sourceLoading}
                      />
                      {tpl.label.replace(/^(인사말|연혁|상징)\s+/, '')}
                    </label>
                  ))}
                </div>
              )}
            </div>
            {sourceResult && (
              <>
                <div className="source-result-actions">
                  <button
                    className="crawl-btn crawl-btn--download"
                    onClick={() => {
                      const categoryLabel = { greeting: '인사말', symbol: '상징', history: '연혁', footer: '푸터메뉴', other: '마크업' }[sourceCategory] || '마크업';
                      const fullHtml = `<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${categoryLabel}</title>\n</head>\n<body>\n${sourceResult}\n</body>\n</html>`;
                      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(blob);
                      a.download = `${categoryLabel}.html`;
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }}
                  >
                    다운로드
                  </button>
                </div>
                <ResultViewer
                  markup={sourceResult}
                  onMarkupChange={html => setSourceResult(html)}
                  templateId={null}
                />
              </>
            )}
          </div>
        )}
      </div>
      {showUrlExportModal && (
        <div className="url-export-modal-overlay" onClick={() => setShowUrlExportModal(false)}>
          <div className="url-export-modal" onClick={e => e.stopPropagation()}>
            <div className="url-export-modal-header">
              <span className="url-export-modal-title">이미지형 페이지 URL 목록</span>
              <button className="url-export-modal-close" onClick={() => setShowUrlExportModal(false)}>✕</button>
            </div>
            <div className="url-export-modal-body">
              <table className="url-export-table">
                <thead>
                  <tr>
                    <th>페이지명</th>
                    <th>URL</th>
                  </tr>
                </thead>
                <tbody>
                  {imageItems.map(item => (
                    <tr key={item.id}>
                      <td className="url-export-table-title">{item.title || '(제목 없음)'}</td>
                      <td className="url-export-table-url">{item.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="url-export-modal-footer">
              <button
                className="crawl-btn crawl-btn--primary url-export-copy-btn"
                onClick={e => {
                  const btn = e.currentTarget;
                  const text = imageItems.map(item => `${item.title || '(제목 없음)'}\t${item.url}`).join('\n');
                  navigator.clipboard.writeText(text).then(() => {
                    btn.textContent = '복사됨 ✓';
                    setTimeout(() => { btn.textContent = '복사하기'; }, 2000);
                  });
                }}
              >복사하기</button>
            </div>
          </div>
        </div>
      )}
      {previewOpen && <div className="url-preview-overlay" onClick={closePreview} />}
      <div className={`url-preview-panel${previewOpen ? ' is-open' : ''}`}>
        <div className="url-preview-panel-header">
          <span className="url-preview-panel-url">{previewUrl}</span>
          <button className="url-preview-panel-close" onClick={closePreview}>✕</button>
        </div>
        <iframe
          className="url-preview-panel-iframe"
          src={previewUrl || 'about:blank'}
          title="페이지 미리보기"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    </div>
  );
}
