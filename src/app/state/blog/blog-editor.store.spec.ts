import { TestBed } from '@angular/core/testing';
import { BlogEditorStore } from './blog-editor.store';

describe('BlogEditorStore', () => {
    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
            providers: [BlogEditorStore],
        });
    });

    it('tracks local editor dirty state without persisting secrets or upload tokens', () => {
        const store = TestBed.inject(BlogEditorStore);

        store.beginDraft({
            draftId: 'draft-1',
            draftDomain: 'zoolandingpage.com.mx',
            title: 'Initial title',
            bodyMarkdown: '# Initial',
        });
        store.updateField('title', 'Updated title');

        expect(store.draftId()).toBe('draft-1');
        expect(store.title()).toBe('Updated title');
        expect(store.isDirty()).toBeTrue();
        expect(store.status()).toBe('editing');
        expect(store.securityWarnings()).toEqual([]);
        expect(Object.keys(store.snapshot()).join('|')).not.toContain('token');
        expect(Object.keys(store.snapshot()).join('|')).not.toContain('secret');
    });
});
