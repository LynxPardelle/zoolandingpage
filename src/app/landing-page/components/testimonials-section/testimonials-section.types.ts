export type TestimonialItem = {
  readonly name: string;
  readonly role: string;
  readonly company: string;
  readonly content: string;
  readonly rating: number; // 1-5 scale
  readonly avatar?: string;
  readonly verified?: boolean;
};
