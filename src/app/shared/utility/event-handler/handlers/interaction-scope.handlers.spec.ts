import { InteractionScopeService } from '../../../components/interaction-scope/interaction-scope.service';
import { setScopeValueHandler } from './interaction-scope.handlers';

describe('setScopeValue predicates', () => {
    const handler = setScopeValueHandler();
    function run(args: unknown[]) {
        const interactionScope = new InteractionScopeService();
        interactionScope.configure({ scopeId: 'calculator', initialValues: { price: 25000000 } });
        handler.handle({ host: { interactionScope }, event: { componentId: 'slider', eventName: 'blurred' } }, args);
        return interactionScope.snapshot().values['price'];
    }

    it('preserves unguarded legacy assignments', () => {
        expect(run(['price', 1000000])).toBe(1000000);
        expect(run(['price', null])).toBeNull();
    });

    it('accepts only complete strictly equal predicate pairs', () => {
        expect(run(['price', 1000000, 'valueChanged', 'valueChanged', true, true])).toBe(1000000);
        for (const predicates of [['blurred', 'valueChanged'], [1, '1'], [true], [true, true, false], [true, true, false, true]]) {
            expect(run(['price', undefined, ...predicates])).toBe(25000000);
        }
    });
});
