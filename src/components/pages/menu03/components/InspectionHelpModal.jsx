export default function InspectionHelpModal({ title, steps, onClose }) {
  return (
    <div className="inspection-help-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="inspection-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inspection-help-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="inspection-help-head">
          <div>
            <span>사용방법</span>
            <h3 id="inspection-help-title">{title}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="사용방법 닫기">×</button>
        </div>
        <ol className="inspection-help-steps">
          {steps.map(step => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="inspection-help-actions">
          <button type="button" onClick={onClose}>확인</button>
        </div>
      </section>
    </div>
  );
}
