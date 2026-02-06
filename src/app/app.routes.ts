import { Routes } from '@angular/router';
import { AppShellComponent } from './core/components/layout/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AppShellComponent,
    title: 'Landing Page Optimizada',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
