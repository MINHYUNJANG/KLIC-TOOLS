const DEFAULT_STYLE = {
  titleBorderColor: '#dfe5ee',
  titleBackgroundColor: '#7989a2',
  titleTextColor: '#ffffff',
  titleFontWeight: '700',
  bodyBorderColor: '#dfe5ee',
  bodyBackgroundColor: '#ffffff',
  bodyTextColor: '#101010',
  bodyFontWeight: '400',
  connectorColor: '#333333',
  connectorSize: '1',
};

function html(element) {
  return element?.innerHTML?.trim() || '';
}

function createBlock(type, item) {
  return {
    id: 'block-1',
    type,
    columns: 1,
    columnMode: '1',
    marginTop: 0,
    marginBottom: 10,
    marginLeft: 0,
    marginRight: 0,
    blockIndent: false,
    blockWidth: '',
    blockAlign: '',
    items: [{ ...item, style: { ...DEFAULT_STYLE } }],
  };
}

function addParagraphFields(target, elements, prefix, start = 1) {
  Array.from(elements).forEach((element, index) => {
    target[`${prefix}${start + index}`] = html(element);
  });
}

function getSign(root, selector = '.sign') {
  return html(root.querySelector(selector));
}

function createTyA(root) {
  const item = {
    lead1: html(root.querySelector('.lead-wrap .inner > p')),
    sign1: getSign(root),
  };
  addParagraphFields(item, root.querySelectorAll('.txt-wrap .txt > p'), 'text', 2);
  return createBlock('greeting-tyA', item);
}

function createTyB(root) {
  const item = {
    heading1: html(root.querySelector('.lead-txt > h4')),
    lead1: html(root.querySelector('.lead-txt > p')),
    sign2: getSign(root),
  };
  addParagraphFields(item, root.querySelectorAll('.txt-wrap .txt > p'), 'text');
  return createBlock('greeting-tyB', item);
}

function createTyC(root) {
  const item = {
    heading1: html(root.querySelector('.lead-txt > h4')),
    sign2: getSign(root),
  };
  addParagraphFields(item, root.querySelectorAll('.txt-wrap .txt > p'), 'text');
  return createBlock('greeting-tyC', item);
}

function createTyCImage(root) {
  const second = root.querySelector('.container.second');
  const item = {
    heading1: html(root.querySelector('.lead-txt > h4')),
    leadTxt1: html(second?.querySelector('.s-lead-txt')),
    sign2: getSign(second || root),
  };

  Array.from(second?.querySelectorAll(':scope > .inner > ul > li') || []).forEach((element, index) => {
    item[`lstTxt${index + 1}`] = html(element);
  });
  addParagraphFields(
    item,
    second?.querySelectorAll('.txt-wrap .txt > p') || [],
    's_text'
  );
  return createBlock('greeting-tyC-img', item);
}

export function createGreetingKlicDocument(markup, templateId) {
  if (typeof window === 'undefined') throw new Error('브라우저에서만 변환할 수 있습니다.');

  const doc = new DOMParser().parseFromString(markup || '', 'text/html');
  const root = doc.querySelector('.greeting');
  if (!root) throw new Error('변환 결과에서 인사말 영역을 찾지 못했습니다.');

  let block;
  if (templateId === 'greeting-tyA') block = createTyA(root);
  else if (templateId === 'greeting-tyB') block = createTyB(root);
  else if (templateId === 'greeting-tyC-01') block = createTyC(root);
  else if (templateId === 'greeting-tyC-02') block = createTyCImage(root);
  else throw new Error('지원하지 않는 인사말 템플릿입니다.');

  return {
    schemaVersion: 1,
    app: 'klic-content-builder',
    savedAt: new Date().toISOString(),
    blocks: [block],
    overlays: [],
    templateVars: {},
    previewDevice: 'pc',
    theme: '',
    generatedMarkup: markup || '',
  };
}
