import { useState, useRef, useCallback } from 'react';

const MODE_URL = 'url';
const MODE_UPLOAD = 'upload';

let imgDescCounter = 0;

function genDescId() {
  return `alt-desc-${++imgDescCounter}`;
}

function buildMarkup(item, descId) {
  if (item.isDecorative) {
    return `<!-- 장식용 이미지 -->\n<img src="${item.src || '이미지경로'}" alt="">`;
  }
  if (item.isComplex && item.description) {
    return (
      `<img src="${item.src || '이미지경로'}" alt="${item.altText}" aria-describedby="${descId}">\n` +
      `<span id="${descId}" class="sr-only">${item.description}</span>\n\n` +
      `/* sr-only CSS (전역 스타일에 추가) */\n` +
      `.sr-only {\n  position: absolute;\n  width: 1px;\n  height: 1px;\n  padding: 0;\n  margin: -1px;\n  overflow: hidden;\n  clip: rect(0,0,0,0);\n  white-space: nowrap;\n  border: 0;\n}`
    );
  }
  return `<img src="${item.src || '이미지경로'}" alt="${item.altText}">`;
}

function ImageCard({ item, index }) {
  const [altText, setAltText] = useState(item.altText ?? '');
  const [copiedAlt, setCopiedAlt] = useState(false);
  const [copiedMarkup, setCopiedMarkup] = useState(false);
  const descId = useRef(genDescId()).current;

  const markup = buildMarkup({ ...item, altText }, descId);

  function copyAlt() {
    navigator.clipboard.writeText(altText).then(() => {
      setCopiedAlt(true);
      setTimeout(() => setCopiedAlt(false), 1800);
    });
  }

  function copyMarkup() {
    navigator.clipboard.writeText(markup).then(() => {
      setCopiedMarkup(true);
      setTimeout(() => setCopiedMarkup(false), 1800);
    });
  }

  const srcShort = item.src
    ? (item.src.length > 60 ? '…' + item.src.slice(-57) : item.src)
    : item.name || '업로드된 이미지';

  let typeLabel = '일반';
  let typeBadge = 'simple';
  if (item.error) { typeLabel = '오류'; typeBadge = 'error'; }
  else if (item.isDecorative) { typeLabel = '장식용'; typeBadge = 'decorative'; }
  else if (item.isComplex) { typeLabel = '복잡 (hidden 마크업 권장)'; typeBadge = 'complex'; }

  return (
    <div className={`alt-card${item.error ? ' alt-card--error' : ''}`}>
      <div className="alt-card-head">
        <div className="alt-card-thumb">
          {item.src || item.previewUrl ? (
            <img
              src={item.previewUrl || item.src}
              alt=""
              onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <span
            className="alt-card-thumb-placeholder"
            style={{ display: (item.src || item.previewUrl) ? 'none' : 'flex' }}
          >🖼</span>
        </div>
        <div className="alt-card-meta">
          <div className="alt-card-meta-row">
            <span className={`alt-badge alt-badge--${typeBadge}`}>{typeLabel}</span>
            {item.currentAlt && (
              <span className="alt-card-current-alt">현재 alt: "{item.currentAlt}"</span>
            )}
          </div>
          <p className="alt-card-src">{srcShort}</p>
        </div>
      </div>

      {item.error ? (
        <p className="alt-error-msg">분석 실패: {item.error}</p>
      ) : item.isDecorative ? (
        <div className="alt-card-body">
          <p className="alt-decorative-note">
            장식용 이미지입니다. <code>alt=""</code>로 처리하면 스크린리더가 건너뜁니다.
          </p>
          <div className="alt-markup-block">
            <div className="alt-markup-block-header">
              <span className="alt-markup-block-title">권장 마크업</span>
              <button className={`alt-copy-btn${copiedMarkup ? ' is-copied' : ''}`} onClick={copyMarkup}>
                {copiedMarkup ? '복사됨' : '복사'}
              </button>
            </div>
            <pre className="alt-markup-code">{markup}</pre>
          </div>
        </div>
      ) : (
        <div className="alt-card-body">
          <div>
            <span className="alt-field-label">생성된 대체텍스트 (alt)</span>
            <div className="alt-field-row">
              <textarea
                className="alt-field-input"
                value={altText}
                onChange={e => setAltText(e.target.value)}
                rows={2}
              />
              <button className={`alt-copy-btn${copiedAlt ? ' is-copied' : ''}`} onClick={copyAlt}>
                {copiedAlt ? '복사됨' : '복사'}
              </button>
            </div>
          </div>

          {item.isComplex && item.description && (
            <div>
              <span className="alt-field-label">상세 설명 (screen reader용)</span>
              <p style={{ fontSize: '0.85rem', color: '#666', margin: '0 0 0.4rem', lineHeight: 1.6 }}>
                {item.description}
              </p>
            </div>
          )}

          <div className="alt-markup-block">
            <div className="alt-markup-block-header">
              <span className="alt-markup-block-title">
                {item.isComplex ? '권장 마크업 (aria-describedby + sr-only)' : '권장 마크업'}
              </span>
              <button className={`alt-copy-btn${copiedMarkup ? ' is-copied' : ''}`} onClick={copyMarkup}>
                {copiedMarkup ? '복사됨' : '복사'}
              </button>
            </div>
            <pre className="alt-markup-code">{markup}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function toKoreanError(msg) {
  if (!msg) return '알 수 없는 오류가 발생했습니다.';
  if (/failed to fetch/i.test(msg)) return '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.';
  if (/timeout|timed out/i.test(msg)) return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
  if (/허용되지 않는/i.test(msg)) return msg;
  if (/groq_api_key/i.test(msg)) return 'AI API 키가 설정되지 않았습니다.';
  return msg;
}

export default function AltTextPage() {
  const [mode, setMode] = useState(MODE_URL);
  const [url, setUrl] = useState('');
  const [selector, setSelector] = useState('');
  const [detectedSelector, setDetectedSelector] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const handleAnalyzeUrl = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setDetectedSelector(null);
    try {
      const res = await fetch('/api/alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed, selector: selector.trim() || undefined }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`서버 오류: ${text.slice(0, 120)}`); }
      if (!res.ok) throw new Error(data.detail ?? '알 수 없는 오류');
      setResults(data.images ?? []);
      setDetectedSelector(data.detectedSelector ?? null);
    } catch (e) {
      setError(toKoreanError(e.message));
    } finally {
      setLoading(false);
    }
  }, [url, selector]);

  const handleAnalyzeUpload = useCallback(async () => {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const images = await Promise.all(
        files.map(f => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => resolve({ dataUri: e.target.result, name: f.name, previewUrl: e.target.result });
          reader.onerror = reject;
          reader.readAsDataURL(f);
        }))
      );
      const res = await fetch('/api/alt-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: images.map(({ dataUri, name }) => ({ dataUri, name })) }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error(`서버 오류: ${text.slice(0, 120)}`); }
      if (!res.ok) throw new Error(data.detail ?? '알 수 없는 오류');
      // Attach previewUrl from local files to results
      const enriched = (data.images ?? []).map((item, i) => ({
        ...item,
        previewUrl: images[i]?.previewUrl,
        name: images[i]?.name,
      }));
      setResults(enriched);
    } catch (e) {
      setError(toKoreanError(e.message));
    } finally {
      setLoading(false);
    }
  }, [files]);

  function handleFileDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...dropped].slice(0, 5));
  }

  function handleFileChange(e) {
    const selected = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    setFiles(prev => [...prev, ...selected].slice(0, 5));
    e.target.value = '';
  }

  function removeFile(idx) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  const totalCount = results?.length ?? 0;
  const simpleCount = results?.filter(r => !r.error && !r.isDecorative && !r.isComplex).length ?? 0;
  const complexCount = results?.filter(r => !r.error && r.isComplex).length ?? 0;
  const decorativeCount = results?.filter(r => !r.error && r.isDecorative).length ?? 0;
  const errorCount = results?.filter(r => r.error).length ?? 0;

  function copyAll() {
    if (!results?.length) return;
    let counter = 0;
    const all = results
      .filter(r => !r.error)
      .map(item => {
        const descId = `alt-desc-${++counter}`;
        return buildMarkup(item, descId);
      })
      .join('\n\n');
    navigator.clipboard.writeText(all).catch(() => {});
  }

  return (
    <div className="crawl-page">
      <div className="crawl-page-inner">
        <h2 className="crawl-title">이미지 콘텐츠 대체텍스트 생성</h2>
        <p className="crawl-desc">
          URL 입력 또는 이미지 업로드만으로 AI가 웹 접근성(KWCAG 2.1)에 맞는 대체텍스트와 마크업을 자동으로 생성합니다.
        </p>

        <div className="page-how-to">
          <div className="page-how-to-copy">
            <span className="ai-intro-kicker">사용방법</span>
            <h3>학교 서브콘텐츠 URL을 입력하거나 이미지를 업로드하면 AI가 대체텍스트를 생성합니다</h3>
            <p>
              단순한 이미지는 <code>alt="..."</code>로, 차트·인포그래픽처럼 복잡한 이미지는{' '}
              <code>aria-describedby</code> + <code>.sr-only</code> 숨김 마크업으로 처리합니다.<br />
              URL 모드는 페이지 내 이미지를 최대 10개 자동 수집하며, 업로드 모드는 최대 5개 파일을 지원합니다.
            </p>
          </div>
        </div>

        <div className="crawl-form">
          <div className="alt-mode-tabs">
            <button
              className={`alt-mode-tab${mode === MODE_URL ? ' is-active' : ''}`}
              onClick={() => { setMode(MODE_URL); setResults(null); setError(null); }}
            >
              URL 입력
            </button>
            <button
              className={`alt-mode-tab${mode === MODE_UPLOAD ? ' is-active' : ''}`}
              onClick={() => { setMode(MODE_UPLOAD); setResults(null); setError(null); }}
            >
              이미지 업로드
            </button>
          </div>

          {mode === MODE_URL && (
            <>
              <div className="crawl-url-row">
                <input
                  className="crawl-input"
                  type="url"
                  placeholder="https://example.com/page"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !loading && handleAnalyzeUrl()}
                  disabled={loading}
                />
                <button
                  className="crawl-btn"
                  onClick={handleAnalyzeUrl}
                  disabled={loading || !url.trim()}
                >
                  {loading ? <><span className="crawl-spinner" /> 분석 중…</> : '대체텍스트 생성'}
                </button>
              </div>
              <div className="alt-selector-row">
                <label className="alt-selector-label">콘텐츠 영역 셀렉터</label>
                <input
                  className="crawl-input alt-selector-input"
                  type="text"
                  placeholder="비워두면 자동 감지 (#cntnts, #subContent 등)"
                  value={selector}
                  onChange={e => setSelector(e.target.value)}
                  disabled={loading}
                />
              </div>
              {detectedSelector && (
                <p className="alt-detected-selector">
                  감지된 영역: <code>{detectedSelector}</code>
                </p>
              )}
            </>
          )}

          {mode === MODE_UPLOAD && (
            <>
              <div
                className={`alt-dropzone${dragOver ? ' is-dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <span className="alt-dropzone-icon">🖼</span>
                <p className="alt-dropzone-label">이미지를 드래그하거나 클릭하여 선택</p>
                <p className="alt-dropzone-sub">JPG, PNG, WEBP 등 · 최대 5개</p>
              </div>
              {files.length > 0 && (
                <div className="alt-file-list">
                  {files.map((f, i) => (
                    <span key={i} className="alt-file-chip">
                      {f.name.length > 24 ? f.name.slice(0, 22) + '…' : f.name}
                      <button onClick={() => removeFile(i)} aria-label={`${f.name} 제거`}>✕</button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <button
                  className="crawl-btn"
                  onClick={handleAnalyzeUpload}
                  disabled={loading || !files.length}
                >
                  {loading ? <><span className="crawl-spinner" /> 분석 중…</> : '대체텍스트 생성'}
                </button>
              </div>
            </>
          )}

          {error && <p className="crawl-error">{error}</p>}
        </div>

        {loading && (
          <div className="crawl-loading">
            <span className="crawl-spinner crawl-spinner--lg" />
            <p>이미지를 분석하고 있습니다. 이미지 수에 따라 수십 초가 소요될 수 있습니다.</p>
          </div>
        )}

        {results !== null && !loading && (
          <div className="alt-results">
            <div className="alt-results-header">
              <div className="alt-results-summary">
                <span className="alt-badge alt-badge--total">총 {totalCount}개</span>
                {simpleCount > 0 && <span className="alt-badge alt-badge--simple">단순 {simpleCount}</span>}
                {complexCount > 0 && <span className="alt-badge alt-badge--complex">복잡 {complexCount}</span>}
                {decorativeCount > 0 && <span className="alt-badge alt-badge--decorative">장식 {decorativeCount}</span>}
                {errorCount > 0 && <span className="alt-badge alt-badge--error">오류 {errorCount}</span>}
              </div>
              {totalCount > 0 && (
                <button className="alt-copy-all-btn" onClick={copyAll}>전체 마크업 복사</button>
              )}
            </div>

            {results.length === 0 ? (
              <div className="alt-empty">
                <span>분석할 이미지를 찾지 못했습니다.</span>
                <span style={{ fontSize: '0.875rem' }}>페이지에 img 태그가 없거나 모두 아이콘/GIF 파일입니다.</span>
              </div>
            ) : (
              <div className="alt-cards">
                {results.map((item, i) => (
                  <ImageCard key={i} item={item} index={i} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
