import type { Provider } from '@angular/core';
import { classJoinValueHandler } from './handlers/class.value-handlers';
import { concatValueHandler } from './handlers/concat.value-handlers';
import { envOrValueHandler, envValueHandler } from './handlers/env.value-handlers';
import { i18nValueHandler } from './handlers/i18n.value-handlers';
import { i18nGetIndexValueHandler } from './handlers/i18nGetIndex.value-handlers';
import { i18nParamsValueHandler } from './handlers/i18nParams.value-handlers';
import { jsonValueHandler } from './handlers/json.value-handlers';
import { langPickValueHandler, languageValueHandler } from './handlers/language.value-handlers';
import { literalValueHandler } from './handlers/literal.value-handlers';
import { scopeOrValueHandler, scopeValueHandler } from './handlers/scope.value-handlers';
import { numberClampValueHandler, statsFormatVarValueHandler } from './handlers/stats.value-handlers';
import { coalesceValueHandler, lowerValueHandler, upperValueHandler } from './handlers/string.value-handlers';
import { themePickValueHandler, themeValueHandler } from './handlers/theme.value-handlers';
import { variableOrValueHandler, variableValueHandler } from './handlers/variable.value-handlers';
import { VALUE_HANDLERS } from './value-handlers.token';

export const provideValueHandlers = (): Provider[] => {
    return [
        { provide: VALUE_HANDLERS, multi: true, useFactory: i18nValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: i18nGetIndexValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: i18nParamsValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: literalValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: concatValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: jsonValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: classJoinValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: coalesceValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: upperValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: lowerValueHandler },

        { provide: VALUE_HANDLERS, multi: true, useFactory: languageValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: langPickValueHandler },

        { provide: VALUE_HANDLERS, multi: true, useFactory: themeValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: themePickValueHandler },

        { provide: VALUE_HANDLERS, multi: true, useFactory: envValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: envOrValueHandler },

        { provide: VALUE_HANDLERS, multi: true, useFactory: scopeValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: scopeOrValueHandler },

        { provide: VALUE_HANDLERS, multi: true, useFactory: variableValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: variableOrValueHandler },

        { provide: VALUE_HANDLERS, multi: true, useFactory: numberClampValueHandler },
        { provide: VALUE_HANDLERS, multi: true, useFactory: statsFormatVarValueHandler },
    ];
};
