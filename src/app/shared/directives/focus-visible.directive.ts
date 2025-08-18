import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

/** Adds a focus-visible outline class only when focus came from keyboard navigation. */
@Directive({
  selector: '[appFocusVisible]',
})
export class FocusVisibleDirective {
  private hadKeyboardEvent = false;
  constructor(private el: ElementRef<HTMLElement>, private rd: Renderer2) {}

  @HostListener('keydown') onKeydown() {
    this.hadKeyboardEvent = true;
  }
  @HostListener('mousedown') onPointer() {
    this.hadKeyboardEvent = false;
  }
  @HostListener('focus') onFocus() {
    if (this.hadKeyboardEvent) {
      this.rd.addClass(this.el.nativeElement, 'focus-visible-ring');
    }
  }
  @HostListener('blur') onBlur() {
    this.rd.removeClass(this.el.nativeElement, 'focus-visible-ring');
  }
}
