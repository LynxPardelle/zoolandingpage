export type TestimonialCardConfig = {
  readonly name: string;
  readonly role: string;
  readonly company: string;
  readonly content: string;
  readonly rating: number;
  readonly classes?: string;
  readonly avatar?: string;
  readonly verified?: boolean;
};
