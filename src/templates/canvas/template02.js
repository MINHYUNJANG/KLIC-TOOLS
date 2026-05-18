const template02 = {
  id: 'event-guide',
  label: '행사 안내형',
  desc: '행사 제목, 별 아이콘, 로고 이미지, 일정 표를 조합합니다.',
  icon: '⭐',
  imageSrc: '/logo.png',
  markup: {
    category: 'table',
    label: '일정 표',
    html: '<table class="schedule-table">\n  <tr><th>시간</th><th>프로그램</th></tr>\n  <tr><td>10:00</td><td>접수</td></tr>\n  <tr><td>10:30</td><td>행사 시작</td></tr>\n</table>',
    width: 400,
    height: 180,
  },
  text: {
    value: '학교 행사 안내',
    size: 44,
    color: '#0f766e',
    yOffset: -175,
  },
};

export default template02;
