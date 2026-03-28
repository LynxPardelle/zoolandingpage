export type TabGroupTextValue = string | number | (() => string | number);
export type TabGroupStringListValue = readonly string[] | (() => readonly string[]);

export type TabDefinition = {
  readonly id?: string;
  readonly label?: TabGroupTextValue;
  readonly labelKey?: string;
  readonly title?: TabGroupTextValue;
  readonly titleKey?: string;
  readonly summary?: TabGroupTextValue;
  readonly summaryKey?: string;
  readonly content?: TabGroupTextValue;
  readonly contentKey?: string;
  readonly meta?: TabGroupTextValue;
  readonly metaKey?: string;
  readonly detailItems?: TabGroupStringListValue;
  readonly detailItemsKey?: string;
  readonly detailItemKeys?: readonly string[];
  readonly indexLabel?: TabGroupTextValue;
  readonly step?: number;
  readonly icon?: TabGroupTextValue;
  readonly disabled?: boolean;
  readonly lazy?: boolean;
};

export type TabItemsSource = {
  readonly source: 'i18n' | 'var';
  readonly path: string;
};

export type TabGroupLayout = 'default' | 'split-detail';
export type TabGroupOrientation = 'horizontal' | 'vertical';

export type TabGroupConfig = {
  readonly activeId?: string | (() => string | null | undefined);
  readonly tabs?: readonly TabDefinition[] | (() => readonly TabDefinition[]);
  readonly tabsSource?: TabItemsSource;
  readonly layout?: TabGroupLayout;
  readonly orientation?: TabGroupOrientation;
  readonly scrollBehavior?: 'none' | 'center';
  readonly containerClasses?: string;
  readonly listContainerClasses?: string;
  readonly listHeaderLabel?: TabGroupTextValue;
  readonly listHeaderClasses?: string;
  readonly tabListClasses?: string;
  readonly tabButtonClasses?: string;
  readonly activeTabButtonClasses?: string;
  readonly inactiveTabButtonClasses?: string;
  readonly buttonContentClasses?: string;
  readonly indexLabelClasses?: string;
  readonly activeIndexLabelClasses?: string;
  readonly inactiveIndexLabelClasses?: string;
  readonly titleClasses?: string;
  readonly summaryClasses?: string;
  readonly panelClasses?: string;
  readonly detailHeaderClasses?: string;
  readonly detailIconClasses?: string;
  readonly detailTitleClasses?: string;
  readonly detailMetaClasses?: string;
  readonly detailSummaryClasses?: string;
  readonly detailMetaIconName?: string;
  readonly detailContentLabel?: TabGroupTextValue;
  readonly detailContentLabelClasses?: string;
  readonly detailContentClasses?: string;
  readonly detailItemsLabel?: TabGroupTextValue;
  readonly detailItemsLabelClasses?: string;
  readonly detailListClasses?: string;
  readonly detailListItemClasses?: string;
  readonly detailItemIconName?: string;
};
