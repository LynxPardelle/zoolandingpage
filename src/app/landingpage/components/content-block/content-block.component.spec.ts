import { TestBed } from '@angular/core/testing';
import { ContentBlockComponent } from './content-block.component';

describe('ContentBlockComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentBlockComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ContentBlockComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render with basic layout', () => {
    const fixture = TestBed.createComponent(ContentBlockComponent);
    fixture.componentRef.setInput('data', {
      layout: 'basic',
      title: 'Test Title',
      content: 'Test content',
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test Title');
    expect(compiled.textContent).toContain('Test content');
  });

  it('should handle different layout variants', () => {
    const fixture = TestBed.createComponent(ContentBlockComponent);
    fixture.componentRef.setInput('data', {
      layout: 'centered',
      title: 'Centered Title',
      content: 'Centered content',
    });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.content-block')).toBeTruthy();
  });
});
