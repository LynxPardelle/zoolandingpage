import { Component, ElementRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericTooltipComponent } from './generic-tooltip.component';

@Component({
  imports: [GenericTooltipComponent],
  template: `<button #btn id="b1">Hover me</button
    ><generic-tooltip [for]="btn" [content]="'Hi'" [config]="{ trigger: 'hover' }" />`,
})
class HostCmp {
  @ViewChild('btn', { static: true }) btn!: ElementRef<HTMLButtonElement>;
}

describe('GenericTooltipComponent', () => {
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
