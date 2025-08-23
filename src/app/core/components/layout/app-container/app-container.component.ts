/**
 * AppContainer Component
 *
 * Main content wrapper with responsive breakpoints and consistent spacing.
 * MANDATORY: Uses ngx-angora-css, signals, and latest Angular features.
 * File kept under 80 lines following atomic structure requirements.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  APP_CONTAINER_DEFAULTS,
  BASE_CONTAINER_CLASSES,
  CONTAINER_ALIGNMENT_CLASSES,
  CONTAINER_SIZE_CLASSES,
} from './app-container.constants';
import { ContainerAlignment, ContainerSize } from './app-container.types';

@Component({
  selector: 'app-container',
  imports: [CommonModule],
  templateUrl: './app-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppContainerComponent {
  // Input signals with proper typing (MANDATORY Angular 17+ features)
  readonly size = input<ContainerSize>(APP_CONTAINER_DEFAULTS.size);
  readonly alignment = input<ContainerAlignment>(APP_CONTAINER_DEFAULTS.alignment);
  readonly className = input<string>(APP_CONTAINER_DEFAULTS.className);

  // Computed classes using ngx-angora-css utilities
  readonly containerClasses = computed(() => {
    const currentSize: ContainerSize = this.size();
    const currentAlignment: ContainerAlignment = this.alignment();
    const customClassName: string = this.className();

    const sizeClass: string = CONTAINER_SIZE_CLASSES[currentSize];
    const alignmentClass: string = CONTAINER_ALIGNMENT_CLASSES[currentAlignment];

    const allClasses: string[] = [...BASE_CONTAINER_CLASSES, sizeClass, alignmentClass, customClassName].filter(
      Boolean
    );

    const joinedClasses: string = allClasses.join(' ');
    return joinedClasses;
  });
}
