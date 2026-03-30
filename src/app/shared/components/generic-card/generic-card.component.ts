import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../services/i18n.service';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GENERIC_CARD_ANIMATIONS } from './generic-card.styles';
import { TGenericCardConfig } from './generic-card.types';

@Component({
    selector: 'generic-card',
    imports: [CommonModule, MatIconModule, GenericButtonComponent],
    templateUrl: './generic-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: GENERIC_CARD_ANIMATIONS,
})
export class GenericCardComponent {
    private readonly i18n = inject(I18nService);
    private readonly _config = signal<TGenericCardConfig>({});

    @Input()
    get config(): TGenericCardConfig {
        return this._config();
    }

    set config(value: TGenericCardConfig) {
        this._config.set(value ?? {});
    }

    readonly variant = computed(() => resolveDynamicValue(this._config().variant) === 'testimonial' ? 'testimonial' : 'feature');
    readonly isTestimonial = computed(() => this.variant() === 'testimonial');
    readonly classes = computed(() => String(resolveDynamicValue(this._config().classes) ?? '').trim());
    readonly buttonClasses = computed(() => String(resolveDynamicValue(this._config().buttonClasses) ?? '').trim());

    readonly icon = computed(() => resolveDynamicValue(this._config().icon) ?? '');
    readonly title = computed(() => String(resolveDynamicValue(this._config().title) ?? ''));
    readonly description = computed(() => String(resolveDynamicValue(this._config().description) ?? ''));
    readonly benefits = computed<readonly string[]>(() => resolveDynamicValue(this._config().benefits) ?? []);
    readonly buttonLabel = computed(() => String(resolveDynamicValue(this._config().buttonLabel) ?? ''));

    readonly name = computed(() => String(resolveDynamicValue(this._config().name) ?? ''));
    readonly role = computed(() => String(resolveDynamicValue(this._config().role) ?? ''));
    readonly company = computed(() => String(resolveDynamicValue(this._config().company) ?? ''));
    readonly content = computed(() => String(resolveDynamicValue(this._config().content) ?? ''));
    readonly rating = computed(() => Number(resolveDynamicValue(this._config().rating) ?? 0));
    readonly avatar = computed(() => String(resolveDynamicValue(this._config().avatar) ?? ''));
    readonly verified = computed(() => Boolean(resolveDynamicValue(this._config().verified) ?? false));
    readonly stars = computed(() => [1, 2, 3, 4, 5]);
    readonly verifiedLabel = computed(() => this.i18n.t('ui.common.verified'));
    readonly classValue = (key: keyof TGenericCardConfig): string => String(resolveDynamicValue(this._config()[key] as never) ?? '').trim();

    readonly onButtonPressed = (_event?: MouseEvent): void => {
        this._config().onCta?.(this.title());
    };
}
