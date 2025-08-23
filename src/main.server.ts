import { bootstrapApplication } from '@angular/platform-browser';
import { config } from './app/app.config.server';
import { AppShellComponent } from './app/core/components/layout';

const bootstrap = () => bootstrapApplication(AppShellComponent, config);

export default bootstrap;
