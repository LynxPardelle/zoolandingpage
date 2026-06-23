import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import { InteractionScopeService } from '../interaction-scope/interaction-scope.service';
import type {
  TGenericFileDropzoneConfig,
  TGenericFileDropzoneFileSummary,
  TGenericFileDropzoneRejectedFile,
  TGenericFileDropzoneValueChange,
} from './generic-file-dropzone.types';

@Component({
  selector: 'generic-file-dropzone',
  standalone: true,
  imports: [CommonModule],
  host: {
    '[attr.data-zlp-file-dropzone-id]': 'fieldId()',
    '[class]': 'classes()',
  },
  templateUrl: './generic-file-dropzone.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericFileDropzoneComponent {
  readonly config = input.required<TGenericFileDropzoneConfig>();
  readonly valueChanged = output<TGenericFileDropzoneValueChange>();
  readonly rejectedFiles = output<readonly TGenericFileDropzoneRejectedFile[]>();

  private readonly scope = inject(InteractionScopeService, { optional: true });
  private readonly filesState = signal<readonly File[]>([]);
  private readonly dragActiveState = signal(false);

  constructor() {
    effect(() => {
      const fieldId = this.fieldId();
      const disabled = this.disabled() || this.loading();
      untracked(() => {
        this.scope?.registerField({
          fieldId,
          initialValue: this.multiple() ? [] : null,
          required: false,
          disabled,
          readOnly: disabled,
        });
      });
    });
  }

  readonly id = computed(() => this.asString(this.config().id) || this.fieldId());
  readonly fieldId = computed(() => String(this.config().fieldId ?? '').trim());
  readonly label = computed(() => this.asString(this.config().label));
  readonly description = computed(() => this.asString(this.config().description));
  readonly helperText = computed(() => this.asString(this.config().helperText));
  readonly dropLabel = computed(() => this.asString(this.config().dropLabel) || 'Drop files here');
  readonly browseLabel = computed(() => this.asString(this.config().browseLabel) || 'Choose files');
  readonly emptyText = computed(() => this.asString(this.config().emptyText) || 'No files selected');
  readonly accept = computed(() => this.asString(this.config().accept));
  readonly acceptLabel = computed(() => this.asString(this.config().acceptLabel));
  readonly maxFileSizeBytes = computed(() => this.asNumber(this.config().maxFileSizeBytes));
  readonly maxSizeLabel = computed(() => this.asString(this.config().maxSizeLabel));
  readonly multiple = computed(() => this.asBoolean(this.config().multiple));
  readonly disabled = computed(() => this.asBoolean(this.config().disabled));
  readonly loading = computed(() => this.asBoolean(this.config().loading));
  readonly loadingText = computed(() => this.asString(this.config().loadingText) || 'Loading files');
  readonly errorText = computed(() => this.asString(this.config().errorText));
  readonly classes = computed(() => this.asString(this.config().classes));
  readonly labelClasses = computed(() => this.asString(this.config().labelClasses));
  readonly descriptionClasses = computed(() => this.asString(this.config().descriptionClasses));
  readonly disabledDropzoneClasses = computed(() => this.asString(this.config().disabledDropzoneClasses));
  readonly activeDropzoneClasses = computed(() => this.asString(this.config().activeDropzoneClasses));
  readonly loadingClasses = computed(() => this.asString(this.config().loadingClasses));
  readonly errorClasses = computed(() => this.asString(this.config().errorClasses));
  readonly helperTextClasses = computed(() => this.asString(this.config().helperTextClasses));
  readonly fileListClasses = computed(() => this.asString(this.config().fileListClasses));
  readonly fileItemClasses = computed(() => this.asString(this.config().fileItemClasses));
  readonly browseButtonClasses = computed(() => this.asString(this.config().browseButtonClasses));
  readonly dropzoneClasses = computed(() => this.joinClasses(
    this.asString(this.config().dropzoneClasses),
    this.dragActiveState() ? this.activeDropzoneClasses() : '',
    this.disabled() || this.loading() ? this.disabledDropzoneClasses() : '',
  ));
  readonly fileSummaries = computed(() => this.filesState().map((file) => this.fileSummary(file)));

  onDragOver(event: DragEvent): void {
    if (this.disabled() || this.loading()) return;
    event.preventDefault();
    this.dragActiveState.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragActiveState.set(false);
  }

  onDrop(event: DragEvent): void {
    if (this.disabled() || this.loading()) return;
    event.preventDefault();
    this.dragActiveState.set(false);
    this.handleFiles(event.dataTransfer?.files ? Array.from(event.dataTransfer.files) : []);
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.handleFiles(input.files ? Array.from(input.files) : []);
    input.value = '';
  }

  openNativeFileDialog(input: HTMLInputElement): void {
    if (this.disabled() || this.loading()) return;
    input.click();
  }

  private handleFiles(files: readonly File[]): void {
    const accepted: File[] = [];
    const rejected: TGenericFileDropzoneRejectedFile[] = [];

    files.forEach((file, index) => {
      const reason = this.rejectionReason(file, index);
      if (reason) {
        rejected.push({ ...this.fileSummary(file), reason });
      } else {
        accepted.push(file);
      }
    });

    const nextFiles = this.multiple() ? accepted : accepted.slice(0, 1);
    this.filesState.set(nextFiles);
    this.scope?.setFieldValue(this.fieldId(), this.multiple() ? nextFiles : (nextFiles[0] ?? null), { markTouched: true });

    const event = {
      fieldId: this.fieldId(),
      files: nextFiles,
      fileSummaries: nextFiles.map((file) => this.fileSummary(file)),
      rejected,
    };
    this.valueChanged.emit(event);
    if (rejected.length > 0) {
      this.rejectedFiles.emit(rejected);
    }
  }

  private rejectionReason(file: File, index: number): TGenericFileDropzoneRejectedFile['reason'] | null {
    if (!this.multiple() && index > 0) return 'multipleDisabled';
    const maxSize = this.maxFileSizeBytes();
    if (maxSize !== undefined && file.size > maxSize) return 'maxSize';
    if (!this.fileMatchesAccept(file)) return 'accept';
    return null;
  }

  private fileMatchesAccept(file: File): boolean {
    const accept = this.accept()
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
    if (accept.length === 0) return true;

    const fileType = String(file.type ?? '').toLowerCase();
    const fileName = String(file.name ?? '').toLowerCase();
    return accept.some((rule) => {
      if (rule.endsWith('/*')) return fileType.startsWith(rule.slice(0, -1));
      if (rule.startsWith('.')) return fileName.endsWith(rule);
      return fileType === rule;
    });
  }

  private fileSummary(file: File): TGenericFileDropzoneFileSummary {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
    };
  }

  private asString(value: unknown): string {
    const resolved = resolveDynamicValue(value as never);
    return resolved == null ? '' : String(resolved);
  }

  private asNumber(value: unknown): number | undefined {
    const resolved = resolveDynamicValue(value as never);
    return typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : undefined;
  }

  private asBoolean(value: unknown): boolean {
    const resolved = resolveDynamicValue(value as never);
    if (typeof resolved === 'boolean') return resolved;
    if (resolved == null || resolved === '') return false;
    return !['false', '0', 'off', 'no'].includes(String(resolved).trim().toLowerCase());
  }

  private joinClasses(...values: readonly string[]): string {
    return values.map((entry) => entry.trim()).filter(Boolean).join(' ');
  }
}
