/**
 * AppSection Component
 * 
 * Reusable section wrapper with theme support and consistent spacing.
 * MANDATORY: Uses ngx-angora-css pushColor for theme-aware backgrounds.
 * File kept under 80 lines following atomic structure requirements.
 */

import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SectionSpacing, SectionVariant } from './app-section.types';
import { 
  APP_SECTION_DEFAULTS,
  SECTION_SPACING_CLASSES,
  SECTION_VARIANT_CLASSES,
  BASE_SECTION_CLASSES
} from './app-section.constants';

@Component({
  selector: 'app-section',
  imports: [CommonModule],
  templateUrl: './app-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppSectionComponent {  
  // Input signals (MANDATORY Angular 17+ features)
  readonly variant = input<SectionVariant>(APP_SECTION_DEFAULTS.variant);
  readonly spacing = input<SectionSpacing>(APP_SECTION_DEFAULTS.spacing);
  readonly className = input<string>(APP_SECTION_DEFAULTS.className);

  // Computed classes using ngx-angora-css utilities
  readonly sectionClasses = computed(() => {
    const currentVariant: SectionVariant = this.variant();
    const currentSpacing: SectionSpacing = this.spacing();
    const customClassName: string = this.className();
    
    const variantClass: string = SECTION_VARIANT_CLASSES[currentVariant];
    const spacingClass: string = SECTION_SPACING_CLASSES[currentSpacing];

    const allClasses: string[] = [
      ...BASE_SECTION_CLASSES,
      variantClass,
      spacingClass,
      customClassName
    ].filter(Boolean);

    const joinedClasses: string = allClasses.join(' ');
    return joinedClasses;
  });
}
