export type FeatureCard = {
    readonly icon: string;
    readonly title: string;
    readonly description: string;
    readonly benefits: readonly string[];
};

export type ServiceCard = {
    readonly icon: string;
    readonly title: string;
    readonly description: string;
    readonly features: readonly string[];
    readonly color: string;
};

export type TestimonialCard = {
    readonly name: string;
    readonly role: string;
    readonly company: string;
    readonly content: string;
    readonly rating: number;
    readonly avatar: string;
};

export type InteractiveProcess = {
    readonly step: number;
    readonly title: string;
    readonly description: string;
    readonly detailedDescription: string;
    readonly duration: string;
    readonly deliverables: readonly string[];
    readonly isActive: boolean;
};
