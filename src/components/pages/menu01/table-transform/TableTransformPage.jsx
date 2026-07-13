import TableEditorLoader from '../../../TableEditor/TableEditorLoader';

export default function TableTransformPage() {
    return (
        <main className="table-transform-page">
            <div className="table-transform-page-inner">
                <div className="table-transform-title-row">
                    <h2 className="crawl-title">테이블 변환도구</h2>
                </div>
                <div className="table-transform-editor">
                    <TableEditorLoader />
                </div>
            </div>
        </main>
    );
}
