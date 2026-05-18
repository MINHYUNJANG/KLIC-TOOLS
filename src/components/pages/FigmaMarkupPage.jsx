import { useMemo, useState } from 'react';
import PageHowTo from '../PageHowTo';

function isValidFigmaUrl(str) {
  return /figma\.com\/(file|design|proto)\/[A-Za-z0-9]+/.test(str);
}

async function readJson(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`서버 응답을 읽을 수 없습니다. (${response.status})`);
  }
}

export default function FigmaMarkupPage() {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [markupType, setMarkupType] = useState('html');
  const [htmlResult, setHtmlResult] = useState('');
  const [cssResult, setCssResult] = useState('');
  const [jsxResult, setJsxResult] = useState('');
  const [activeTab, setActiveTab] = useState('html');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [blobUrls, setBlobUrls] = useState({});
  const [downloading, setDownloading] = useState(false);

  const isReact = markupType === 'react';
  const hasResult = isReact ? Boolean(jsxResult || cssResult) : Boolean(htmlResult || cssResult);
  const currentContent = activeTab === 'css' ? cssResult : activeTab === 'jsx' ? jsxResult : htmlResult;

  const previewSrcDoc = useMemo(() => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
html, body { margin: 0; padding: 0; overflow: auto; }
${cssResult}
</style>
</head>
<body>
${htmlResult}
</body>
</html>`, [htmlResult, cssResult]);

  function resetResult(nextType = markupType) {
    setHtmlResult('');
    setCssResult('');
    setJsxResult('');
    setError('');
    setBlobUrls({});
    setActiveTab(nextType === 'react' ? 'jsx' : 'html');
  }

  function handleMarkupTypeChange(type) {
    setMarkupType(type);
    resetResult(type);
  }

  async function handleGenerate() {
    if (!figmaUrl.trim()) {
      setFieldError('Figma URL을 입력해주세요.');
      return;
    }
    if (!isValidFigmaUrl(figmaUrl.trim())) {
      setFieldError('올바른 Figma URL이 아닙니다. 예: https://www.figma.com/design/XXXX/...');
      return;
    }

    setFieldError('');
    setLoading(true);
    resetResult();

    try {
      const response = await fetch('/api/figma-accurate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: figmaUrl.trim(), markup_type: markupType, project_name: projectName.trim() }),
        signal: AbortSignal.timeout(200000),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.detail || '피그마 마크업 생성에 실패했습니다.');

      if (markupType === 'react') {
        setJsxResult(data.jsx || '');
        setCssResult(data.css || '');
        setActiveTab('jsx');
      } else {
        setHtmlResult(data.html || '');
        setCssResult(data.css || '');
        setActiveTab('html');
      }
      if (data.blob_urls) setBlobUrls(data.blob_urls);
    } catch (err) {
      setError(err.name === 'TimeoutError' ? 'Figma 분석 시간이 초과되었습니다.' : err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch('/api/figma-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlResult,
          jsx: jsxResult,
          css: cssResult,
          blob_urls: blobUrls,
          project_name: projectName || 'figma-markup',
          markup_type: markupType,
        }),
      });
      if (!response.ok) throw new Error('다운로드에 실패했습니다.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName || 'figma-markup'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleContentChange(value) {
    if (activeTab === 'css') setCssResult(value);
    else if (activeTab === 'jsx') setJsxResult(value);
    else setHtmlResult(value);
  }

  return (
    <div className="figma-page">
      <div className="figma-header">
        <h2 className="crawl-title">피그마 마크업</h2>
        <p className="crawl-desc">Figma URL의 프레임을 분석해 HTML/CSS 또는 React/CSS 마크업을 생성합니다.</p>
        <PageHowTo title="Figma 디자인 URL을 붙여넣으면 프레임을 분석해 마크업 코드를 자동 생성합니다" style={{ marginBottom: 0 }}>
          <p>
            Figma 파일·디자인 공유(share) URL을 입력하고 프로젝트명을 입력한 뒤 출력 형식(HTML 또는 React)을 선택하세요.<br />
            <strong>생성</strong> 버튼을 누르면 프레임 구조를 분석해 HTML/CSS 또는 JSX/CSS 코드를 만들어 줍니다.
          </p>
        </PageHowTo>
      </div>

      <div className="figma-body">
        <section className="figma-panel figma-form-panel">
          <label className="figma-field">
            <span>프로젝트명</span>
            <input
              className="crawl-input"
              type="text"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
              placeholder="프로젝트 이름"
            />
          </label>

          <div className="figma-field">
            <span>마크업 종류</span>
            <div className="figma-segment">
              <button className={markupType === 'html' ? 'is-active' : ''} onClick={() => handleMarkupTypeChange('html')}>HTML</button>
              <button className={markupType === 'react' ? 'is-active' : ''} onClick={() => handleMarkupTypeChange('react')}>React</button>
            </div>
          </div>

          <label className="figma-field">
            <span>Figma URL</span>
            <input
              className={`crawl-input ${fieldError ? 'is-error' : ''}`}
              type="text"
              value={figmaUrl}
              onChange={e => { setFigmaUrl(e.target.value); setFieldError(''); }}
              onKeyDown={e => e.key === 'Enter' && !loading && handleGenerate()}
              placeholder="https://www.figma.com/design/XXXX/...?node-id=..."
              disabled={loading}
            />
            {fieldError && <em className="figma-field-error">{fieldError}</em>}
          </label>

          <button className="crawl-btn figma-submit" onClick={handleGenerate} disabled={loading || !figmaUrl.trim()}>
            {loading ? <><span className="crawl-spinner" /> 분석 중...</> : '마크업 생성'}
          </button>

          {loading && (
            <p className="figma-status">Figma 스타일 데이터 추출 중입니다. 색상, 폰트, 여백, 레이아웃을 분석하고 있어요.</p>
          )}
          {error && (
            <div className="crawl-error" style={
              error.includes('토큰') || error.includes('한도')
                ? { borderColor: '#f5a623', background: '#fffbf0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }
                : {}
            }>
              <strong>{error}</strong>
              {error.includes('토큰') && (
                <span style={{ fontSize: '0.8125rem', color: '#666' }}>.env.local 파일의 FIGMA_ACCESS_TOKEN 값을 확인해주세요.</span>
              )}
              {error.includes('한도') && (
                <span style={{ fontSize: '0.8125rem', color: '#666' }}>Figma API 분당 요청 한도에 도달했습니다. 1분 후 다시 시도해주세요.</span>
              )}
            </div>
          )}
        </section>

        <section className="figma-panel figma-result-panel">
          {!hasResult ? (
            <div className="figma-empty">
              <strong>생성 결과</strong>
              <p>Figma 프레임 URL을 입력하고 마크업을 생성하면 이곳에 소스가 표시됩니다.</p>
            </div>
          ) : (
            <>
              <div className="figma-result-header">
                <div className="crawl-tabs">
                  {isReact ? (
                    <>
                      <button className={`crawl-tab ${activeTab === 'jsx' ? 'is-active' : ''}`} onClick={() => setActiveTab('jsx')}>JSX</button>
                      <button className={`crawl-tab ${activeTab === 'css' ? 'is-active' : ''}`} onClick={() => setActiveTab('css')}>CSS</button>
                    </>
                  ) : (
                    <>
                      <button className={`crawl-tab ${activeTab === 'html' ? 'is-active' : ''}`} onClick={() => setActiveTab('html')}>HTML</button>
                      <button className={`crawl-tab ${activeTab === 'css' ? 'is-active' : ''}`} onClick={() => setActiveTab('css')}>CSS</button>
                    </>
                  )}
                </div>
                <div className="figma-actions">
                  {!isReact && <button className="crawl-copy-btn" onClick={() => setShowPreview(true)}>미리보기</button>}
                  <button className="crawl-copy-btn" onClick={handleCopy}>{copied ? '복사됨 ✓' : '복사'}</button>
                  <button className="crawl-copy-btn" onClick={handleDownload} disabled={downloading}>
                    {downloading ? '압축 중...' : '다운로드'}
                  </button>
                </div>
              </div>

              <textarea
                className="crawl-textarea figma-editor"
                value={currentContent}
                onChange={e => handleContentChange(e.target.value)}
                spellCheck={false}
              />
            </>
          )}
        </section>
      </div>

      {showPreview && hasResult && (
        <div className="figma-modal" onClick={() => setShowPreview(false)}>
          <div className="figma-modal-inner" onClick={e => e.stopPropagation()}>
            <div className="figma-modal-header">
              <strong>미리보기{projectName ? ` - ${projectName}` : ''}</strong>
              <button onClick={() => setShowPreview(false)} aria-label="닫기">×</button>
            </div>
            <iframe className="figma-preview" srcDoc={previewSrcDoc} title="피그마 마크업 미리보기" />
          </div>
        </div>
      )}
    </div>
  );
}
