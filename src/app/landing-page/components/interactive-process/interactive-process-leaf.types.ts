export type ProcessStep = {
  readonly step: number;
  readonly title: string;
  readonly description: string;
  readonly detailedDescription: string;
  readonly duration: string; // e.g. '1 semana'
  readonly deliverables: readonly string[];
  readonly isActive: boolean;
  readonly icon?: string; // optional material icon name
};

export type ProcessStepVariableConfig = {
  readonly step?: number;
  readonly title?: string;
  readonly titleKey?: string;
  readonly description?: string;
  readonly descriptionKey?: string;
  readonly detailedDescription?: string;
  readonly detailedDescriptionKey?: string;
  readonly duration?: string;
  readonly durationKey?: string;
  readonly deliverables?: readonly string[];
  readonly deliverablesKey?: string;
  readonly deliverableKeys?: readonly string[];
  readonly icon?: string;
};
