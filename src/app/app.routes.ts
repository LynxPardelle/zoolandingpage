import { Routes } from '@angular/router';
import { LandingPageComponent } from './landingpage/landing.page';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    component: LandingPageComponent,
    title: 'Landing Page Optimizada',
  },
  // future routes could go here
];
