import { REQUEST } from '@angular/core';
import { VariableStoreService } from '../../services/variable-store.service';
import { TestBed } from '@angular/core/testing';
import { GenericPaginationComponent } from './generic-pagination.component';

describe('GenericPaginationComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenericPaginationComponent],
    }).compileComponents();
  });


  for (const value of ['abc', '0.5', '-2', '0']) {
    it(`uses the declared default page size for invalid ${value}`, () => {
      TestBed.overrideProvider(REQUEST, { useValue: new Request('https://example.com/blog?pagina=2&porPagina=' + value) });
      TestBed.inject(VariableStoreService).setRuntimeValue('articles', Array.from({ length: 31 }, (_, id) => ({ id })));
      const fixture = TestBed.createComponent(GenericPaginationComponent);
      fixture.componentRef.setInput('config', { collectionPath: 'articles', pageParam: 'pagina', pageSizeParam: 'porPagina', defaultPageSize: 6 });
      fixture.detectChanges();
      expect(fixture.componentInstance.currentPageSize()).toBe(6);
      expect(fixture.componentInstance.pageCount()).toBe(6);
      expect(fixture.componentInstance.boundedPage()).toBe(2);
    });
  }

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
