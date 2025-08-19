/* Singletons */
import { ValuesSingleton } from '../singletons/valuesSingleton';
/* Funtions */
import { console_log } from './console_log';
import { css_camel } from './css-camel';
import { doCssCreate } from './main/doCssCreate';
import { manage_sheet } from './manage_sheet';
import { doUseRecurrentStrategy } from './private/doUseRecurrentStrategy';
import { doUseTimer } from './private/doUseTimer';

const values: ValuesSingleton = ValuesSingleton.getInstance();
export const cssCreate = {
  cssCreate(updateClasses2Create: string[] | null = null, primordial: boolean = false): void {
    try {
      if (!values.pseudos[0]) {
        values.pseudos = values.pseudoClasses
          .sort((e1: number | string, e2: number | string) => {
            e1 = e1.toString().length;
            e2 = e2.toString().length;
            return e1 > e2 ? 1 : e1 < e2 ? -1 : 0;
          })
          .map((pse: string) => {
            return {
              mask: pse,
              real: `${values.separator}:${css_camel.camelToCSSValid(pse)}`,
            };
          })
          .concat(
            values.pseudoElements
              .sort((e1: number | string, e2: number | string) => {
                e1 = e1.toString().length;
                e2 = e2.toString().length;
                return e1 > e2 ? 1 : e1 < e2 ? -1 : 0;
              })
              .map((pse: string) => {
                return {
                  mask: pse,
                  real: `${values.separator}::${css_camel.camelToCSSValid(pse)}`,
                };
              })
          );
      }
      if (!values.sheet) {
        manage_sheet.checkSheet();
        if (!values.sheet) {
          throw new Error(`There is no ${values.styleSheetToManage} style sheet!`);
        }
      }
      if (!!values.useTimer) {
        doUseTimer(updateClasses2Create, primordial);
      } else if (!!values.useRecurrentStrategy) {
        doUseRecurrentStrategy(updateClasses2Create, primordial);
      } else {
        doCssCreate.start(updateClasses2Create);
      }
    } catch (err) {
      console_log.consoleLog('error', { err: err });
    }
  },
};
