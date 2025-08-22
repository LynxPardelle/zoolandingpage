import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TooltipComponent } from './tooltip.component';

@Component({
  standalone: true,
  imports: [TooltipComponent],
  template: `<button #btn id="b1">Hover me</button
    ><app-tooltip [for]="btn" [content]="'Hi'" [config]="{ trigger: 'hover' }" />`,
})
class HostCmp {
  @ViewChild('btn', { static: true }) btn!: ElementRef<HTMLButtonElement>;
}

describe('TooltipComponent', () => {
  let fixture: ComponentFixture<HostCmp>;
  let host: HostCmp;
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostCmp] }).compileComponents();
    fixture = TestBed.createComponent(HostCmp);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should attach aria-describedby to anchor', () => {
    const btn = host.btn.nativeElement;
    expect(btn.hasAttribute('aria-describedby')).toBeTrue();
  });
});
