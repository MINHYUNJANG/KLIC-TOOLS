import { useRef, useState } from 'react';
import PageHowTo from '../PageHowTo';
import { getRemediation } from '../../utils/w3c-remediation';

const BROWSERS = [
  { id: 'chrome', label: 'Chrome' },
  { id: 'edge', label: 'Edge' },
  { id: 'whale', label: 'Whale' },
  { id: 'firefox', label: 'Firefox' },
  { id: 'safari', label: 'Safari' },
  { id: 'ios', label: 'iOS' },
  { id: 'android', label: 'Android' },
];

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

async function postJson(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || '요청에 실패했습니다.');
  return data;
}

function W3cResult({ validation, onToggle, onOpenLightbox }) {
  if (!validation || validation.loading) {
    return (
      <div className="audit-w3c-loading">
        <span className="audit-thumb-spinner" />
        <span>W3C 검사 중...</span>
      </div>
    );
  }
  if (validation.error) return <div className="audit-w3c-fetch-error">검사 실패: {validation.error}</div>;

  const messages = validation.messages ?? [];
  const errors = messages.filter(msg => msg.type === 'error');
  const warnings = messages.filter(msg => msg.type === 'warning' || msg.subType === 'warning');
  const infos = messages.filter(msg => msg.type === 'info' && msg.subType !== 'warning');

  return (
    <div className="audit-w3c-result">
      <button className="audit-w3c-summary" onClick={onToggle}>
        {errors.length === 0 && warnings.length === 0 ? (
          <span className="audit-w3c-ok">오류 없음 ✓</span>
        ) : (
          <>
            {errors.length > 0 && <span className="audit-w3c-tag audit-w3c-tag--error">오류 {errors.length}</span>}
            {warnings.length > 0 && <span className="audit-w3c-tag audit-w3c-tag--warning">경고 {warnings.length}</span>}
            {infos.length > 0 && <span className="audit-w3c-tag audit-w3c-tag--info">정보 {infos.length}</span>}
          </>
        )}
        <span className="audit-w3c-chevron">{validation.open ? '▲' : '▼'}</span>
      </button>

      {validation.open && messages.length > 0 && (
        <ul className="audit-w3c-list">
          {messages.map((msg, index) => {
            const isError = msg.type === 'error';
            const isWarning = msg.type === 'warning' || msg.subType === 'warning';
            const typeClass = isError ? 'error' : isWarning ? 'warning' : 'info';
            const typeLabel = isError ? '오류' : isWarning ? '경고' : '정보';
            const remediation = getRemediation(msg.message);
            return (
              <li key={index} className={`audit-w3c-msg audit-w3c-msg--${typeClass}`}>
                <span className="audit-w3c-msg-badge">{typeLabel}</span>
                <div className="audit-w3c-msg-body">
                  <p className="audit-w3c-msg-text">{msg.message}</p>
                  {msg.lastLine != null && (
                    <span className="audit-w3c-msg-loc">줄 {msg.lastLine}{msg.firstColumn != null ? `, 열 ${msg.firstColumn}` : ''}</span>
                  )}
                  {msg.extract && <code className="audit-w3c-msg-extract">{msg.extract}</code>}
                  {remediation && (
                    <div className="audit-w3c-remediation">
                      <div className="audit-w3c-rem-row">
                        <span className="audit-w3c-rem-label audit-w3c-rem-label--problem">문제</span>
                        <p className="audit-w3c-rem-text">{remediation.problem}</p>
                      </div>
                      <div className="audit-w3c-rem-row">
                        <span className="audit-w3c-rem-label audit-w3c-rem-label--fix">조치</span>
                        <pre className="audit-w3c-rem-text audit-w3c-rem-pre">{remediation.fix}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {validation.open && messages.length === 0 && (
        <>
          <p className="audit-w3c-empty">검사 결과 메시지가 없습니다.</p>
          {validation.validatorScreenshot && (
            <div className="audit-w3c-evidence">
              <span className="audit-w3c-evidence-label">W3C 검사 결과 화면</span>
              <img
                className="audit-w3c-evidence-thumb"
                src={`data:image/png;base64,${validation.validatorScreenshot}`}
                alt="W3C validator 결과 캡처"
                onClick={() => onOpenLightbox(`data:image/png;base64,${validation.validatorScreenshot}`, 'W3C 검사 결과')}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CssResult({ validation, onToggle, onOpenLightbox }) {
  if (!validation || validation.loading) {
    return (
      <div className="audit-w3c-loading">
        <span className="audit-thumb-spinner" />
        <span>CSS 검사 중...</span>
      </div>
    );
  }
  if (validation.error) return <div className="audit-w3c-fetch-error">CSS 검사 실패: {validation.error}</div>;

  const { errors = [], warnings = [], errorCount = 0, warningCount = 0, cssScreenshot } = validation;
  return (
    <div className="audit-w3c-result">
      <button className="audit-w3c-summary" onClick={onToggle}>
        {errorCount === 0 && warningCount === 0 ? (
          <span className="audit-w3c-ok">CSS 오류 없음 ✓</span>
        ) : (
          <>
            {errorCount > 0 && <span className="audit-w3c-tag audit-w3c-tag--error">CSS 오류 {errorCount}</span>}
            {warningCount > 0 && <span className="audit-w3c-tag audit-w3c-tag--warning">경고 {warningCount}</span>}
          </>
        )}
        <span className="audit-w3c-chevron">{validation.open ? '▲' : '▼'}</span>
      </button>

      {validation.open && errors.length > 0 && (
        <ul className="audit-w3c-list">
          {errors.map((err, index) => (
            <li key={index} className="audit-w3c-msg audit-w3c-msg--error">
              <span className="audit-w3c-msg-badge">CSS 오류</span>
              <div className="audit-w3c-msg-body">
                <p className="audit-w3c-msg-text">{err.message}</p>
                {err.context && <span className="audit-w3c-msg-loc">선택자: {err.context}</span>}
                {err.property && <span className="audit-w3c-msg-loc">속성: {err.property}</span>}
                {err.source && <span className="audit-w3c-msg-loc">파일: {err.source}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {validation.open && warnings.length > 0 && (
        <ul className="audit-w3c-list">
          {warnings.map((warning, index) => (
            <li key={index} className="audit-w3c-msg audit-w3c-msg--warning">
              <span className="audit-w3c-msg-badge">CSS 경고</span>
              <div className="audit-w3c-msg-body">
                <p className="audit-w3c-msg-text">{warning.message}</p>
                {warning.context && <span className="audit-w3c-msg-loc">선택자: {warning.context}</span>}
                {warning.property && <span className="audit-w3c-msg-loc">속성: {warning.property}</span>}
                {warning.source && <span className="audit-w3c-msg-loc">파일: {warning.source}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {validation.open && errors.length === 0 && (
        <>
          <p className="audit-w3c-empty">CSS 오류가 없습니다.{warningCount > 0 ? ` (경고 ${warningCount}개)` : ''}</p>
          {cssScreenshot && (
            <div className="audit-w3c-evidence">
              <span className="audit-w3c-evidence-label">CSS 검사 결과 화면</span>
              <img
                className="audit-w3c-evidence-thumb"
                src={`data:image/png;base64,${cssScreenshot}`}
                alt="CSS validator 결과 캡처"
                onClick={() => onOpenLightbox(`data:image/png;base64,${cssScreenshot}`, 'CSS 검사 결과')}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function WebStandardPage() {
  const [browsers, setBrowsers] = useState(() => Object.fromEntries(BROWSERS.map(browser => [browser.id, false])));
  const [urls, setUrls] = useState(() => Array.from({ length: 3 }, (_, index) => ({ id: index + 1, value: '', error: '' })));
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, phase: '' });
  const [validations, setValidations] = useState({});
  const [cssValidations, setCssValidations] = useState({});
  const [screenshots, setScreenshots] = useState({});
  const [lightbox, setLightbox] = useState(null);
  const nextId = useRef(4);
  const maxBrowsers = 5;

  const selectedBrowsers = BROWSERS.filter(browser => browsers[browser.id]);
  const hasAnyUrl = urls.some(url => url.value.trim());
  const hasAnyResult = Object.values(validations).some(validation => validation && !validation.loading && validation.messages !== null);

  function toggleBrowser(id) {
    const checkedCount = BROWSERS.filter(browser => browsers[browser.id]).length;
    if (!browsers[id] && checkedCount >= maxBrowsers) {
      alert(`브라우저는 최대 ${maxBrowsers}개까지 선택 가능합니다.`);
      return;
    }
    setBrowsers(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function addUrl() {
    setUrls(prev => [...prev, { id: nextId.current++, value: '', error: '' }]);
  }

  function removeUrl(id) {
    if (urls.length <= 1) return;
    setUrls(prev => prev.filter(url => url.id !== id));
    setValidations(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCssValidations(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateUrl(id, value) {
    setUrls(prev => prev.map(url => url.id === id ? { ...url, value, error: '' } : url));
  }

  function validateUrls() {
    let ok = true;
    setUrls(prev => prev.map(url => {
      if (!url.value.trim()) return { ...url, error: '' };
      if (!isValidUrl(url.value.trim())) {
        ok = false;
        return { ...url, error: '올바른 URL 형식이 아닙니다.' };
      }
      return { ...url, error: '' };
    }));
    return ok;
  }

  function toggleValidationOpen(id) {
    setValidations(prev => ({ ...prev, [id]: { ...prev[id], open: !prev[id]?.open } }));
  }

  function toggleCssOpen(id) {
    setCssValidations(prev => ({ ...prev, [id]: { ...prev[id], open: !prev[id]?.open } }));
  }

  async function handleAudit() {
    if (!hasAnyUrl || !validateUrls()) return;
    if (selectedBrowsers.length === 0) {
      alert('브라우저를 1개 이상 선택해주세요.');
      return;
    }

    const activeUrls = urls.filter(url => url.value.trim());
    const totalScreenshots = activeUrls.length * selectedBrowsers.length;
    const total = activeUrls.length + totalScreenshots;

    setLoading(true);
    setProgress({ done: 0, total, phase: 'W3C/CSS 검사 중' });
    setValidations(prev => {
      const patch = {};
      activeUrls.forEach(url => { patch[url.id] = { loading: true, messages: null, error: null, open: false }; });
      return { ...prev, ...patch };
    });
    setCssValidations(prev => {
      const patch = {};
      activeUrls.forEach(url => { patch[url.id] = { loading: true, errors: [], warnings: [], error: null, open: false }; });
      return { ...prev, ...patch };
    });
    setScreenshots(prev => {
      const patch = {};
      activeUrls.forEach(url => {
        selectedBrowsers.forEach(browser => {
          patch[`${url.id}-${browser.id}`] = { dataUrl: null, loading: true, error: null, label: browser.label };
        });
      });
      return { ...prev, ...patch };
    });

    let w3cDone = 0;
    await Promise.all(activeUrls.map(async urlItem => {
      const targetUrl = urlItem.value.trim();
      const [htmlResult, cssResult] = await Promise.allSettled([
        postJson('/api/w3c', { url: targetUrl }),
        postJson('/api/css', { url: targetUrl }),
      ]);

      setValidations(prev => ({
        ...prev,
        [urlItem.id]: htmlResult.status === 'fulfilled'
          ? { loading: false, messages: htmlResult.value.messages ?? [], error: null, open: false, validatorScreenshot: htmlResult.value.validatorScreenshot ?? null }
          : { loading: false, messages: null, error: htmlResult.reason.message, open: false },
      }));
      setCssValidations(prev => ({
        ...prev,
        [urlItem.id]: cssResult.status === 'fulfilled'
          ? { loading: false, errors: cssResult.value.errors ?? [], warnings: cssResult.value.warnings ?? [], errorCount: cssResult.value.errorCount ?? 0, warningCount: cssResult.value.warningCount ?? 0, cssScreenshot: cssResult.value.cssScreenshot ?? null, error: null, open: false }
          : { loading: false, errors: [], warnings: [], error: cssResult.reason.message, open: false },
      }));

      w3cDone += 1;
      setProgress({ done: w3cDone, total, phase: 'W3C/CSS 검사 중' });
    }));

    const screenshotTasks = [];
    activeUrls.forEach(urlItem => {
      selectedBrowsers.forEach(browser => screenshotTasks.push({ urlItem, browser }));
    });

    let shotDone = 0;
    const batchSize = 3;
    for (let index = 0; index < screenshotTasks.length; index += batchSize) {
      await Promise.all(screenshotTasks.slice(index, index + batchSize).map(async ({ urlItem, browser }) => {
        const key = `${urlItem.id}-${browser.id}`;
        try {
          const data = await postJson('/api/screenshot', { url: urlItem.value.trim(), browser: browser.id });
          setScreenshots(prev => ({ ...prev, [key]: { dataUrl: `data:image/png;base64,${data.image}`, loading: false, error: null, label: browser.label } }));
        } catch (err) {
          setScreenshots(prev => ({ ...prev, [key]: { dataUrl: null, loading: false, error: err.message, label: browser.label } }));
        } finally {
          shotDone += 1;
          setProgress({ done: activeUrls.length + shotDone, total, phase: '스크린샷 캡처 중' });
        }
      }));
    }

    setLoading(false);
    setProgress({ done: 0, total: 0, phase: '' });
  }

  async function handleDownload() {
    const activeUrls = urls.filter(url => url.value.trim());
    if (!activeUrls.length) return;

    const items = [];
    for (const urlItem of activeUrls) {
      const validation = validations[urlItem.id];
      const messages = validation?.messages ?? [];
      const errorCount = messages.filter(message => message.type === 'error').length;
      const warningCount = messages.filter(message => message.type === 'warning' || message.type === 'info').length;
      const cssValidation = cssValidations[urlItem.id];

      for (const browser of selectedBrowsers) {
        const shot = screenshots[`${urlItem.id}-${browser.id}`];
        items.push({
          url: urlItem.value.trim(),
          browser: browser.id,
          w3c_error_count: errorCount,
          w3c_warning_count: warningCount,
          validator_screenshot: validation?.validatorScreenshot ?? null,
          css_screenshot: cssValidation?.cssScreenshot ?? null,
          screenshot: shot?.dataUrl ? shot.dataUrl.replace('data:image/png;base64,', '') : null,
        });
      }
    }

    try {
      const response = await fetch('/api/download-hwpx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        alert(`다운로드 실패: ${data.detail || response.statusText}`);
        return;
      }

      const blob = await response.blob();
      const today = new Date()
        .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
        .replace(/\. /g, '')
        .replace('.', '');
      const seqKey = `hwpx_seq_${today}`;
      const seq = Number.parseInt(localStorage.getItem(seqKey) || '0', 10) + 1;
      localStorage.setItem(seqKey, String(seq));
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `웹 호환성 점검 결과서_증적_${today}_${String(seq).padStart(3, '0')}.hwpx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      alert(`오류: ${error.message}`);
    }
  }

  return (
    <main className="audit-page">
      <section className="audit-page-header">
        <h2 className="crawl-title">웹표준검사</h2>
        <p className="crawl-desc">W3C HTML/CSS 검사와 브라우저별 증적 캡처를 한 번에 생성합니다.</p>
        <PageHowTo title="브라우저 1개 이상(최대 5개) 선택 후 검사할 URL을 입력하고 검사를 시작하세요" style={{ marginBottom: 0 }}>
          <p>
            W3C HTML·CSS 검사 결과에서 오류나 경고가 있을 경우 <strong>항목별 조치방법</strong>이 함께 표시되어 바로 수정에 활용할 수 있습니다.<br />
            검사가 완료되면 브라우저별 캡처 화면과 W3C 검사 결과를 포함한 <strong>웹표준 증적보고서(.hwpx)</strong>를 다운로드할 수 있습니다.
          </p>
        </PageHowTo>
      </section>

      <section className="audit-content">
        <div className="audit-browser-section">
          <div className="audit-browser-header">
            <span className="audit-browser-label">브라우저 캡처</span>
          </div>
          <div className="audit-browser-list">
            {BROWSERS.map(browser => (
              <label key={browser.id} className={`audit-browser-chip${browsers[browser.id] ? ' checked' : ''}`}>
                <input type="checkbox" checked={browsers[browser.id]} onChange={() => toggleBrowser(browser.id)} />
                {browser.label}
              </label>
            ))}
          </div>
        </div>

        <div className="audit-url-list">
          {urls.map((urlItem, index) => {
            const urlShots = BROWSERS
              .map(browser => ({ ...browser, shot: screenshots[`${urlItem.id}-${browser.id}`] }))
              .filter(browser => browser.shot);

            return (
              <div key={urlItem.id} className="audit-url-item">
                <div className="audit-url-row">
                  <span className="audit-url-num">{index + 1}</span>
                  <input
                    className="audit-url-input"
                    type="text"
                    value={urlItem.value}
                    onChange={event => updateUrl(urlItem.id, event.target.value)}
                    onKeyDown={event => event.key === 'Enter' && !loading && handleAudit()}
                    placeholder="검사할 URL을 입력하세요."
                  />
                  {urls.length > 1 && <button className="audit-url-remove" onClick={() => removeUrl(urlItem.id)} title="삭제">×</button>}
                </div>
                {urlItem.error && <p className="audit-field-error">{urlItem.error}</p>}

                {validations[urlItem.id] && (
                  <div className="audit-url-result-wrap">
                    <W3cResult
                      validation={validations[urlItem.id]}
                      onToggle={() => toggleValidationOpen(urlItem.id)}
                      onOpenLightbox={(dataUrl, label) => setLightbox({ dataUrl, label, url: urlItem.value })}
                    />
                  </div>
                )}
                {cssValidations[urlItem.id] && (
                  <div className="audit-url-result-wrap">
                    <CssResult
                      validation={cssValidations[urlItem.id]}
                      onToggle={() => toggleCssOpen(urlItem.id)}
                      onOpenLightbox={(dataUrl, label) => setLightbox({ dataUrl, label, url: urlItem.value })}
                    />
                  </div>
                )}

                {urlShots.length > 0 && (
                  <div className="audit-thumb-row">
                    {urlShots.map(browser => (
                      <div key={browser.id} className="audit-thumb-item">
                        {browser.shot.loading ? (
                          <div className="audit-thumb-skeleton"><span className="audit-thumb-spinner" /></div>
                        ) : browser.shot.error ? (
                          <div className="audit-thumb-error" title={browser.shot.error}>×</div>
                        ) : (
                          <img
                            className="audit-thumb-img"
                            src={browser.shot.dataUrl}
                            alt={`${browser.label} 캡처`}
                            onClick={() => setLightbox({ dataUrl: browser.shot.dataUrl, label: browser.label, url: urlItem.value })}
                          />
                        )}
                        <span className="audit-thumb-label">{browser.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button className="audit-add-btn" onClick={addUrl}>+ URL 추가</button>

        <div className="audit-actions">
          <button className="audit-run-btn" onClick={handleAudit} disabled={loading || !hasAnyUrl || selectedBrowsers.length === 0}>
            {loading ? '검사 중...' : '검사 시작'}
          </button>
          {hasAnyResult && (
            <button className="audit-download-btn" onClick={handleDownload} disabled={loading}>
              웹표준 증적보고서 다운로드
            </button>
          )}
        </div>

        {loading && progress.total > 0 && (
          <div className="audit-progress-wrap">
            <div className="audit-progress-header">
              <span className="audit-progress-phase">{progress.phase}</span>
              <span className="audit-progress-count">{progress.done} / {progress.total}</span>
            </div>
            <div className="audit-progress-bar">
              <div className="audit-progress-fill" style={{ width: `${Math.round(progress.done / progress.total * 100)}%` }} />
            </div>
          </div>
        )}
      </section>

      {lightbox && (
        <div className="audit-lightbox" onClick={() => setLightbox(null)}>
          <div className="audit-lightbox-inner" onClick={event => event.stopPropagation()}>
            <div className="audit-lightbox-header">
              <span className="audit-lightbox-title">{lightbox.label} - {lightbox.url}</span>
              <button className="audit-lightbox-close" onClick={() => setLightbox(null)}>×</button>
            </div>
            <img className="audit-lightbox-img" src={lightbox.dataUrl} alt="캡처 전체 보기" />
          </div>
        </div>
      )}
    </main>
  );
}
