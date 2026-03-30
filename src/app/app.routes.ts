import { Routes } from '@angular/router';
import { AppShellComponent } from './core/components/app-shell/app-shell.component';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: AppShellComponent,
  },
  {
    path: '**',
    component: AppShellComponent,
  },
];
