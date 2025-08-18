export type TabDefinition = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly lazy?: boolean;
};
export type TabGroupConfig = { readonly activeId?: string };
