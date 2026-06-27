import { effect, inject, Injectable } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { LanguageService } from '../../services/language.service';

@Injectable()
export class GenericTablePaginatorIntl extends MatPaginatorIntl {
  private readonly language = inject(LanguageService);

  constructor() {
    super();
    this.refreshLabels();

    effect(() => {
      this.language.currentLanguage();
      this.refreshLabels();
      this.changes.next();
    });
  }

  private refreshLabels(): void {
    const spanish = this.language.currentLanguage().toLowerCase().startsWith('es');
    this.itemsPerPageLabel = spanish ? 'Artículos por página:' : 'Items per page:';
    this.nextPageLabel = spanish ? 'Página siguiente' : 'Next page';
    this.previousPageLabel = spanish ? 'Página anterior' : 'Previous page';
    this.firstPageLabel = spanish ? 'Primera página' : 'First page';
    this.lastPageLabel = spanish ? 'Última página' : 'Last page';
    this.getRangeLabel = (page: number, pageSize: number, length: number) => {
      if (length === 0 || pageSize === 0) {
        return spanish ? `0 de ${length}` : `0 of ${length}`;
      }

      const startIndex = page * pageSize;
      const endIndex = Math.min(startIndex + pageSize, length);
      return spanish
        ? `${startIndex + 1} - ${endIndex} de ${length}`
        : `${startIndex + 1} - ${endIndex} of ${length}`;
    };
  }
}
