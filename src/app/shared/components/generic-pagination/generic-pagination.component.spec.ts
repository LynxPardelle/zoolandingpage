import { TestBed } from '@angular/core/testing';
import { GenericPaginationComponent } from './generic-pagination.component';

describe('GenericPaginationComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericPaginationComponent],
    }).compileComponents();
  });

  it('marks disabled boundary links with a visible disabled state', () => {
    const fixture = TestBed.createComponent(GenericPaginationComponent);

    fixture.componentRef.setInput('config', {
      collectionPath: 'remote.contentHub.articles.items',
      hideWhenEmpty: false,
      hideWhenSinglePage: false,
      linkClasses: 'pagerLink ank-cursor-pointer',
      disabledLinkClasses: 'draftDisabledClass',
      previousLabel: 'Anterior',
      nextLabel: 'Siguiente',
      summaryTemplate: 'Pagina {page} de {pageCount}',
    });
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a')
    ) as HTMLAnchorElement[];
    const previous = links.find((link) => link.textContent?.includes('Anterior'));
    const next = links.find((link) => link.textContent?.includes('Siguiente'));

    expect(previous).toBeTruthy();
    expect(next).toBeTruthy();
    expect(previous?.getAttribute('aria-disabled')).toBe('true');
    expect(next?.getAttribute('aria-disabled')).toBe('true');
    expect(previous?.getAttribute('tabindex')).toBe('-1');
    expect(next?.getAttribute('tabindex')).toBe('-1');
    expect(previous?.className).toContain('pagerLink');
    expect(previous?.className).toContain('draftDisabledClass');
    expect(previous?.className).toContain('zlp-pagination-disabled');
    expect(previous?.className).not.toContain('ank-cursor-pointer');
  });
});
