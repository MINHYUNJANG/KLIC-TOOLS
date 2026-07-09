import fs from 'node:fs';
import path from 'node:path';

const sourceRoot = 'C:/Users/CUSTOMER/Desktop/해오라기/src/main/webapp/WEB-INF/jsp/nfu/ap/bd';
const outputRoot = 'C:/Users/CUSTOMER/Desktop/KlicTools_main/public/cms-builder';

const pageMap = [
  { input: 'contentsIndex.jsp', output: 'contents.html', title: '콘텐츠 빌더' },
  { input: 'goalIndex.jsp', output: 'goal.html', title: '교육목표 빌더' },
  { input: 'organIndex.jsp', output: 'organ.html', title: '조직도 빌더' },
  { input: 'mapIndex.jsp', output: 'map.html', title: '오시는길 빌더' },
  {
    input: 'tmplIndex.jsp',
    output: 'template.html',
    title: '템플릿 빌더',
    preset: 'contents',
    manifest: '/builder/template/templates/contents/manifest.json',
  },
  {
    input: 'tmplIndex.jsp',
    output: 'template-greeting.html',
    title: '인사말 템플릿 빌더',
    preset: 'greeting',
    manifest: '/builder/template/templates/greeting/manifest.json',
  },
  {
    input: 'tmplIndex.jsp',
    output: 'template-history.html',
    title: '연혁 템플릿 빌더',
    preset: 'history',
    manifest: '/builder/template/templates/history/manifest.json',
  },
  {
    input: 'tmplIndex.jsp',
    output: 'template-principal.html',
    title: '역대교장 템플릿 빌더',
    preset: 'principal',
    manifest: '/builder/template/templates/principal/manifest.json',
  },
  {
    input: 'tmplIndex.jsp',
    output: 'template-symbol.html',
    title: '학교상징 템플릿 빌더',
    preset: 'symbol',
    manifest: '/builder/template/templates/symbol/manifest.json',
  },
];

function readSource(fileName) {
  return fs.readFileSync(path.join(sourceRoot, fileName), 'utf8');
}

function stripJspScaffolding(source) {
  return source
    .replace(/<%[\s\S]*?%>\r?\n?/g, '')
    .replace(/<c:set\b[^>]*\/>\r?\n?/g, '')
    .replace(/<c:choose>[\s\S]*?<\/c:choose>\r?\n?/g, '')
    .replace(/<%@\s*include\s+file="\/WEB-INF\/jsp\/nfu\/co\/cf\/cntntsFileModalInclude\.jsp"\s*%>/g, '')
    .replace(/<c:if\b[^>]*>\r?\n?/g, '')
    .replace(/<\/c:if>\r?\n?/g, '')
    .replace(/<c:out\s+value="\$\{([^}]+)\}"\s*\/>/g, '${$1}')
    .replace(/\$\{empty builderHome \? '[^']+' : builderHome\}/g, '#')
    .replace(/\$\{builderHome\}/g, '#')
    .replace(/href="\/apple\/bd\/builder\/[^"]*"/g, 'href="#"');
}

function buildHeader(title) {
  return stripJspScaffolding(readSource('header.jsp'))
    .replace(/\$\{empty builderTitle \? '[^']+' : builderTitle\}/g, title)
    .replace(/\$\{builderTitle\}/g, title);
}

function applyPageValues(source, page) {
  const title = page.title;
  const preset = page.preset || '';
  const manifest = page.manifest || '';

  return source
    .replace(/\$\{builderTitle\}/g, title)
    .replace(/KLIC TOOLs - \$\{builderTitle\}/g, `KLIC TOOLs - ${title}`)
    .replace(/data-template-preset="\$\{templatePreset\}"/g, `data-template-preset="${preset}"`)
    .replace(/\$\{templatePreset\}/g, preset)
    .replace(/\$\{cntntsTypeVal\}/g, preset)
    .replace(/\$\{templateManifest\}/g, manifest)
    .replace(/\$\{visibleBlockFilters\}/g, 'all')
    .replace(/\$\{visibleDesignFilters\}/g, 'all')
    .replace(/\$\{defaultSidebarTab\}/g, 'blocks');
}

function tailorIframeChrome(source, page) {
  let html = source
    .replace(/\s*<button type="button" class="builder-expand-btn" id="builderExpandBtn"[\s\S]*?<\/button>/g, '')
    .replace(/\s*<button type="button" class="primary-button" id="builderRegisterButton"[\s\S]*?<\/button>/g, '');

  if (['goal.html', 'organ.html', 'map.html'].includes(page.output)) {
    html = html.replace(/\s*<div class="topbar-extra" id="topbarExtra">[\s\S]*?<\/div>\s*(?=<div class="topbar-actions">)/g, '\n');
  }

  return html;
}

function buildPage(page) {
  const header = buildHeader(page.title);
  const raw = readSource(page.input);
  const withoutHistoryOnlyStyle =
    page.preset === 'history'
      ? raw
      : raw.replace(/<c:if test="\$\{templatePreset eq 'history'\}">[\s\S]*?<\/c:if>/g, '');

  const html = tailorIframeChrome(applyPageValues(
    stripJspScaffolding(
      withoutHistoryOnlyStyle.replace(/<%@\s*include\s+file="header\.jsp"\s*%>/g, header),
    ).replace(/\r\n/g, '\n'),
    page,
  ), page);

  fs.writeFileSync(path.join(outputRoot, page.output), html, 'utf8');
}

fs.mkdirSync(outputRoot, { recursive: true });
for (const page of pageMap) {
  buildPage(page);
}
