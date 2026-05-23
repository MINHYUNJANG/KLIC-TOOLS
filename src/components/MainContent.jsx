import Home from './pages/Home';
import UrlCrawlMarkup from './pages/UrlCrawlMarkup';
import BatchMarkupPage from './pages/BatchMarkupPage';
import FigmaMarkupPage from './pages/FigmaMarkupPage';
import FigmaMarkupV2Page from './pages/FigmaMarkupV2Page';
import WebStandardPage from './pages/WebStandardPage';
import WebAccessibilityPage from './pages/WebAccessibilityPage';
import AltTextPage from './pages/AltTextPage';
import TableTransformPage from './pages/TableTransformPage';

export default function MainContent({ currentPage, setCurrentPage }) {
  if (currentPage === '크롤링 마크업') return <UrlCrawlMarkup />;
  if (currentPage === '콘텐츠 일괄 마크업') return <BatchMarkupPage />;
  if (currentPage === '피그마 마크업') return <FigmaMarkupPage />;
  if (currentPage === 'MCP 마크업') return <FigmaMarkupV2Page />;
  if (currentPage === '테이블 변환') return <TableTransformPage />;
  if (currentPage === '웹표준검사') return <WebStandardPage />;
  if (currentPage === '웹접근성검사') return <WebAccessibilityPage />;
  if (currentPage === '대체텍스트 생성') return <AltTextPage />;

  return <Home setCurrentPage={setCurrentPage} />;
}
