export type BusinessSize = 'nano' | 'micro' | 'small' | 'medium';

export type CalculatedRoi = {
    readonly conversionPercentage: number;
    readonly conversionImprovement: number;
    readonly monthlyIncrease: number;
};
