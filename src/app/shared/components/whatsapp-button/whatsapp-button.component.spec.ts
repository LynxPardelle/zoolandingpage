import { TestBed } from '@angular/core/testing';
import { WhatsAppButtonComponent } from './whatsapp-button.component';

describe('WhatsAppButtonComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WhatsAppButtonComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(WhatsAppButtonComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render with WhatsApp icon', () => {
    const fixture = TestBed.createComponent(WhatsAppButtonComponent);
    fixture.componentRef.setInput('phone', '+1234567890');
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('button')).toBeTruthy();
  });

  it('should emit activated event on click', () => {
    const fixture = TestBed.createComponent(WhatsAppButtonComponent);
    fixture.componentRef.setInput('phone', '+1234567890');
    const component = fixture.componentInstance;
    spyOn(component.activated, 'emit');

    const button = fixture.nativeElement.querySelector('button');
    button?.click();

    expect(component.activated.emit).toHaveBeenCalled();
  });
});
