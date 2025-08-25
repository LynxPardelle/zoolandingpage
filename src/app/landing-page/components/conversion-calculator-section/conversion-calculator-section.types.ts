export type BusinessSize = 'nano' | 'micro' | 'small' | 'medium';

export type CalculatedRoi = {
    readonly roiPercentage: number;
    readonly conversionImprovement: number;
    readonly monthlyIncrease: number;
};
