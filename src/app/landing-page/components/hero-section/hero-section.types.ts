export type HeroPrimaryAction = { readonly label: string; readonly trackLabel?: string };
export type HeroSecondaryAction = { readonly label: string; readonly trackLabel?: string };
export type HeroSectionData = {
  readonly title: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly backgroundImage?: string;
  readonly primary: HeroPrimaryAction;
  readonly secondary?: HeroSecondaryAction;
  readonly badges?: readonly { readonly icon?: string; readonly text: string }[];
  readonly badgesLabel?: string;
  readonly mockup?: {
    readonly url: string;
    readonly logo: string;
    readonly contact: string;
    readonly buyButton: string;
    readonly demoButton: string;
    readonly ctaButton: string;
    readonly badges: {
      readonly conversion: string;
      readonly speed: string;
      readonly seoOptimized: string;
      readonly mobileResponsive: string;
    };
  };
};
