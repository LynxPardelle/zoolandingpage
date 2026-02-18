import { TGenericComponent } from "../../components/wrapper-orchestrator/wrapper-orchestrator.types";

type ComponentsStoreParams = {
    accordions: readonly TGenericComponent[];
    buttons: readonly TGenericComponent[];
    links: readonly TGenericComponent[];
    media: readonly TGenericComponent[];
    containers: readonly TGenericComponent[];
    dropdowns: readonly TGenericComponent[];
    cards: readonly TGenericComponent[];
    icons: readonly TGenericComponent[];
    interactiveProcesses: readonly TGenericComponent[];
    loadingSpinners: readonly TGenericComponent[];
    modals: readonly TGenericComponent[];
    progressBars: readonly TGenericComponent[];
    searchBoxes: readonly TGenericComponent[];
    statsCounters: readonly TGenericComponent[];
    steppers: readonly TGenericComponent[];
    tabGroups: readonly TGenericComponent[];
    texts: readonly TGenericComponent[];
    toasts: readonly TGenericComponent[];
    tooltips: readonly TGenericComponent[];
    devOnlyComponents: readonly TGenericComponent[];
};

export const createComponents = ({
    accordions,
    buttons,
    links,
    media,
    containers,
    dropdowns,
    cards,
    icons,
    interactiveProcesses,
    loadingSpinners,
    modals,
    progressBars,
    searchBoxes,
    statsCounters,
    steppers,
    tabGroups,
    texts,
    toasts,
    tooltips,
    devOnlyComponents,
}: ComponentsStoreParams): TGenericComponent[] => [
        ...accordions,
        ...buttons,
        ...links,
        ...media,
        ...containers,
        ...dropdowns,
        ...cards,
        ...icons,
        ...interactiveProcesses,
        ...loadingSpinners,
        ...modals,
        ...progressBars,
        ...searchBoxes,
        ...statsCounters,
        ...steppers,
        ...tabGroups,
        ...texts,
        ...toasts,
        ...tooltips,
        ...devOnlyComponents,
    ];
