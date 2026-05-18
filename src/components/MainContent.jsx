import Home from './pages/Home';
import UrlCrawlMarkup from './pages/UrlCrawlMarkup';
import BatchMarkupPage from './pages/BatchMarkupPage';
import FigmaMarkupPage from './pages/FigmaMarkupPage';
import CanvasEditorPage from './pages/CanvasEditorPage';
import WebStandardPage from './pages/WebStandardPage';
import WebAccessibilityPage from './pages/WebAccessibilityPage';

export default function MainContent({ currentPage, setCurrentPage }) {
  if (currentPage === 'URL 크롤링 마크업') return <UrlCrawlMarkup />;
  if (currentPage === '콘텐츠 일괄 마크업') return <BatchMarkupPage />;
  if (currentPage === '피그마 마크업') return <FigmaMarkupPage />;
  if (currentPage === 'KL캔버스') return <CanvasEditorPage />;
  if (currentPage === '웹표준검사') return <WebStandardPage />;
  if (currentPage === '웹접근성검사') return <WebAccessibilityPage />;

  return <Home setCurrentPage={setCurrentPage} />;
}
