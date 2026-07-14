import Home from './pages/Home';
import BatchMarkupPage from './pages/BatchMarkupPage';
import FigmaMarkupPage from './pages/FigmaMarkupPage';
import WebCheckPage from './pages/WebCheckPage';
import UrlCrawlMarkup from './pages/menu01/school-integrated/UrlCrawlMarkup';
import FigmaMarkupV2Page from './pages/menu01/mcp-markup/FigmaMarkupV2Page';
import TableTransformPage from './pages/menu01/table-transform/TableTransformPage';
import KLContentBuilderPage from './pages/menu02/main/KLContentBuilderPage';
import TemplateBuilderPage from './pages/menu02/template-builder/TemplateBuilderPage';
import ContentBuilderPage from './pages/menu02/content-builder/ContentBuilderPage';
import GoalBuilderPage from './pages/menu02/goal-builder/GoalBuilderPage';
import OrganizationBuilderPage from './pages/menu02/organization-builder/OrganizationBuilderPage';
import LocationBuilderPage from './pages/menu02/location-builder/LocationBuilderPage';
import WebStandardPage from './pages/menu03/web-standard/WebStandardPage';
import WebAccessibilityPage from './pages/menu03/web-accessibility/WebAccessibilityPage';
import AltTextPage from './pages/menu03/alt-text/AltTextPage';

export default function MainContent({ currentPage, setCurrentPage }) {
  if (currentPage === 'school-integrated-markup') return <UrlCrawlMarkup />;
  if (currentPage === '콘텐츠 일괄 마크업') return <BatchMarkupPage />;
  if (currentPage === '피그마 마크업') return <FigmaMarkupPage />;
  if (currentPage === 'mcp-markup') return <FigmaMarkupV2Page />;
  if (currentPage === 'cms-builder') return <KLContentBuilderPage />;
  if (currentPage === 'template-builder') return <TemplateBuilderPage />;
  if (['greeting-builder', 'history-builder', 'principal-builder', 'symbol-builder'].includes(currentPage)) return <TemplateBuilderPage />;
  if (currentPage === 'content-builder') return <ContentBuilderPage />;
  if (currentPage === 'goal-builder') return <GoalBuilderPage />;
  if (currentPage === 'organization-builder') return <OrganizationBuilderPage />;
  if (currentPage === 'location-builder') return <LocationBuilderPage />;
  if (currentPage === '웹검사도구') return <WebCheckPage setCurrentPage={setCurrentPage} />;
  if (currentPage === 'table-transform') return <TableTransformPage />;
  if (currentPage === 'web-standard') return <WebStandardPage />;
  if (currentPage === 'web-accessibility') return <WebAccessibilityPage />;
  if (currentPage === 'alt-text') return <AltTextPage />;

  return <Home setCurrentPage={setCurrentPage} />;
}
