export type TestimonialCardConfig = {
  readonly name: string | (() => string);
  readonly role: string | (() => string);
  readonly company: string | (() => string);
  readonly content: string | (() => string);
  readonly rating: number;
  readonly classes?: string;
  readonly avatar?: string;
  readonly verified?: boolean;
};
