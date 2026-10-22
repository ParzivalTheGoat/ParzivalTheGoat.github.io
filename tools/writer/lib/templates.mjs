// 模板只给提示问题，不预填任何正文。hint 只在编辑器里显示为灰字，不会写进文章。
export const TEMPLATES = [
  {
    id: 'log',
    name: '学习日志',
    hint: '查缺补漏、一次学完的小东西，几句话加截图就够',
    category: '学习笔记',
    prompts: [
      { heading: '今天学了什么', hint: '一两句话说清楚学的是什么' },
      { heading: '卡在哪', hint: '哪一步没想通？截图贴进来' },
      { heading: '怎么解决的', hint: '查了什么、试了什么，哪一下通了' },
      { heading: '我的收获', hint: '下次遇到同样的事，你会先想到什么' },
    ],
  },
  {
    id: 'essay',
    name: '长文',
    hint: '一个长期主题学完后的完整总结',
    category: '学习笔记',
    prompts: [
      { heading: '为什么学', hint: '是什么让你开始学这个' },
      { heading: '过程', hint: '按时间或按问题写都行，关键的地方配图' },
      { heading: '结论', hint: '现在你能确定的判断，以及还不确定的部分' },
      { heading: '我的收获', hint: '学完之后，你和之前有什么不一样' },
    ],
  },
  {
    id: 'blank',
    name: '空白',
    hint: '已经知道要写什么',
    category: '个人感悟',
    prompts: [],
  },
];

export const PROMPT_HINTS = Object.fromEntries(
  TEMPLATES.flatMap((template) => template.prompts.map((prompt) => [prompt.heading, prompt.hint])),
);
