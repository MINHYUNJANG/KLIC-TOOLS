const template03 = {
  id: 'highlight-banner',
  label: '강조 배너형',
  desc: '강조 문구, 아이디어 아이콘, 로고 이미지, 체크 목록을 조합합니다.',
  icon: '💡',
  imageSrc: '/logo.png',
  markup: {
    category: 'list',
    label: '체크 목록',
    html: '<ul class="check-list">\n  <li>핵심 내용 1</li>\n  <li>핵심 내용 2</li>\n  <li>확인 사항</li>\n</ul>',
    width: 360,
    height: 170,
  },
  text: {
    value: '꼭 확인해주세요111',
    size: 44,
    color: '#be123c',
    yOffset: -165,
  },
};

export default template03;
