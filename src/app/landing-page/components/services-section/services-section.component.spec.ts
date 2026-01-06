import { ConfigurationsOrchestratorService } from '@/app/shared/services/configurations-orchestrator';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ServicesSectionComponent } from './services-section.component';

describe('ServicesSectionComponent', () => {
  let fixture: ComponentFixture<ServicesSectionComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ServicesSectionComponent],
      providers: [
        {
          provide: ConfigurationsOrchestratorService,
          useValue: {
            getComponentById: () => undefined,
            handleComponentEvent: () => undefined,
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ServicesSectionComponent);
    fixture.detectChanges();
  });

  it('renders wrapper orchestrator', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('wrapper-orchestrator')).not.toBeNull();
  });
});
