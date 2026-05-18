import { useState, useRef, useEffect } from 'react';
import PageHowTo from '../PageHowTo';

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

function parseUrlLine(line) {
  const tab = line.indexOf('\t');
  if (tab !== -1) return { url: line.slice(0, tab).trim(), title: line.slice(tab + 1).trim() };
  return { url: line.trim(), title: '' };
}

function shortLabel(url, title) {
  if (title) return title.length > 20 ? title.slice(0, 20) + '…' : title;
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\/$/, '').split('/').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : u.hostname;
  } catch { return url; }
}

// ─── 단일 결과 뷰어 ──────────────────────────────────────────
function ResultViewer({ markup, onMarkupChange }) {
  const [tab, setTab] = useState('code');
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    if (tab === 'preview' && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      doc.open();
      doc.write(`<!DOCTYPE html>
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
<body style="padding: 1.5rem 2.5rem;">
${markup}
</body>
</html>`);
      doc.close();
    }
  }, [tab, markup]);

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
  // 단일 모드
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [markup, setMarkup] = useState('');

  // 일괄 모드
  const [batchMode, setBatchMode] = useState(false);
  const [batchRootUrl, setBatchRootUrl] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const [extractedUrls, setExtractedUrls] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [batchResults, setBatchResults] = useState([]); // [{url, html, error}]
  const [activeResultIdx, setActiveResultIdx] = useState(0);

  // ─── 단일 마크업 생성 ──────────────────────────────────────
  async function handleGenerate(selectorOverride) {
    const sel = selectorOverride ?? selector;
    if (!url.trim()) { setError('URL을 입력해주세요.'); return; }
    if (!isValidUrl(url.trim())) { setError('올바른 URL 형식이 아닙니다.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auto-markup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), selector: sel }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        const msg = data.detail || `서버 오류 (${res.status})`;
        setError(msg);
        if (msg.includes('셀렉터') || msg.includes('자동으로 감지')) setShowSelector(true);
        return;
      }
      if (!data.html) { setError('마크업 결과가 비어있습니다.'); return; }
      setMarkup(data.html); setShowSelector(false);
    } catch (e) {
      setError(`오류가 발생했습니다: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  // ─── URL 추출 ─────────────────────────────────────────────
  async function handleExtractUrls() {
    if (!batchRootUrl.trim()) { setExtractError('URL을 입력해주세요.'); return; }
    if (!isValidUrl(batchRootUrl.trim())) { setExtractError('올바른 URL 형식이 아닙니다.'); return; }
    setExtracting(true); setExtractError(''); setExtractedUrls('');
    try {
      const res = await fetch('/api/extract-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: batchRootUrl.trim() }),
      });
      let data = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) { setExtractError(data.detail || `서버 오류 (${res.status})`); return; }
      const infoPages = data.items.filter(({ url }) => /\/sub\/info\.do(\?|$)/.test(url));
      setExtractedUrls(infoPages.map(({ url, title }) => title ? `${url}\t${title}` : url).join('\n'));
    } catch (e) {
      setExtractError(`오류: ${e.message}`);
    } finally {
      setExtracting(false);
    }
  }

  // ─── 일괄 마크업 생성 ─────────────────────────────────────
  async function handleBatchGenerate() {
    const lines = extractedUrls.split('\n').map(parseUrlLine).filter(({ url }) => url && isValidUrl(url));
    if (lines.length === 0) { setExtractError('유효한 URL이 없습니다.'); return; }
    setBatchLoading(true);
    setBatchResults([]);
    setBatchProgress({ done: 0, total: lines.length });
    setActiveResultIdx(0);

    const results = [];
    for (let i = 0; i < lines.length; i++) {
      const { url, title } = lines[i];
      try {
        const res = await fetch('/api/auto-markup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, selector: '' }),
        });
        let data = {};
        try { data = await res.json(); } catch {}
        results.push({ url, title, html: data.html || '', error: res.ok ? null : (data.detail || '실패') });
      } catch (e) {
        results.push({ url, title, html: '', error: e.message });
      }
      setBatchProgress({ done: i + 1, total: lines.length });
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
            default는 단일 모드로 단일모드에서는 복사할 학교의 URL을 붙여넣으면 결과를 바로 확인하고 수정할 수 있습니다.<br />
            일괄 URL을 체크하면 해당 URL의 사이트맵을 찾아 여러 URL을 한 번에 처리하며, 탭(Tab)으로 구분해서 각 페이지에 맞는 마크업을 한꺼번에 생성합니다.
          </p>
        </PageHowTo>

        {/* 일괄 모드 토글 */}
        <label className="crawl-batch-toggle">
          <input type="checkbox" checked={batchMode} onChange={e => setBatchMode(e.target.checked)} />
          <span>일괄 URL 입력</span>
        </label>

        {/* ─── 단일 모드 ─── */}
        {!batchMode && (
          <div className="crawl-form">
            <div className="crawl-url-row">
              <input
                type="url" className="crawl-input"
                placeholder="https://example.com/page"
                value={url} onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
                disabled={loading}
              />
              <button className="crawl-btn" onClick={() => handleGenerate()} disabled={loading}>
                {loading ? <span className="crawl-spinner" /> : '마크업 생성'}
              </button>
            </div>
            {showSelector && (
              <div className="crawl-selector-row">
                <input
                  type="text" className="crawl-input crawl-input--selector"
                  placeholder="CSS 셀렉터 입력 (예: #content, .article-body)"
                  value={selector} onChange={e => setSelector(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate(selector)}
                  disabled={loading} autoFocus
                />
                <button className="crawl-btn crawl-btn--retry" onClick={() => handleGenerate(selector)} disabled={loading}>재시도</button>
              </div>
            )}
            {error && <p className="crawl-error">{error}</p>}
          </div>
        )}

        {/* ─── 일괄 모드 ─── */}
        {batchMode && (
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

            {extractedUrls && (
              <>
                <div className="crawl-batch-urls-header">
                  <span className="crawl-result-label">
                    추출된 URL ({extractedUrls.split('\n').filter(u => u.trim()).length}개) — 편집 가능
                  </span>
                </div>
                <textarea
                  className="crawl-textarea crawl-textarea--urls"
                  value={extractedUrls}
                  onChange={e => setExtractedUrls(e.target.value)}
                  spellCheck={false}
                />
                <button className="crawl-btn crawl-btn--batch" onClick={handleBatchGenerate} disabled={batchLoading}>
                  {batchLoading
                    ? <><span className="crawl-spinner" /> {batchProgress.done} / {batchProgress.total} 처리 중…</>
                    : '마크업 생성'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ─── 단일 결과 ─── */}
        {!batchMode && markup && (
          <ResultViewer markup={markup} onMarkupChange={setMarkup} />
        )}

        {!batchMode && loading && (
          <div className="crawl-loading">
            <span className="crawl-spinner crawl-spinner--lg" />
            <p>페이지를 크롤링하고 마크업을 생성 중입니다…</p>
          </div>
        )}

        {/* ─── 일괄 결과 탭 ─── */}
        {batchMode && batchResults.length > 0 && (
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
