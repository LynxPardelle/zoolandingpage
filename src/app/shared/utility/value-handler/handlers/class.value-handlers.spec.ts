import { classJoinValueHandler } from './class.value-handlers';

describe('class.value-handlers', () => {
    it('joins classes removing duplicates and empty values', () => {
        const handler = classJoinValueHandler();

        const value = handler.resolve({} as never, [
            'btn btn-primary',
            '',
            ['btn', 'rounded', null, undefined],
            'rounded px-2',
        ]);

        expect(value).toBe('btn btn-primary rounded px-2');
    });
});
