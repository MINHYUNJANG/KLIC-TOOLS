import { useState, useRef, useEffect, useCallback } from 'react';
import { formatHtml } from '../../utils/formatHtml';
import PageHowTo from '../PageHowTo';
import greeting from '../../templates/greeting';
import history from '../../templates/history';
import principal from '../../templates/principal';
import symbol from '../../templates/symbol';

const TEMPLATES = [...greeting, ...history, ...principal, ...symbol];
const CATEGORIES = [...new Set(TEMPLATES.map(t => t.category))];

function parseInput(text) {
  return text.split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) return { name: parts[0].trim(), url: parts[1].trim() };
      const urlMatch = line.match(/https?:\/\/\S+/);
      if (urlMatch) return { name: urlMatch[0], url: urlMatch[0] };
      return null;
    })
    .filter(Boolean);
}

function extractContent(html, selector = '') {
  let doc;
  if (selector.trim()) {
    doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
    const matched = Array.from(doc.querySelectorAll(selector.trim()));
    if (matched.length > 0) {
      matched.forEach(el => {
        el.querySelectorAll('*').forEach(child => {
          ['style', 'onclick', 'onload', 'onerror'].forEach(attr => child.removeAttribute(attr));
        });
      });
      return formatHtml(matched.map(el => el.outerHTML).join('\n'));
    }
  }
  const match = html.match(/<!--\s*contents\s*-->([\s\S]*?)<!--[^>]*contents[^>]*-->/i);
  const sourceHtml = match ? match[1].trim() : html;
  doc = new DOMParser().parseFromString(sourceHtml, 'text/html');
  doc.querySelectorAll('script, style, noscript, iframe, svg').forEach(el => el.remove());
  const target = doc.querySelector('.greeting') || doc.getElementById('subContent') || doc.body;
  target.querySelectorAll('*').forEach(el => {
    ['style', 'onclick', 'onload', 'onerror'].forEach(attr => el.removeAttribute(attr));
  });
  return formatHtml(target.innerHTML);
}

function applyMarkupToTemplate(sourceMarkup, templateCode, templateId) {
  const template = TEMPLATES.find(t => t.id === templateId);
  if (template?.applyMapping) return template.applyMapping(sourceMarkup, templateCode);
  return templateCode;
}


async function readApiJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const trimmed = text.trim();
    const isHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<');
    throw new Error(isHtml
      ? 'API 서버 대신 HTML 페이지가 응답했습니다. 서버 실행 상태와 /api 프록시 설정을 확인해주세요.'
      : 'API 응답을 JSON으로 읽을 수 없습니다.');
  }
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


function resizeIframe(iframe) {
  if (!iframe?.contentDocument?.body) return;
  iframe.style.height = '0';
  iframe.style.height = iframe.contentDocument.body.scrollHeight + 'px';
}

// ─── 템플릿 미리보기 (선택 시 즉시 표시) ─────────────────────
function TemplatePreview({ template }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!iframeRef.current || !template) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(buildIframeDoc(template.code, template.previewStyle || ''));
    doc.close();
    if (template.previewHeight) {
      iframe.style.height = template.previewHeight + 'px';
    } else {
      iframe.onload = () => resizeIframe(iframe);
      setTimeout(() => resizeIframe(iframe), 300);
      setTimeout(() => resizeIframe(iframe), 1000);
    }
    return () => { iframe.onload = null; };
  }, [template]);

  if (!template) return null;

  return (
    <div className="bm-tpl-preview-box">
      <p className="bm-tpl-preview-box-label">{template.label} 미리보기</p>
      <iframe ref={iframeRef} className="bm-tpl-preview-frame" title="템플릿 미리보기" sandbox="allow-same-origin allow-scripts" />
    </div>
  );
}

