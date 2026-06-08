import { TestBed } from '@angular/core/testing';
import { BlogPublicFacade } from './blog.facade';

describe('blog public signal state', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('normalizes published posts by id and keeps load status explicit', () => {
        TestBed.configureTestingModule({});
        const blog = TestBed.inject(BlogPublicFacade);

        blog.setPosts(
            {
                draftDomain: 'zoolandingpage.com.mx',
                pageId: 'default',
            },
            [
                {
                    id: 'post-2',
                    slug: 'signal-state-foundation',
                    title: 'Signal state foundation',
                    excerpt: 'State foundation',
                    publishedAt: '2026-06-07T12:00:00-06:00',
                    authorName: 'Alec',
                    tags: ['angular'],
                },
                {
                    id: 'post-1',
                    slug: 'auth-foundation',
                    title: 'Auth foundation',
                    excerpt: 'Auth base',
                    publishedAt: '2026-06-06T12:00:00-06:00',
                    authorName: 'Alec',
                    tags: ['auth'],
                },
            ],
        );

        expect(blog.status()).toBe('success');
        expect(blog.posts()).toEqual([
            jasmine.objectContaining({ id: 'post-2', slug: 'signal-state-foundation' }),
            jasmine.objectContaining({ id: 'post-1', slug: 'auth-foundation' }),
        ]);
        expect(blog.source()).toEqual({
            draftDomain: 'zoolandingpage.com.mx',
            pageId: 'default',
        });
    });
});
