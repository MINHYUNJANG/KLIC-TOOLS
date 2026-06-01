import React from 'react';
import dynamic from 'next/dynamic';
import layout from './layout.module.css';

const TableEditor = dynamic(() => import('./TableEditor'), {
    ssr: false,
    loading: () => <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#999', fontSize: '0.9rem' }}>에디터 로딩중...</div>
});

export default function TableEditorLoader() {
    return (
        <div className={layout.bgWrap}>
            <div className={`${layout.container} ${layout.overflowNone}`}>
                <TableEditor />
            </div>
        </div>
    );
}
