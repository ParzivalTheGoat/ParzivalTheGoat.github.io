import { describe, expect, it } from 'vitest';
import type { BlogPost } from '../../src/lib/posts';
import { buildPostPaths } from '../../src/lib/post-paths';

const post = (id: string) => ({ id, collection: 'blog', body: '', data: {} }) as BlogPost;

describe('buildPostPaths', () => {
  it('returns no article routes for an empty blog', () => {
    expect(buildPostPaths([])).toEqual([]);
  });

  it('maps newer and older neighbors from newest-first posts', () => {
    const paths = buildPostPaths([post('new'), post('middle'), post('old')]);
    expect(paths[1]!.props.newer?.id).toBe('new');
    expect(paths[1]!.props.older?.id).toBe('old');
  });
});
