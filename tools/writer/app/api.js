async function request(method, path, body, headers = { 'content-type': 'application/json' }) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : headers,
    body: body === undefined ? undefined : headers['content-type'] === 'application/json' ? JSON.stringify(body) : body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `请求失败（${response.status}）`);
  return data;
}

const post = (slug) => `/api/posts/${encodeURIComponent(slug)}`;

export const api = {
  meta: () => request('GET', '/api/meta'),
  listPosts: () => request('GET', '/api/posts'),
  createPost: (template, project) => request('POST', '/api/posts', { template, project }),
  getPost: (slug) => request('GET', post(slug)),
  savePost: (slug, data) => request('PUT', post(slug), data),
  deletePost: (slug) => request('DELETE', post(slug)),
  rename: (slug, to) => request('POST', `${post(slug)}/rename`, { to }),
  uploadImage: (slug, file) => request('POST', `${post(slug)}/images`, file, { 'content-type': file.type || 'application/octet-stream' }),
  publish: (slug, data) => request('POST', `${post(slug)}/publish`, data),
  unpublish: (slug) => request('POST', `${post(slug)}/unpublish`),
  syncStatus: () => request('GET', '/api/sync'),
  sync: () => request('POST', '/api/sync'),
};
