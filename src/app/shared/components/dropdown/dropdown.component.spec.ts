import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropdownComponent, DropdownItem } from './dropdown.component';

@Component({
  standalone: true,
  template: `<app-dropdown [items]="items"><span trigger>Menu</span></app-dropdown>`,
  imports: [DropdownComponent],
})
class HostTestComponent {
  items: DropdownItem[] = [
    { id: '1', label: 'One' },
    { id: '2', label: 'Two' },
  ];
}

describe('DropdownComponent', () => {
  let fixture: ComponentFixture<HostTestComponent>;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostTestComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostTestComponent);
    fixture.detectChanges();
  });
  it('should render trigger content', () => {
    expect(fixture.nativeElement.textContent).toContain('Menu');
  });
});
