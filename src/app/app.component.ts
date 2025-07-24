/**
 * App Component
 *
 * Main application component with proper typing and service integration.
 * Following MANDATORY requirements: Angular 17+, type-only definitions, atomic structure.
 */

import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  afterNextRender,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { LanguageService } from './core/services/language.service';
import {
  AppContainerComponent,
  AppHeaderComponent,
  AppFooterComponent,
} from './core/components/layout';
import { environment } from '../environments/environment';
import { NgxAngoraService } from 'ngx-angora-css';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    AppContainerComponent,
    AppHeaderComponent,
    AppFooterComponent,
  ],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // Injected services
  private readonly themeService = inject(ThemeService);
  private readonly languageService = inject(LanguageService);
  private readonly _ank = inject(NgxAngoraService);

  // App state
  private readonly appTitle = signal<string>(environment.app.name);

  // Computed properties with proper typing
  readonly title = computed(() => this.appTitle());
  readonly currentLanguage = computed(() =>
    this.languageService.currentLanguage()
  );
  readonly currentTheme = computed(() => this.themeService.getCurrentTheme());
  readonly isProduction = computed(() => environment.production);

  constructor() {
    afterNextRender(() => {
      // this._ank.changeDebugOption();
      this._ank.cssCreate();
    });
  }
}
