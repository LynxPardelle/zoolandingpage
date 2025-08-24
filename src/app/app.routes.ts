import { Routes } from '@angular/router';
import { LandingPageComponent } from './landing-page/components/landing-page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingPageComponent,
    title: 'Landing Page Optimizada',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
