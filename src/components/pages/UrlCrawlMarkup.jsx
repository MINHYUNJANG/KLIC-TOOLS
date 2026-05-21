import { useState, useRef, useEffect } from 'react';
import PageHowTo from '../PageHowTo';
import { formatHtml } from '../../utils/formatHtml';
import { isImageOnlyContent, getContentImageUrls } from '../../utils/ocrSymbol';
import greeting from '../../templates/greeting';
import history from '../../templates/history';
import symbol from '../../templates/symbol';

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
    '#subContent',
    '#sub_container',
    'main',
    '#content',
    '#contents',
    '.contents',
    '#container',
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

  async function handleRetry() {
    if (!retryUrl.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auto-markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: retryUrl.trim(), selector: retrySelector.trim() }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        onRetry({ url: retryUrl.trim(), selector: retrySelector.trim(), html: '', error: data.detail || '실패' });
      } else {
        onRetry({ url: retryUrl.trim(), selector: retrySelector.trim(), html: data.html || '', error: null });
      }
    } catch (e) {
      onRetry({ url: retryUrl.trim(), selector: retrySelector.trim(), html: '', error: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="crawl-retry-panel">
      <p className="crawl-error">{result.error}</p>
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
          placeholder="CSS 셀렉터 입력 (예: #content, .article-body)"
          onKeyDown={e => e.key === 'Enter' && !loading && handleRetry()}
          disabled={loading}
          autoFocus
        />
        <button className="crawl-btn crawl-btn--retry" onClick={handleRetry} disabled={loading}>
          {loading ? <span className="crawl-spinner" /> : '재추출'}
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
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [ocrStatus, setOcrStatus] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [activeResultIdx, setActiveResultIdx] = useState(0);

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

  // ─── URL 추출 ─────────────────────────────────────────────
  async function handleExtractUrls() {
    if (!batchRootUrl.trim()) { setExtractError('URL을 입력해주세요.'); return; }
    if (!isValidUrl(batchRootUrl.trim())) { setExtractError('올바른 URL 형식이 아닙니다.'); return; }
    setExtracting(true); setExtractError(''); setUrlItems([]);
    try {
      const res = await fetch('/api/extract-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: batchRootUrl.trim() }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) { setExtractError(data.detail || `서버 오류 (${res.status})`); return; }
      setUrlItems(data.items.map((item, i) => ({
        id: i,
        url: item.url,
        title: item.title || '',
        category: 'other',
        templateId: null,
        selector: '',
        checked: true,
      })));
    } catch (e) {
      setExtractError(`오류: ${e.message}`);
    } finally {
      setExtracting(false);
    }
  }

  function toggleAllChecked() {
    const allChecked = urlItems.every(item => item.checked);
    setUrlItems(prev => prev.map(item => ({ ...item, checked: !allChecked })));
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

          // 이미지 전용 콘텐츠 + 상징 템플릿 → OCR 자동 시도
          if (tpl.category === '상징' && isImageOnlyContent(extracted)) {
            const imgUrls = getContentImageUrls(extracted, url);
            if (imgUrls.length > 0) {
              setOcrStatus('이미지 OCR 분석 중…');
              try {
                const { ocrImageUrl, parseSymbolOcr, buildSyntheticSymbolHtml } = await import('../../utils/ocrSymbol.js');
                const ocrText = await ocrImageUrl(imgUrls[0]);
                const { items, sloganText } = parseSymbolOcr(ocrText);
                if (items.length > 0) {
                  const syntheticHtml = buildSyntheticSymbolHtml(items, sloganText);
                  html = formatHtml(applyMarkupToTemplate(syntheticHtml, tpl.code, tpl.id));
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
          html = data.html || '';
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

  return (
    <div className="crawl-page">
      <div className="crawl-page-inner">
        <h2 className="crawl-title">URL 크롤링 마크업</h2>
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
            </div>
            {extractError && <p className="crawl-error">{extractError}</p>}

            {urlItems.length > 0 && (
              <>
                <div className="crawl-batch-urls-header">
                  <label className="crawl-check-all">
                    <input
                      type="checkbox"
                      checked={urlItems.every(item => item.checked)}
                      onChange={toggleAllChecked}
                      disabled={batchLoading}
                    />
                    <span>전체 선택</span>
                  </label>
                  <span className="crawl-result-label">
                    {urlItems.filter(i => i.checked).length} / {urlItems.length}개 선택
                  </span>
                </div>
                <div className="url-items-list">
                  {urlItems.map(item => (
                    <div key={item.id} className={`url-item-row${item.checked ? '' : ' url-item-row--unchecked'}`}>
                      <input
                        type="checkbox"
                        className="url-item-check"
                        checked={item.checked}
                        onChange={e => updateItem(item.id, 'checked', e.target.checked)}
                        disabled={batchLoading}
                      />
                      <div className="url-item-info">
                        <span className="url-item-title">{item.title || '—'}</span>
                        <span className="url-item-url">{item.url}</span>
                      </div>
                      <select
                        className="url-item-select"
                        value={item.category}
                        onChange={e => updateItemCategory(item.id, e.target.value)}
                        disabled={batchLoading}
                      >
                        <option value="greeting">인사말</option>
                        <option value="symbol">상징</option>
                        <option value="history">연혁</option>
                        <option value="other">기타</option>
                      </select>
                      {item.category !== 'other' && CATEGORY_TEMPLATES[item.category] && (
                        <>
                          <div className="url-item-type-group">
                            {CATEGORY_TEMPLATES[item.category].map(tpl => (
                              <label key={tpl.id} className="url-item-type-label">
                                <input
                                  type="radio"
                                  name={`type-${item.id}`}
                                  value={tpl.id}
                                  checked={item.templateId === tpl.id}
                                  onChange={() => updateItem(item.id, 'templateId', tpl.id)}
                                  disabled={batchLoading}
                                />
                                {tpl.label.replace(/^(인사말|연혁|상징)\s+/, '')}
                              </label>
                            ))}
                          </div>
                          <input
                            type="text"
                            className="crawl-input url-item-selector"
                            placeholder="CSS 선택자 (예: #subContent)"
                            value={item.selector}
                            onChange={e => updateItem(item.id, 'selector', e.target.value)}
                            disabled={batchLoading}
                          />
                        </>
                      )}
                      <button
                        className="url-item-remove"
                        onClick={() => removeItem(item.id)}
                        disabled={batchLoading}
                        title="제거"
                      >✕</button>
                    </div>
                  ))}
                </div>
                <button
                  className="crawl-btn crawl-btn--batch"
                  onClick={handleBatchGenerate}
                  disabled={batchLoading || urlItems.every(i => !i.checked)}
                >
                  {batchLoading
                    ? <><span className="crawl-spinner" /> {ocrStatus || `${batchProgress.done} / ${batchProgress.total} 처리 중…`}</>
                    : `마크업 생성 (${urlItems.filter(i => i.checked).length}개)`}
                </button>
              </>
            )}
          </div>

        {/* ─── 일괄 결과 탭 ─── */}
        {batchResults.length > 0 && (
          <div className="crawl-batch-results">
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
            {batchResults[activeResultIdx] && (
              batchResults[activeResultIdx].error ? (
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
      </div>
    </div>
  );
}
