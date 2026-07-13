export default function BuilderPlaceholderPage({ title, iframeSrc }) {
  return (
    <main className="builder-placeholder-page">
      <div className="builder-placeholder-page-inner">
        {iframeSrc ? (
          <iframe
            className="builder-placeholder-iframe"
            src={iframeSrc}
            title={title}
          />
        ) : (
          <h2 className="crawl-title">{title}</h2>
        )}
      </div>
    </main>
  );
}
