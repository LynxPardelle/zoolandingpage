import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { config } from './app/app.config.server';
import { AppShellComponent } from './app/core/components/layout/app-shell/app-shell.component';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppShellComponent, config, context);

export default bootstrap;
