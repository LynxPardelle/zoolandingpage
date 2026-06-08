import { computed, Injectable, signal } from '@angular/core';
import type { TBlogLoadStatus, TBlogPostSummary, TBlogPublicSource } from './blog.models';

type TBlogPublicState = {
    readonly posts: readonly TBlogPostSummary[];
    readonly status: TBlogLoadStatus;
    readonly source: TBlogPublicSource | null;
    readonly error: string | null;
};

const initialBlogPublicState: TBlogPublicState = {
    posts: [],
    status: 'idle',
    source: null,
    error: null,
};

function sortPublishedPosts(posts: readonly TBlogPostSummary[]): readonly TBlogPostSummary[] {
    return [...posts].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

@Injectable({ providedIn: 'root' })
export class BlogPublicFacade {
    private readonly state = signal<TBlogPublicState>(initialBlogPublicState);

    readonly posts = computed(() => this.state().posts);
    readonly status = computed(() => this.state().status);
    readonly source = computed(() => this.state().source);
    readonly error = computed(() => this.state().error);

    requestPosts(source: TBlogPublicSource): void {
        this.state.set({
            posts: [],
            status: 'loading',
            source,
            error: null,
        });
    }

    setPosts(source: TBlogPublicSource, posts: readonly TBlogPostSummary[]): void {
        const sortedPosts = sortPublishedPosts(posts);
        this.state.set({
            posts: sortedPosts,
            status: sortedPosts.length ? 'success' : 'empty',
            source,
            error: null,
        });
    }

    fail(source: TBlogPublicSource, error: string): void {
        this.state.set({
            posts: [],
            status: 'error',
            source,
            error,
        });
    }

    clear(): void {
        this.state.set(initialBlogPublicState);
    }

    snapshot(): TBlogPublicState {
        return this.state();
    }
}
