import { TGenericComponent } from '../../components/wrapper-orchestrator/wrapper-orchestrator.types';

export const createStatsCounters = (): TGenericComponent[] => {

    return [
        {
            id: 'statsStripVisitsCounter',
            type: 'stats-counter',
            valueInstructions: 'set:config.target,varOr,statsCounters.visits.target,eval:host.statsStripVisitsFallback; set:config.durationMs,varOr,statsCounters.visits.durationMs,1600; set:config.ariaLabel,i18n,statsStrip.visitsLabel; set:config.format,statsFormatVar,statsCounters.visits.formatMode,prefix,statsCounters.visits.formatSuffix,,statsCounters.visits.formatPrefix,',
            config: {
                target: 0,
                durationMs: 1600,
                startOnVisible: true,
                ariaLabel: '',
            },
        },
        {
            id: 'statsStripCtaCounter',
            type: 'stats-counter',
            valueInstructions: 'set:config.target,varOr,statsCounters.cta.target,eval:host.statsStripCtaFallback; set:config.durationMs,varOr,statsCounters.cta.durationMs,1800; set:config.ariaLabel,i18n,statsStrip.ctaInteractionsLabel; set:config.format,statsFormatVar,statsCounters.cta.formatMode,number,statsCounters.cta.formatSuffix,,statsCounters.cta.formatPrefix,',
            config: {
                target: 0,
                durationMs: 1800,
                startOnVisible: true,
                ariaLabel: '',
            },
        },
        {
            id: 'statsStripAvgTimeCounter',
            type: 'stats-counter',
            valueInstructions: 'set:config.rawTarget,varOr,statsCounters.avgTime.target,eval:host.statsStripAverageTimeFallback; set:config.minClamp,varOr,statsCounters.avgTime.min,0; set:config.maxClamp,varOr,statsCounters.avgTime.max,999999; set:config.target,numberClamp,eval:config.rawTarget,eval:config.minClamp,eval:config.maxClamp; set:config.durationMs,varOr,statsCounters.avgTime.durationMs,2000; set:config.ariaLabel,i18n,statsStrip.averageTimeLabel; set:config.format,statsFormatVar,statsCounters.avgTime.formatMode,suffix,statsCounters.avgTime.formatSuffix,s,statsCounters.avgTime.formatPrefix,',
            config: {
                target: 284,
                durationMs: 2000,
                startOnVisible: true,
                ariaLabel: '',
            },
        },
    ];
};