// ─── 결과 아이템 ──────────────────────────────────────────────
function ResultItem({ item, index, onCopy, copiedKey }) {
  const [view, setView] = useState('preview');
  const iframeRef = useRef(null);

  useEffect(() => {
    if (view !== 'preview' || !iframeRef.current || !item.result) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument;
    const tpl = TEMPLATES.find(t => t.id === item.templateId);
    doc.open();
    doc.write(buildIframeDoc(item.result, tpl?.previewStyle || ''));
    doc.close();
    if (tpl?.previewHeight) {
      iframe.style.height = tpl.previewHeight + 'px';
    } else {
      iframe.onload = () => resizeIframe(iframe);
      setTimeout(() => resizeIframe(iframe), 300);
      setTimeout(() => resizeIframe(iframe), 1000);
    }
    return () => { iframe.onload = null; };
  }, [view, item.result, item.templateId]);

  return (
    <div className={`bm-item bm-item--${item.status}`}>
      <div className="bm-item-header">
        <div className="bm-item-meta">
          <span className="bm-item-name">{item.name}</span>
          <span className="bm-item-url">{item.url}</span>
        </div>
        <div className="bm-item-actions">
          {item.status === 'pending'  && <span className="bm-badge">대기</span>}
          {item.status === 'loading'  && <span className="bm-badge bm-badge--loading">처리 중…</span>}
          {item.status === 'error'    && <span className="bm-badge bm-badge--error" title={item.error}>실패</span>}
          {item.status === 'done' && item.result && (
            <>
              <button
                className={`bm-view-btn ${view === 'markup' ? 'is-active' : ''}`}
                onClick={() => setView(view === 'markup' ? 'preview' : 'markup')}
              >
                {view === 'markup' ? '미리보기' : '마크업'}
              </button>
              <button className="crawl-copy-btn" onClick={() => onCopy(item.result, index)}>
                {copiedKey === index ? '복사됨 ✓' : '복사'}
              </button>
            </>
          )}
        </div>
      </div>

      {item.status === 'error' && (
        <p className="crawl-error" style={{ margin: 0, borderRadius: 0, border: 'none', borderTop: '1px solid #f5c0c0' }}>
          {item.error}
        </p>
      )}

      {item.status === 'done' && item.result && (
        <div className="bm-item-body">
          {view === 'preview'
            ? <iframe ref={iframeRef} className="bm-item-frame" title="미리보기" sandbox="allow-same-origin allow-scripts" />
            : <textarea className="crawl-textarea bm-item-code" value={item.result} readOnly spellCheck={false} aria-label="적용된 마크업 소스" />
          }
        </div>
      )}
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────
export default function BatchMarkupPage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [activeTemplate, setActiveTemplate] = useState(TEMPLATES[0]);

  const [input, setInput] = useState('');
  const [selector, setSelector] = useState('');
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [copiedKey, setCopiedKey] = useState(null);
  const abortRef = useRef(false);

  const tabsInCategory = TEMPLATES.filter(t => t.category === activeCategory);

  function handleCategorySelect(cat) {
    setActiveCategory(cat);
    setActiveTemplate(TEMPLATES.find(t => t.category === cat));
  }

  const updateItem = useCallback((i, patch) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, ...patch } : item));
  }, []);

  useEffect(() => {
    if (!activeTemplate) return;
    setItems(prev => prev.map(item => {
      if (item.status !== 'done' || !item.extracted) return item;
      return { ...item, result: applyMarkupToTemplate(item.extracted, activeTemplate.code, activeTemplate.id), templateId: activeTemplate.id };
    }));
  }, [activeTemplate]);

  async function handleStart() {
    const parsed = parseInput(input);
    if (parsed.length === 0) return;
    const tplCode = activeTemplate?.code || '';
    setItems(parsed.map(item => ({ ...item, status: 'pending', result: '', extracted: '', error: '', templateId: activeTemplate?.id || '' })));
    setRunning(true);
    abortRef.current = false;
    setProgress({ done: 0, total: parsed.length });

    for (let i = 0; i < parsed.length; i++) {
      if (abortRef.current) break;
      updateItem(i, { status: 'loading' });
      try {
        const res = await fetch('/api/fetch-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: parsed[i].url }),
        });
        const data = await readApiJson(res);
        if (!res.ok) throw new Error(data.error);
        const extracted = extractContent(data.html, selector);
        const result = tplCode ? applyMarkupToTemplate(extracted, tplCode, activeTemplate?.id) : extracted;
        updateItem(i, { status: 'done', result, extracted, templateId: activeTemplate?.id || '' });
      } catch (err) {
        updateItem(i, { status: 'error', error: err.message });
      }
      setProgress({ done: i + 1, total: parsed.length });
    }
    setRunning(false);
  }

  function handleCopy(text, key) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  function handleCopyAll() {
    const text = items.filter(i => i.result).map(i => `<!-- ${i.name} -->\n${i.result}`).join('\n\n');
    navigator.clipboard.writeText(text);
  }

  const doneCount = items.filter(i => i.status === 'done').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  return (
    <div className="bm-page">

      {/* ─── 상단 타이틀 ─── */}
      <div className="bm-header">
        <h2 className="crawl-title">콘텐츠 일괄 마크업</h2>
        <p className="crawl-desc">
          URL을 붙여넣으면 선택한 템플릿에 내용을 자동으로 적용합니다.
        </p>
        <PageHowTo title="URL을 입력하고 템플릿을 선택하면 콘텐츠 마크업을 자동 적용합니다" style={{ marginBottom: 0 }}>
          <p>
            왼쪽에서 카테고리와 템플릿을 선택한 뒤, 오른쪽 입력창에 URL을 붙여넣고 마크업 적용을 시작하면 바로 적용되는 화면을 확인할 수 있습니다.<br />
            적용된 화면에서 마크업을 바로 확인 및 수정할 수 있고 복사도 가능합니다.
          </p>
        </PageHowTo>
      </div>

      {/* ─── 하단 2단 ─── */}
      <div className="bm-body">

        {/* 왼쪽: 템플릿 선택 사이드바 */}
        <aside className="bm-sidebar">
          <div className="bm-sidebar-section">
            <p className="bm-sidebar-label">카테고리</p>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`bm-cat-btn ${activeCategory === cat ? 'is-active' : ''}`}
                onClick={() => handleCategorySelect(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="bm-sidebar-section">
            <p className="bm-sidebar-label">타입</p>
            {tabsInCategory.map(tpl => (
              <button
                key={tpl.id}
                className={`bm-type-btn ${activeTemplate?.id === tpl.id ? 'is-active' : ''}`}
                onClick={() => setActiveTemplate(tpl)}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </aside>

        {/* 오른쪽: 입력 + 미리보기 */}
        <div className="bm-main">
          {/* 위: URL + 선택자 + 버튼 */}
          <div className="bm-form">
            <textarea
              className="bm-url-textarea"
              placeholder={'URL을 입력해주세요.'}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={running}
            />
            <div className="crawl-url-row">
              <input
                className="crawl-input crawl-input--selector"
                type="text"
                placeholder="CSS 선택자를 입력해주세요. (예: #subContent  /  .greeting)"
                value={selector}
                onChange={e => setSelector(e.target.value)}
                disabled={running}
              />
              {!running ? (
                <button
                  className="crawl-btn"
                  onClick={handleStart}
                  disabled={!input.trim() || !activeTemplate}
                >
                  일괄 적용 시작
                </button>
              ) : (
                <button className="crawl-btn bm-btn--stop" onClick={() => { abortRef.current = true; }}>
                  중단
                </button>
              )}
              {doneCount > 0 && !running && (
                <button className="crawl-btn bm-btn--copy-all" onClick={handleCopyAll}>전체 복사</button>
              )}
            </div>

            {items.length > 0 && (
              <div className="bm-progress">
                <span className="bm-progress-text">{progress.done} / {progress.total}</span>
                {doneCount > 0 && <span className="bm-stat bm-stat--done">{doneCount}개 완료</span>}
                {errorCount > 0 && <span className="bm-stat bm-stat--error">{errorCount}개 실패</span>}
              </div>
            )}
          </div>

          {/* 아래: 세로로 footer까지 채우는 미리보기 영역 */}
          <div className="bm-preview-area">
            {items.length === 0
              ? <TemplatePreview template={activeTemplate} />
              : items.map((item, i) => (
                  <ResultItem key={i} item={item} index={i} onCopy={handleCopy} copiedKey={copiedKey} />
                ))
            }
          </div>
        </div>

      </div>
    </div>
  );
}
