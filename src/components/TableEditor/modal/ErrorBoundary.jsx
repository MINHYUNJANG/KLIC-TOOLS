import React from 'react';
import layout from '../layout.module.css';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Editor Error Caught by Boundary:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className={layout.errorBox}>
                    <p>에디터를 렌더링하는 중 오류가 발생했습니다.</p>
                    <button onClick={() => this.setState({ hasError: false })} className={layout.errorBtn}>다시 시도</button>
                </div>
            );
        }
        return this.props.children;
    }
}
