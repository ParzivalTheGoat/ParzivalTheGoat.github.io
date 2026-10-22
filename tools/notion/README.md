# 从 Notion 发布文章

在 Notion 里写，勾上「发布」，网站每小时自动把文章拉下来：正文转成 Markdown 存进 `src/content/blog/`，图片压成 WebP 存进 `public/images/posts/`，提交后自动部署。没勾「发布」的草稿只留在 Notion，不会进公开仓库。

## 文章数据库的字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| 标题 | 标题 | 必填 |
| 摘要 | 文本 | 必填，一句话说明这篇在讲什么 |
| 分类 | 单选 | 必填，只能是网站的六个分类之一：网络安全、Web 安全、AI、AI 安全、学习笔记、个人感悟 |
| 项目 | 单选 | 可选，同一个学习主题下的几篇笔记 |
| 标签 | 多选 | 可选，不能和分类同名 |
| 日期 | 日期 | 发布日期，不填就用创建日期 |
| 更新日期 | 日期 | 可选，大改之后填 |
| 网址 | 文本 | 可选，只用小写字母、数字和连字符，比如 `git-rebase`；不填就用日期 |
| 发布 | 勾选框 | 勾上才会出现在网站上；取消勾选，网站上的这篇也会删掉 |

正文里的标题会往下降一级（Notion 的一级标题变成网站的二级标题，因为文章标题已经是一级）。支持段落、标题、列表、待办、引用、提示框、折叠块、代码、公式、分割线、图片、表格和链接卡片；其他块会跳过，并写在同步记录里。

## 第一次设置

1. 打开 https://www.notion.so/profile/integrations ，新建一个 Internal 集成，名字随意（比如「博客同步」），权限只需要「读取内容」。复制它的密钥（`ntn_` 开头）。
2. 打开文章数据库，右上角 ⋯ → 连接（Connections）→ 选上刚建的集成。
3. 复制数据库的 ID：数据库链接里 `notion.so/` 后面、`?v=` 前面那串 32 位字符。
4. 在 GitHub 仓库的 Settings → Secrets and variables → Actions 里新建两个密钥：`NOTION_TOKEN`（第 1 步的密钥）和 `NOTION_DATABASE_ID`（第 3 步的 ID）。
5. 在仓库的 Actions 页面找到「Sync posts from Notion」，点 Run workflow 跑一次。

之后每小时整点后 17 分自动同步一次；想马上发布就再手动跑一次。每次运行的摘要里会写更新了哪几篇、哪篇因为什么没同步。

## 在自己电脑上同步

```bash
NOTION_TOKEN=ntn_… NOTION_DATABASE_ID=… pnpm notion
```

Windows PowerShell 里先 `$env:NOTION_TOKEN="ntn_…"`、`$env:NOTION_DATABASE_ID="…"`，再 `pnpm notion`。
