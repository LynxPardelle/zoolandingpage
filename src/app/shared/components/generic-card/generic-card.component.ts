import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { I18nService } from '../../services/i18n.service';
import { resolveDynamicValue } from '../../utility/component-orchestrator.utility';
import { GenericButtonComponent } from '../generic-button/generic-button.component';
import { GENERIC_CARD_ANIMATIONS } from './generic-card.styles';
import { DEFAULT_GENERIC_CARD_CONFIG, TGenericCardConfig } from './generic-card.types';

@Component({
    selector: 'generic-card',
    imports: [CommonModule, MatIconModule, GenericButtonComponent],
    templateUrl: './generic-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: GENERIC_CARD_ANIMATIONS,
})
export class GenericCardComponent {
    private readonly i18n = inject(I18nService);
    private readonly _config = signal<TGenericCardConfig>(DEFAULT_GENERIC_CARD_CONFIG);

    @Input()
    get config(): TGenericCardConfig {
        return this._config();
    }

    set config(value: TGenericCardConfig) {
        this._config.set({ ...DEFAULT_GENERIC_CARD_CONFIG, ...(value ?? {}) });
    }

    readonly variant = computed(() => resolveDynamicValue(this._config().variant) || DEFAULT_GENERIC_CARD_CONFIG.variant);
    readonly isTestimonial = computed(() => this.variant() === 'testimonial');
    readonly classes = computed(() => resolveDynamicValue(this._config().classes) ?? DEFAULT_GENERIC_CARD_CONFIG.classes);
    readonly testimonialClasses = computed(() => {
        const base = 'ank-bg-secondaryBgColor ank-borderRadius-12px ank-p-32px cardHover ank-border-1px ank-borderColor-border';
        const extra = this.classes().trim();
        return extra ? `${ base } ${ extra }` : base;
    });

    readonly icon = computed(() => resolveDynamicValue(this._config().icon) ?? '');
    readonly title = computed(() => resolveDynamicValue(this._config().title) ?? DEFAULT_GENERIC_CARD_CONFIG.title);
    readonly description = computed(() => resolveDynamicValue(this._config().description) ?? DEFAULT_GENERIC_CARD_CONFIG.description);
    readonly benefits = computed<readonly string[]>(() => resolveDynamicValue(this._config().benefits) ?? DEFAULT_GENERIC_CARD_CONFIG.benefits);
    readonly buttonLabel = computed(() => resolveDynamicValue(this._config().buttonLabel) ?? DEFAULT_GENERIC_CARD_CONFIG.buttonLabel);

    readonly name = computed(() => resolveDynamicValue(this._config().name) ?? DEFAULT_GENERIC_CARD_CONFIG.name);
    readonly role = computed(() => resolveDynamicValue(this._config().role) ?? DEFAULT_GENERIC_CARD_CONFIG.role);
    readonly company = computed(() => resolveDynamicValue(this._config().company) ?? DEFAULT_GENERIC_CARD_CONFIG.company);
    readonly content = computed(() => resolveDynamicValue(this._config().content) ?? DEFAULT_GENERIC_CARD_CONFIG.content);
    readonly rating = computed(() => resolveDynamicValue(this._config().rating) ?? DEFAULT_GENERIC_CARD_CONFIG.rating);
    readonly avatar = computed(() => resolveDynamicValue(this._config().avatar) ?? DEFAULT_GENERIC_CARD_CONFIG.avatar);
    readonly verified = computed(() => resolveDynamicValue(this._config().verified) ?? DEFAULT_GENERIC_CARD_CONFIG.verified);
    readonly stars = computed(() => [1, 2, 3, 4, 5]);
    readonly verifiedLabel = computed(() => this.i18n.t('ui.common.verified'));

    readonly onButtonPressed = (_event?: MouseEvent): void => {
        this._config().onCta?.(this.title());
    };
}
