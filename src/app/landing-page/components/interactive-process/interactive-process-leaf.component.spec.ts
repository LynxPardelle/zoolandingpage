import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../shared/services/i18n.service';
import { InteractiveProcessLeafComponent } from './interactive-process-leaf.component';

type Dictionary = Record<string, unknown>;

const DICT: Dictionary = {
    processSection: {
        title: 'Process Title',
        sidebarTitle: 'Process Sidebar',
        detailedDescriptionLabel: 'Detailed description',
        deliverablesLabel: 'Deliverables',
    },
    process: [
        {
            title: 'Discover',
            description: 'We discover requirements.',
            detailedDescription: 'We interview stakeholders and gather constraints.',
            duration: '1 week',
            deliverables: ['Brief', 'Roadmap'],
        },
    ],
};

const resolvePath = (key: string, source: Dictionary): unknown =>
    String(key)
        .split('.')
        .reduce<unknown>((acc, part) => (
            acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)
                ? (acc as Record<string, unknown>)[part]
                : undefined
        ), source);

class MockI18nService {
    get<T = unknown>(key: string): T | undefined {
        return resolvePath(key, DICT) as T | undefined;
    }

    t(key: string): string {
        const value = this.get<unknown>(key);
        return typeof value === 'string' ? value : key;
    }

    tOr(key: string, fallback: string): string {
        const translated = this.t(key);
        return translated === key ? fallback : translated;
    }
}

describe('InteractiveProcessLeafComponent', () => {
    let fixture: ComponentFixture<InteractiveProcessLeafComponent>;
    let component: InteractiveProcessLeafComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [InteractiveProcessLeafComponent],
            providers: [{ provide: I18nService, useClass: MockI18nService }],
        }).compileComponents();

        fixture = TestBed.createComponent(InteractiveProcessLeafComponent);
        component = fixture.componentInstance;
    });

    it('resolves key-based step configuration and section copy', () => {
        fixture.componentRef.setInput('process', [
            {
                step: 1,
                icon: 'construction',
                titleKey: 'process.0.title',
                descriptionKey: 'process.0.description',
                detailedDescriptionKey: 'process.0.detailedDescription',
                durationKey: 'process.0.duration',
                deliverablesKey: 'process.0.deliverables',
            },
        ]);
        fixture.componentRef.setInput('currentStep', 0);
        fixture.componentRef.setInput('sectionTitleKey', 'processSection.title');
        fixture.componentRef.setInput('sectionSidebarTitleKey', 'processSection.sidebarTitle');
        fixture.componentRef.setInput('sectionDetailedDescriptionLabelKey', 'processSection.detailedDescriptionLabel');
        fixture.componentRef.setInput('sectionDeliverablesLabelKey', 'processSection.deliverablesLabel');
        fixture.detectChanges();

        const [step] = component.resolvedProcess();
        expect(step.title).toBe('Discover');
        expect(step.duration).toBe('1 week');
        expect(step.deliverables).toEqual(['Brief', 'Roadmap']);
        expect(component.sectionContent().title).toBe('Process Title');
        expect(component.sectionContent().sidebarTitle).toBe('Process Sidebar');
    });

    it('filters out invalid variable-based steps', () => {
        fixture.componentRef.setInput('process', [
            {
                step: 1,
                titleKey: 'process.0.title',
            },
        ]);
        fixture.componentRef.setInput('currentStep', 0);
        fixture.detectChanges();

        expect(component.resolvedProcess()).toEqual([]);
        expect(component.currentData()).toBeUndefined();
    });

    it('falls back to first step when current step is closed', () => {
        fixture.componentRef.setInput('process', [
            {
                step: 1,
                title: 'Step one',
                description: 'Description one',
                detailedDescription: 'Details one',
                duration: '1 week',
                deliverables: ['Brief'],
            },
            {
                step: 2,
                title: 'Step two',
                description: 'Description two',
                detailedDescription: 'Details two',
                duration: '2 weeks',
                deliverables: ['Prototype'],
            },
        ]);
        fixture.componentRef.setInput('currentStep', -1);
        fixture.detectChanges();

        expect(component.currentData()?.step).toBe(1);
    });

    it('uses configured icon first and fallback icon sequence otherwise', () => {
        fixture.componentRef.setInput('process', [
            {
                step: 1,
                icon: 'custom_icon',
                title: 'Step one',
                description: 'Description one',
                detailedDescription: 'Details one',
                duration: '1 week',
                deliverables: ['Brief'],
            },
            {
                step: 2,
                title: 'Step two',
                description: 'Description two',
                detailedDescription: 'Details two',
                duration: '2 weeks',
                deliverables: ['Prototype'],
            },
        ]);
        fixture.componentRef.setInput('currentStep', 0);
        fixture.detectChanges();

        const steps = component.resolvedProcess();
        expect(component.iconForStep(0, steps[0])).toBe('custom_icon');
        expect(component.iconForStep(1, steps[1])).toBe('psychology');
        expect(component.iconForStep(99, steps[1])).toBe('assignment');
    });
});
