// 读 Notion 的最小客户端：查数据库、取页面内容块。只读，不写回 Notion。

const API = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';

export function createNotion(token, { fetch: fetchImpl = fetch } = {}) {
  async function call(method, path, body) {
    for (let attempt = 0; ; attempt += 1) {
      const response = await fetchImpl(`${API}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${token}`,
          'notion-version': VERSION,
          ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      // 限流或临时故障：按 Notion 给的等待时间重试几次。
      if ((response.status === 429 || response.status >= 500) && attempt < 4) {
        const wait = Number(response.headers.get('retry-after')) || 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, wait * 1000));
        continue;
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Notion 返回 ${response.status}：${data.message ?? response.statusText}`);
      return data;
    }
  }

  async function* paginate(method, path, body = {}) {
    let cursor;
    do {
      const query = method === 'GET' && cursor ? `${path.includes('?') ? '&' : '?'}start_cursor=${cursor}` : '';
      const data = await call(method, path + query, method === 'GET' ? undefined : { ...body, ...(cursor ? { start_cursor: cursor } : {}) });
      yield* data.results;
      cursor = data.has_more ? data.next_cursor : undefined;
    } while (cursor);
  }

  return {
    /** 数据库里所有页面（含未发布的），由调用方筛选。 */
    async queryDatabase(databaseId) {
      const pages = [];
      for await (const page of paginate('POST', `/databases/${databaseId}/query`, { page_size: 100 })) pages.push(page);
      return pages;
    },

    /** 页面的全部内容块，子块放进 block.children。 */
    async blocks(blockId) {
      const blocks = [];
      for await (const block of paginate('GET', `/blocks/${blockId}/children?page_size=100`)) {
        // 子页面和子数据库是独立页面，不展开进文章。
        if (block.has_children && block.type !== 'child_page' && block.type !== 'child_database') {
          block.children = await this.blocks(block.id);
        }
        blocks.push(block);
      }
      return blocks;
    },
  };
}
