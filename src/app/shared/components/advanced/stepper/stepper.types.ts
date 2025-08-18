export type StepDefinition = {
  readonly id: string;
  readonly label: string;
  readonly optional?: boolean;
  readonly completed?: boolean;
};

export type StepperConfig = {
  readonly linear?: boolean; // when true user can only go to next incomplete step (like a wizard)
};
