import type { Signal } from "@angular/core";
import type { TGenericStatsCounterConfig } from "../../components/generic-stats-counter/generic-stats-counter.types";
import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

type StatsCountersStoreParams = {
    statsStripVisitsConfig: Signal<TGenericStatsCounterConfig>;
    statsStripCtaInteractionsConfig: Signal<TGenericStatsCounterConfig>;
    statsStripAverageTimeConfig: Signal<TGenericStatsCounterConfig>;
};



export const createStatsCounters = ({
    statsStripVisitsConfig,
    statsStripCtaInteractionsConfig,
    statsStripAverageTimeConfig,
}: StatsCountersStoreParams): TGenericComponent[] => {

    return [
        {
            id: 'statsStripVisitsCounter',
            type: 'stats-counter',
            config: statsStripVisitsConfig,
        },
        {
            id: 'statsStripCtaCounter',
            type: 'stats-counter',
            config: statsStripCtaInteractionsConfig,
        },
        {
            id: 'statsStripAvgTimeCounter',
            type: 'stats-counter',
            config: statsStripAverageTimeConfig,
        },
    ];
};
