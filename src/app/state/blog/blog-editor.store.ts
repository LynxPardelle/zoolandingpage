import { computed, Injectable, signal } from '@angular/core';
import { form as createSignalForm } from '@angular/forms/signals';
import type { TBlogEditorState } from './blog.models';

const initialBlogEditorState: TBlogEditorState = {
    draftId: null,
    draftDomain: null,
    title: '',
    bodyMarkdown: '',
    status: 'idle',
    lastSavedAt: null,
    error: null,
    isDirty: false,
};

const sensitivePattern = /\b(access[_-]?token|id[_-]?token|refresh[_-]?token|client[_-]?secret|api[_-]?key|password)\b/i;

@Injectable({ providedIn: 'root' })
export class BlogEditorStore {
    private readonly state = signal<TBlogEditorState>(initialBlogEditorState);
    private readonly formModel = signal({
        title: '',
        bodyMarkdown: '',
    });

    readonly editorForm = createSignalForm(this.formModel);
    readonly draftId = computed(() => this.state().draftId);
    readonly draftDomain = computed(() => this.state().draftDomain);
    readonly title = computed(() => this.formModel().title);
    readonly bodyMarkdown = computed(() => this.formModel().bodyMarkdown);
    readonly status = computed(() => this.state().status);
    readonly lastSavedAt = computed(() => this.state().lastSavedAt);
    readonly error = computed(() => this.state().error);
    readonly isDirty = computed(() => this.state().isDirty);
    readonly securityWarnings = computed(() => {
        const content = `${this.title()}\n${this.bodyMarkdown()}`;
        return sensitivePattern.test(content)
            ? ['Blog editor draft contains sensitive-looking credential text.']
            : [];
    });

    beginDraft(draft: {
        readonly draftId: string;
        readonly draftDomain: string;
        readonly title?: string;
        readonly bodyMarkdown?: string;
    }): void {
        const title = draft.title ?? '';
        const bodyMarkdown = draft.bodyMarkdown ?? '';
        this.formModel.set({ title, bodyMarkdown });
        this.state.set({
            draftId: draft.draftId,
            draftDomain: draft.draftDomain,
            title,
            bodyMarkdown,
            status: 'editing',
            lastSavedAt: null,
            error: null,
            isDirty: false,
        });
    }

    updateField(field: 'title' | 'bodyMarkdown', value: string): void {
        this.formModel.update((current) => ({
            ...current,
            [field]: value,
        }));
        this.state.update((current) => ({
            ...current,
            [field]: value,
            status: 'editing',
            isDirty: true,
        }));
    }

    markSaving(): void {
        this.state.update((current) => ({ ...current, status: 'saving', error: null }));
    }

    markSaved(savedAt: string): void {
        this.state.update((current) => ({
            ...current,
            status: 'saved',
            lastSavedAt: savedAt,
            error: null,
            isDirty: false,
        }));
    }

    markError(error: string): void {
        this.state.update((current) => ({ ...current, status: 'error', error }));
    }

    reset(): void {
        this.formModel.set({ title: '', bodyMarkdown: '' });
        this.state.set(initialBlogEditorState);
    }

    snapshot(): TBlogEditorState {
        return this.state();
    }
}
