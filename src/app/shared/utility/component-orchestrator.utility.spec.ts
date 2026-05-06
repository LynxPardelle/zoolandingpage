import type { TGenericComponent } from '../components/wrapper-orchestrator/wrapper-orchestrator.types';
import { collectAllClassesFromComponents } from './component-orchestrator.utility';

describe('collectAllClassesFromComponents', () => {
    it('includes Angora classes declared in dynamic value instruction branches', () => {
        const components = [
            {
                id: 'siteHeader',
                type: 'container',
                config: {
                    classes: 'ank-bg-bgColor ank-color-textColor',
                },
                valueInstructions: 'set:config.classes,when,"all:hostGt,runtimeState.viewport.scrollY,16","ank-bg-HASH1C1C1C ank-color-white","ank-bg-bgColor ank-color-textColor"',
            },
        ] as unknown as TGenericComponent[];

        const classes = collectAllClassesFromComponents(components);

        expect(classes).toContain('ank-bg-bgColor');
        expect(classes).toContain('ank-color-textColor');
        expect(classes).toContain('ank-bg-HASH1C1C1C');
        expect(classes).toContain('ank-color-white');
    });
});
