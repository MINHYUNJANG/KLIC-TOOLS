import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { getRemediation, getMessageKo } from '../../utils/w3c-remediation';

function buildMessagesByLine(messages) {
  const map = {};
  for (const msg of messages) {
    const first = msg.firstLine ?? msg.lastLine;
    const last = msg.lastLine ?? msg.firstLine;
    if (!first && !last) continue;
    const useLastOnly = last - first > 10;
    const start = useLastOnly ? last : first;
    for (let ln = start; ln <= last; ln++) {
      if (!map[ln]) map[ln] = [];
      map[ln].push(msg);
    }
  }
  return map;
}

function canAutoFix(msgText) {
  return (
    /trailing slash on void element/i.test(msgText) ||
    /an img element must have an alt attribute/i.test(msgText) ||
    /unnecessary for javascript resources/i.test(msgText) ||
    /type.*for the style element is not needed/i.test(msgText) ||
    /consider adding a lang attribute/i.test(msgText)
  );
}

function applyFix(html, lineIndex, msgText) {
  const lines = html.split('\n');
  const line = lines[lineIndex];
  if (line === undefined) return null;
  let fixed = line;
  if (/trailing slash on void element/i.test(msgText)) {
    fixed = line.replace(/\s*\/>/g, '>');
  } else if (/an img element must have an alt attribute/i.test(msgText)) {
    fixed = line.replace(/<img(\b[^>]*)>/gi, (m, attrs) => {
      if (/\balt=/i.test(attrs)) return m;
      return `<img${attrs} alt="">`;
    });
  } else if (/unnecessary for javascript resources/i.test(msgText)) {
    fixed = line.replace(/\s+type=["']text\/javascript["']/gi, '');
  } else if (/type.*for the style element is not needed/i.test(msgText)) {
    fixed = line.replace(/\s+type=["']text\/css["']/gi, '');
  } else if (/consider adding a lang attribute/i.test(msgText)) {
    fixed = line.replace(/<html(\b[^>]*)>/i, (m, attrs) => {
      if (/\blang=/i.test(attrs)) return m;
      return `<html${attrs} lang="ko">`;
    });
  } else {
    return null;
  }
  if (fixed === line) return null;
  lines[lineIndex] = fixed;
  return lines.join('\n');
}

function getMsgType(msg) {
  if (msg.type === 'error') return 'error';
  if (msg.type === 'info' && msg.subType === 'warning') return 'warning';
  if (msg.type === 'warning') return 'warning';
  return 'info';
}

const TYPE_ORDER = { error: 0, warning: 1, info: 2 };

function toKoreanError(msg) {
  if (!msg) return '알 수 없는 오류가 발생했습니다.';
  if (/failed to fetch/i.test(msg)) return '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.';
  if (/network error/i.test(msg)) return '네트워크 오류가 발생했습니다.';
  if (/timeout|timed out/i.test(msg)) return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
  if (/html 수집 실패/i.test(msg)) return msg;
  if (/허용되지 않는/i.test(msg)) return msg;
  if (/url은 필수/i.test(msg)) return msg;
  if (/w3c validator/i.test(msg)) return `W3C 검사 서버 오류: ${msg.replace(/w3c validator 응답 오류:\s*/i, '')}`;
  return msg;
}

function SourceViewer({ html, messages, onHtmlChange, activeLineNum, translations, aiRemediations }) {
  const [popup, setPopup] = useState(null);
  const closeTimerRef = useRef(null);
  const lineElsRef = useRef(new Map());

  const lines = useMemo(() => html.split('\n'), [html]);
  const messagesByLine = useMemo(() => buildMessagesByLine(messages), [messages]);

  // 활성 줄로 스크롤
  useEffect(() => {
    if (activeLineNum == null) return;
    const el = lineElsRef.current.get(activeLineNum);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeLineNum]);

  const scheduleClose = useCallback(() => {
    closeTimerRef.current = setTimeout(() => setPopup(null), 150);
  }, []);

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimerRef.current);
  }, []);

  const openPopup = useCallback((lineNum, e) => {
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    setPopup({ lineNum, top: rect.bottom + 4, left: rect.left + 48 });
  }, [cancelClose]);

  const handleFix = useCallback((lineNum, msgText) => {
    const fixed = applyFix(html, lineNum - 1, msgText);
    if (fixed !== null) {
      onHtmlChange(fixed);
      setPopup(null);
    }
  }, [html, onHtmlChange]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(html).catch(() => {});
  }, [html]);

  const popupMsgs = popup ? (messagesByLine[popup.lineNum] ?? []) : [];

  return (
    <section className="a11y-source-section">
      <div className="a11y-source-header">
        <p className="a11y-source-title">HTML 소스</p>
        <button className="a11y-source-copy-btn" onClick={handleCopy}>복사</button>
      </div>
      <div className="a11y-source-wrap">
        <pre className="a11y-source-pre">
          {lines.map((lineText, idx) => {
            const lineNum = idx + 1;
            const lineMsgs = messagesByLine[lineNum];
            const hasError = lineMsgs?.some(m => getMsgType(m) === 'error');
            const hasWarning = !hasError && lineMsgs?.some(m => getMsgType(m) === 'warning');
            const isActive = activeLineNum === lineNum;
            const cls = [
              'a11y-source-line',
              hasError ? 'is-error' : '',
              hasWarning ? 'is-warning' : '',
              isActive ? 'is-active' : '',
            ].filter(Boolean).join(' ');

            return (
              <div
                key={idx}
                className={cls}
                ref={el => {
                  if (el) lineElsRef.current.set(lineNum, el);
                  else lineElsRef.current.delete(lineNum);
                }}
                onMouseEnter={lineMsgs ? (e) => openPopup(lineNum, e) : undefined}
                onMouseLeave={lineMsgs ? scheduleClose : undefined}
              >
                <span className="a11y-source-linenum">{lineNum}</span>
                <span className="a11y-source-code">{lineText}</span>
              </div>
            );
          })}
        </pre>
      </div>

      {popup && popupMsgs.length > 0 && (
        <div
          className="a11y-popup"
          style={{ top: popup.top, left: popup.left }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {popupMsgs.map((msg, i) => {
            const type = getMsgType(msg);
            const rem = getRemediation(msg.message) ?? aiRemediations?.[msg.message] ?? null;
            const fixable = canAutoFix(msg.message);
            return (
              <div key={i} className={`a11y-popup-item${i > 0 ? ' a11y-popup-item--sep' : ''}`}>
                <span className={`a11y-popup-badge is-${type}`}>
                  {type === 'error' ? '오류' : type === 'warning' ? '경고' : '정보'}
                </span>
                <p className="a11y-popup-msg">
                  {getMessageKo(msg.message) || translations[msg.message] || msg.message}
                </p>
                {rem && (
                  <>
                    <p className="a11y-popup-problem">{rem.problem}</p>
                    <p className="a11y-popup-fix">{rem.fix}</p>
                  </>
                )}
                {fixable && (
                  <button className="a11y-popup-fix-btn" onClick={() => handleFix(popup.lineNum, msg.message)}>
                    자동 수정
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default function WebAccessibilityPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState(null);
  const [editedHtml, setEditedHtml] = useState(null);
  const [translations, setTranslations] = useState({});
  const [aiRemediations, setAiRemediations] = useState({});
  const [activeLineNum, setActiveLineNum] = useState(null);
  const [activeMsgIdx, setActiveMsgIdx] = useState(null);
  const [htmlHistory, setHtmlHistory] = useState([]);
  const msgItemRefs = useRef([]);

  const handleHtmlChange = useCallback((newHtml) => {
    setHtmlHistory(prev => [...prev, editedHtml]);
    setEditedHtml(newHtml);
  }, [editedHtml]);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        setHtmlHistory(prev => {
          if (prev.length === 0) return prev;
          const restored = prev[prev.length - 1];
          setEditedHtml(restored);
          return prev.slice(0, -1);
        });
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleCheck = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setMessages(null);
    setEditedHtml(null);
    setTranslations({});
    setAiRemediations({});
    setActiveLineNum(null);
    setActiveMsgIdx(null);
    setHtmlHistory([]);
    try {
      const res = await fetch('/api/accessibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? '알 수 없는 오류');
      setMessages(data.messages ?? []);
      setEditedHtml(data.html ?? '');
      setTranslations(data.translations ?? {});
      setAiRemediations(data.aiRemediations ?? {});
    } catch (e) {
      setError(toKoreanError(e.message));
    } finally {
      setLoading(false);
    }
  }, [url]);

  const handleMsgClick = useCallback((msg, idx) => {
    const lineNum = msg.lastLine ?? msg.firstLine ?? null;
    setActiveLineNum(lineNum);
    setActiveMsgIdx(idx);
  }, []);

  const sortedMessages = messages
    ? [...messages].sort((a, b) => (TYPE_ORDER[getMsgType(a)] ?? 3) - (TYPE_ORDER[getMsgType(b)] ?? 3))
    : [];

  const errorCount = sortedMessages.filter(m => getMsgType(m) === 'error').length;
  const warnCount = sortedMessages.filter(m => getMsgType(m) === 'warning').length;
  const infoCount = sortedMessages.filter(m => getMsgType(m) === 'info').length;

  const handleBadgeClick = useCallback((type) => {
    const idx = sortedMessages.findIndex(m => getMsgType(m) === type);
    if (idx === -1) return;
    msgItemRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    handleMsgClick(sortedMessages[idx], idx);
  }, [sortedMessages, handleMsgClick]);

  return (
    <div className="crawl-page">
      <div className="crawl-page-inner">
        <h2 className="crawl-title">웹접근성 검사</h2>
        <p className="crawl-desc">URL을 입력하면 W3C 기반으로 웹 접근성을 검사하고 문제점과 수정 방법을 한글로 안내합니다.</p>

        <div className="page-how-to">
          <div className="page-how-to-copy">
            <span className="ai-intro-kicker">사용방법</span>
            <h3>검사할 페이지 URL을 입력하면 W3C 기반으로 접근성을 분석하고 한글로 안내합니다</h3>
            <p>
              URL을 붙여넣고 검사 시작을 클릭하면 HTML을 자동 수집해 W3C Nu HTML Checker로 검사합니다.<br />
              왼쪽 결과 목록에서 항목을 클릭하면 오른쪽 소스에서 해당 줄로 이동하며,
              문제 줄에 마우스를 올리면 팝업으로 조치방법과 <strong>자동 수정</strong> 버튼이 표시됩니다.
            </p>
          </div>
        </div>

        <div className="crawl-form">
          <div className="crawl-url-row">
            <input
              className="crawl-input"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleCheck()}
              disabled={loading}
            />
            <button className="crawl-btn" onClick={handleCheck} disabled={loading || !url.trim()}>
              {loading ? <><span className="crawl-spinner" /> 검사 중…</> : '검사 시작'}
            </button>
          </div>
          {error && <p className="crawl-error">{error}</p>}
        </div>

        {messages !== null && (
          <div className="a11y-result-section">
            {/* 요약 뱃지 */}
            <div className="a11y-summary">
              {messages.length === 0
                ? <span className="a11y-summary-ok">오류 없음 — 유효한 HTML입니다.</span>
                : (
                  <>
                    {errorCount > 0 && <button className="a11y-tag a11y-tag--error" onClick={() => handleBadgeClick('error')}>오류 {errorCount}</button>}
                    {warnCount > 0 && <button className="a11y-tag a11y-tag--warning" onClick={() => handleBadgeClick('warning')}>경고 {warnCount}</button>}
                    {infoCount > 0 && <button className="a11y-tag a11y-tag--info" onClick={() => handleBadgeClick('info')}>정보 {infoCount}</button>}
                  </>
                )
              }
            </div>

            {/* 좌우 분할 */}
            {messages.length > 0 && editedHtml !== null && (
              <div className="a11y-split">
                {/* 왼쪽: 결과 목록 */}
                <div className="a11y-panel-left">
                  <ul className="a11y-msg-list">
                    {sortedMessages.map((msg, i) => {
                      const type = getMsgType(msg);
                      const rem = getRemediation(msg.message) ?? aiRemediations[msg.message] ?? null;
                      const lineNum = msg.lastLine ?? msg.firstLine;
                      const isActive = activeMsgIdx === i;
                      return (
                        <li
                          key={i}
                          ref={el => { msgItemRefs.current[i] = el; }}
                          className={`a11y-msg a11y-msg--${type}${isActive ? ' is-active' : ''}`}
                          onClick={() => handleMsgClick(msg, i)}
                        >
                          <span className="a11y-msg-badge">
                            {type === 'error' ? '오류' : type === 'warning' ? '경고' : '정보'}
                          </span>
                          <div className="a11y-msg-body">
                            <p className="a11y-msg-text">
                              {getMessageKo(msg.message) || translations[msg.message] || msg.message}
                            </p>
                            {lineNum && <span className="a11y-msg-loc">{lineNum}행{msg.lastColumn ? ` ${msg.lastColumn}열` : ''}</span>}
                            {msg.extract && <code className="a11y-msg-extract">{msg.extract}</code>}
                            {rem && (
                              <div className="a11y-remediation">
                                <div className="a11y-rem-row">
                                  <span className="a11y-rem-label a11y-rem-label--problem">문제</span>
                                  <pre className="a11y-rem-pre">{rem.problem}</pre>
                                </div>
                                <div className="a11y-rem-row">
                                  <span className="a11y-rem-label a11y-rem-label--fix">조치</span>
                                  <pre className="a11y-rem-pre">{rem.fix}</pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                {/* 오른쪽: 소스 뷰어 */}
                <div className="a11y-panel-right">
                  <SourceViewer
                    html={editedHtml}
                    messages={messages}
                    onHtmlChange={handleHtmlChange}
                    activeLineNum={activeLineNum}
                    translations={translations}
                    aiRemediations={aiRemediations}
                  />
                </div>
              </div>
            )}

            {/* 오류 없을 때 소스만 표시 */}
            {messages.length === 0 && editedHtml !== null && (
              <SourceViewer
                html={editedHtml}
                messages={messages}
                onHtmlChange={handleHtmlChange}
                activeLineNum={null}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
