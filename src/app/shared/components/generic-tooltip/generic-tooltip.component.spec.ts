import {
  Component,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenericTooltipComponent } from './generic-tooltip.component';

@Component({
  imports: [GenericTooltipComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<button #btn id="b1">Hover me</button
    ><generic-tooltip
      [for]="btn"
      [content]="'Hi'"
      [config]="{ trigger: 'hover' }"
    />`,
})
class HostCmp {
  @ViewChild('btn', { static: true }) btn!: ElementRef<HTMLButtonElement>;
}

describe('GenericTooltipComponent', () => {
  let fixture: ComponentFixture<HostCmp>;
  let host: HostCmp;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostCmp, TooltipByIdHostCmp],
    }).compileComponents();
    fixture = TestBed.createComponent(HostCmp);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });
  it('should attach aria-describedby to anchor', () => {
    const btn = host.btn.nativeElement;
    expect(btn.hasAttribute('aria-describedby')).toBeTrue();
  });

  it('should attach aria-describedby when the anchor is provided by id', () => {
    const fixtureById = TestBed.createComponent(TooltipByIdHostCmp);
    fixtureById.detectChanges();

    const btn = fixtureById.nativeElement.querySelector('#button-by-id') as HTMLButtonElement | null;

    expect(btn?.hasAttribute('aria-describedby')).toBeTrue();
  });
});

@Component({
  imports: [GenericTooltipComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<button id="button-by-id">Buscar</button
    ><generic-tooltip
      anchorFor="button-by-id"
      [content]="'Buscar'"
      [config]="{ trigger: 'both' }"
    />`,
})
class TooltipByIdHostCmp {}
