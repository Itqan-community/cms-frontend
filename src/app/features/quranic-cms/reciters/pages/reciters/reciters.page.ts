import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { catchError, of } from 'rxjs';
import { ApiReciters, Reciter } from '../../models/reciter.model';
import { ReciterService } from '../../services/reciter.service';

@Component({
  selector: 'app-reciters',
  standalone: true,
  imports: [TranslateModule, NzSpinModule, NzListModule, NzPaginationModule, NzEmptyModule],
  templateUrl: './reciters.page.html',
  styleUrls: ['./reciters.page.less'],
})
export class RecitersPage implements OnInit {
  private readonly reciterService = inject(ReciterService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);

  reciters = signal<Reciter[]>([]);
  loading = signal<boolean>(false);
  total = signal<number>(0);
  page = signal<number>(1);
  pageSize = signal<number>(20);

  isEmpty = computed(() => !this.loading() && this.reciters().length === 0);

  ngOnInit(): void {
    this.loadReciters();
  }

  loadReciters(): void {
    this.loading.set(true);
    this.reciterService
      .getReciters(this.page(), this.pageSize())
      .pipe(
        catchError(() => {
          this.message.error(this.translate.instant('QURANIC_CMS.RECITERS.ERRORS.LOAD_FAILED'));
          return of<ApiReciters>({ results: [], count: 0 });
        })
      )
      .subscribe({
        next: (response) => {
          this.reciters.set(response.results);
          this.total.set(response.count);
        },
        complete: () => this.loading.set(false),
      });
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.loadReciters();
  }
}
