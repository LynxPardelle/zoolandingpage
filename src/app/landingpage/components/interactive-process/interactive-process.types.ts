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
