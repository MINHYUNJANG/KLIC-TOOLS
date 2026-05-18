const VISUAL01_BG = '/templates/canvas/visual01-bg.png';
const VISUAL01_LOGO = '/templates/canvas/visual01-logo.png';
const VISUAL01_THUMB = '/templates/canvas/visual01-thumb.png';

const visualTextBase = {
  type: 'text',
  font: 'Pretendard',
  italic: false,
  underline: false,
  align: 'left',
};

const visual01 = {
  id: 'visual01',
  label: '수원교육 비주얼',
  category: 'visual',
  thumbnailSrc: VISUAL01_THUMB,
  canvasSize: { width: 1080, height: 465 },
  bgColor: '#ffffff',
  items: [
    {
      type: 'image',
      label: '배경',
      imageSrc: VISUAL01_BG,
      width: 1080,
      height: 465,
      x: 540,
      y: 232.5,
    },
    {
      type: 'image',
      label: '로고',
      imageSrc: VISUAL01_LOGO,
      width: 247,
      height: 44,
      x: 918.5,
      y: 72,
    },
    {
      ...visualTextBase,
      value: '전통과 미래의 어울림,',
      bold: true,
      size: 52,
      color: '#071d3c',
      x: 54,
      y: 111,
    },
    {
      ...visualTextBase,
      value: '새로운 수원교육',
      bold: true,
      size: 52,
      color: '#064b91',
      x: 54,
      y: 178,
    },
    {
      ...visualTextBase,
      value: '기본 인성과 기초 역량을 갖춘 미래인재 양성',
      bold: true,
      size: 27,
      color: '#333333',
      x: 54,
      y: 248,
    },
    {
      ...visualTextBase,
      value: '• 인성 기반 학생 맞춤형 진로교육',
      bold: false,
      size: 24,
      color: '#333333',
      x: 54,
      y: 310,
    },
    {
      ...visualTextBase,
      value: '• 디지털 기반 미래 역량 함양 교육',
      bold: false,
      size: 24,
      color: '#333333',
      x: 54,
      y: 346,
    },
  ],
};

export default visual01;
