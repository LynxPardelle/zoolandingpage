// 🎯 Guía de Path Aliases para ZooLandingPage
//
// Esta configuración permite usar imports más limpios y mantenibles:

// ❌ Imports relativos largos (EVITAR):
// import { ThemeService } from '../../../core/services/theme.service';
// import { AppHeaderComponent } from '../../../core/components/layout/app-header/app-header.component';
// import { LayoutTypes } from '../../../core/types/layout.types';

// ✅ Imports con aliases (RECOMENDADO):
// import { ThemeService } from '@services/theme.service';
// import { AppHeaderComponent } from '@components/layout/app-header/app-header.component';
// import { LayoutTypes } from '@types/layout.types';

// 📚 Aliases Disponibles:
//
// @core/*         → src/app/core/*
// @shared/*       → src/app/shared/*
// @components/*   → src/app/core/components/*
// @services/*     → src/app/core/services/*
// @types/*        → src/app/core/types/*
// @environments/* → src/environments/*
// @/*             → src/*

// 🚀 Ejemplos de uso en diferentes contextos:

// En un componente:
// import { Component } from '@angular/core';
// import { ThemeService } from '@services/theme.service';
// import { LanguageService } from '@services/language.service';

// En un servicio:
// import { Injectable } from '@angular/core';
// import { ThemeMode } from '@types/theme.types';
// import { environment } from '@environments/environment';

// En tipos/interfaces:
// import type { AppHeaderConfig } from '@types/layout.types';
// import type { NavigationItem } from '@types/navigation.types';

// 💡 Tips para autocompletado óptimo:
//
// 1. Después de instalar nuevos paquetes, ejecuta:
//    make sync-deps
//
// 2. Para recargar la configuración de TypeScript:
//    Ctrl+Shift+P → TypeScript: Restart TS Server
//
// 3. Para verificar que los paths funcionan:
//    - El autocompletado debe sugerir archivos correctamente
//    - No debe haber errores de importación
//    - Cmd+Click debe navegar al archivo correcto

export default {};
