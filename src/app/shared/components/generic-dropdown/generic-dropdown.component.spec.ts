import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericDropdown } from './generic-dropdown.component';
import type { DropdownItem } from './generic-dropdown.types';

@Component({
  template: `<generic-dropdown [items]="items"><span trigger>Menu</span></generic-dropdown>`,
  imports: [GenericDropdown],
})
class HostTestComponent {
  items: DropdownItem[] = [
    { id: '1', label: 'One' },
    { id: '2', label: 'Two' },
  ];
}

describe('GenericDropdown', () => {
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
