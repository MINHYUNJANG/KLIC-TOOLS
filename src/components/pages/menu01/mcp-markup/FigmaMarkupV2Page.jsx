import { useMemo, useState } from 'react';
import { CONTENT_CONVERTERS } from '../../../../templates/mcpMainContents';

const CATEGORIES = [
  { id: 'main', label: '메인' },
  { id: 'sub',  label: '서브' },
];

const MAIN_CONTENTS = [
  { id: 'shortcut', label: '바로가기' },
  { id: 'gallery',  label: '갤러리' },
];

export default function FigmaMarkupV2Page() {
  const [htmlInput, setHtmlInput] = useState('');
  const [cssInput, setCssInput] = useState('');
  const [markupType, setMarkupType] = useState('main');
  const [contentType, setContentType] = useState('shortcut');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [converted, setConverted] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const hasContent = Boolean(htmlInput.trim() || cssInput.trim());

  const previewSrcDoc = useMemo(() => `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="/basic.css">
<style>
html { margin: 0; padding: 1rem; overflow: visible; }
body { margin: 0; padding: 0; overflow: visible; }
${cssInput}
</style>
</head>
<body>
${htmlInput}
</body>
</html>`, [htmlInput, cssInput]);

  async function handleCopy(type) {
    const text = type === 'css' ? cssInput : htmlInput;
    await navigator.clipboard.writeText(text);
    if (type === 'css') {
      setCopiedCss(true);
      setTimeout(() => setCopiedCss(false), 1800);
    } else {
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 1800);
    }
  }

  async function handleDownload() {
    if (!hasContent) return;
    setDownloading(true);
    setError('');
    try {
      const response = await fetch('/api/figma-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlInput,
          css: cssInput,
          blob_urls: {},
          project_name: `mcp-markup-${markupType}`,
          markup_type: markupType,
        }),
      });
      if (!response.ok) throw new Error('다운로드에 실패했습니다.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mcp-markup-${markupType}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  function handleReset() {
    setHtmlInput('');
    setCssInput('');
    setConverted(false);
    setError('');
  }

  function handleMarkupTypeChange(id) {
    setMarkupType(id);
    setConverted(false);
    setCssInput('');
  }

  function handleContentTypeChange(id) {
    setContentType(id);
    setConverted(false);
    setCssInput('');
  }

  function handlePxToRem() {
    if (!cssInput.trim()) return;
    const converted = cssInput.replace(/(\d+\.?\d*)px/g, (match, num) => {
      const val = parseFloat(num);
      if (val <= 3) return match;
      const rem = parseFloat((val / 20).toFixed(4));
      return `${rem}rem`;
    });
    setCssInput(converted);
  }

  function handleConvert() {
    if (!htmlInput.trim()) return;
    const converter = CONTENT_CONVERTERS[contentType];
    if (!converter) return;
    const result = converter(htmlInput, cssInput);
    setHtmlInput(result.html);
    setConverted(true);
  }

  const isMainMode = markupType === 'main';
  const cssLocked = isMainMode && !converted;
  const canConvert = isMainMode && Boolean(CONTENT_CONVERTERS[contentType]);
  const activeTypeLabel = CATEGORIES.find(t => t.id === markupType)?.label ?? '';

  return (
    <div className="bm-page">

      {/* ─── 상단 타이틀 ─── */}
      <div className="bm-header">
        <div className="crawl-title-row">
          <h2 className="crawl-title">MCP 마크업</h2>
          <button
            type="button"
            className="crawl-help-btn"
            onClick={() => setShowHelp(true)}
            title="도움말"
            aria-label="MCP 마크업 사용방법 열기"
          >
            ?
          </button>
        </div>
        <p className="crawl-desc">Claude 채팅에서 MCP로 추출한 HTML/CSS를 붙여넣어 미리보기·다운로드합니다.</p>
      </div>

      {showHelp && (
        <div className="mcp-help-overlay" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <section
            className="mcp-help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mcp-help-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="mcp-help-head">
              <div>
                <span>사용방법</span>
                <h3 id="mcp-help-title">MCP 마크업 사용 순서</h3>
              </div>
              <button type="button" onClick={() => setShowHelp(false)} aria-label="사용방법 닫기">×</button>
            </div>
            <ol className="mcp-help-steps">
              <li><strong>유형 선택</strong><p>메인 또는 서브를 선택하고, 메인이라면 변환할 콘텐츠 종류도 선택합니다.</p></li>
              <li><strong>MCP 결과 붙여넣기</strong><p>Claude에서 Figma를 MCP로 분석해 만든 HTML과 CSS를 각 입력창에 붙여넣습니다.</p></li>
              <li><strong>메인 콘텐츠 변환</strong><p>메인 작업은 변환 버튼으로 KLIC 구조에 맞춘 뒤 필요하면 px을 rem으로 변환합니다.</p></li>
              <li><strong>결과 확인 및 저장</strong><p>미리보기로 결과를 확인하고 HTML·CSS 복사 또는 ZIP 다운로드를 실행합니다.</p></li>
            </ol>
            <div className="mcp-help-actions">
              <button type="button" onClick={() => setShowHelp(false)}>확인</button>
            </div>
          </section>
        </div>
      )}

      {/* ─── 하단 2단 ─── */}
      <div className="bm-body">

        {/* 왼쪽 사이드바 */}
        <aside className="bm-sidebar">
          <div className="bm-sidebar-section">
            <p className="bm-sidebar-label">카테고리</p>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`bm-cat-btn ${markupType === cat.id ? 'is-active' : ''}`}
                onClick={() => handleMarkupTypeChange(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {markupType === 'main' && (
            <div className="bm-sidebar-section">
              <p className="bm-sidebar-label">콘텐츠</p>
              {MAIN_CONTENTS.map(content => (
                <button
                  key={content.id}
                  className={`bm-type-btn ${contentType === content.id ? 'is-active' : ''}`}
                  onClick={() => handleContentTypeChange(content.id)}
                >
                  {content.label}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* 오른쪽 메인 */}
        <div className="bm-main">
          <div className="figma-v2-toolbar">
            <div className="figma-actions">
              <button className="crawl-copy-btn" onClick={() => setShowPreview(true)} disabled={!hasContent}>
                미리보기
              </button>
              {markupType === 'main' && (
                <button className="crawl-copy-btn figma-v2-convert-btn" onClick={handleConvert} disabled={!canConvert || !htmlInput.trim()}>
                  구조변환
                </button>
              )}
              <button className="crawl-copy-btn" onClick={() => handleCopy('html')} disabled={!htmlInput.trim()}>
                {copiedHtml ? 'HTML 복사됨 ✓' : 'HTML 복사'}
              </button>
              <button className="crawl-copy-btn" onClick={() => handleCopy('css')} disabled={!cssInput.trim()}>
                {copiedCss ? 'CSS 복사됨 ✓' : 'CSS 복사'}
              </button>
              <button className="crawl-copy-btn" onClick={handleDownload} disabled={!hasContent || downloading}>
                {downloading ? '압축 중...' : '다운로드'}
              </button>
              <button className="crawl-copy-btn bm-reset-btn" onClick={handleReset} disabled={!hasContent}>
                초기화
              </button>
            </div>
          </div>

          {error && <div className="crawl-error" style={{ margin: '0 1.5rem' }}><strong>{error}</strong></div>}

          <div className="figma-v2-editors">
            <div className="figma-v2-editor-wrap">
              <div className="figma-v2-editor-label">
                <span>HTML</span>
                <span className="figma-v2-hint">Claude 채팅에서 복사한 HTML 붙여넣기</span>
              </div>
              <textarea
                className="crawl-textarea figma-v2-textarea"
                value={htmlInput}
                onChange={e => setHtmlInput(e.target.value)}
                placeholder={'<div class="M_link">\n  ...\n</div>'}
                spellCheck={false}
              />
            </div>

            <div className="figma-v2-editor-wrap">
              <div className="figma-v2-editor-label">
                <span>CSS</span>
                {!cssLocked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="crawl-copy-btn"
                      onClick={handlePxToRem}
                      disabled={!cssInput.trim()}
                      title="3px 초과 값을 rem으로 변환 (기준: 20px = 1rem)"
                    >
                      px → rem
                    </button>
                    <span className="figma-v2-hint">Claude 채팅에서 복사한 CSS 붙여넣기</span>
                  </div>
                )}
              </div>
              {cssLocked ? (
                <div className="figma-v2-css-locked">
                  <p>구조변환 후 변환된 구조에 맞는 CSS를 추출 후 입력해주세요.</p>
                </div>
              ) : (
                <textarea
                  className="crawl-textarea figma-v2-textarea"
                  value={cssInput}
                  onChange={e => setCssInput(e.target.value)}
                  placeholder={'.M_link {\n  width: 34rem;\n  ...\n}'}
                  spellCheck={false}
                />
              )}
            </div>
          </div>
        </div>

      </div>

      {showPreview && hasContent && (
        <div className="figma-modal" onClick={() => setShowPreview(false)}>
          <div className="figma-modal-inner" onClick={e => e.stopPropagation()}>
            <div className="figma-modal-header">
              <strong>미리보기 — {activeTypeLabel}</strong>
              <button onClick={() => setShowPreview(false)} aria-label="닫기">×</button>
            </div>
            <iframe className="figma-preview" srcDoc={previewSrcDoc} title="MCP 마크업 미리보기" />
          </div>
        </div>
      )}
    </div>
  );
}
