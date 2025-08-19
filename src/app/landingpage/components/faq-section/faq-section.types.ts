export type FaqItem = {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category?: string;
};

export type FaqCategory = {
  readonly id: string;
  readonly name: string;
  readonly items: readonly FaqItem[];
};
