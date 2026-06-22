import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { SuraCardComponent } from '../../components/sura-card/sura-card.component';
import { Sura } from '../../models/mushaf.model';
import { MushafService } from '../../services/mushaf.service';

@Component({
  selector: 'app-mushaf-sura-index',
  standalone: true,
  imports: [SuraCardComponent, StateMessageComponent, TranslateModule],
  templateUrl: './sura-index.page.html',
  styleUrl: './sura-index.page.less',
})
export class SuraIndexPage implements OnInit {
  private readonly mushafService = inject(MushafService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly suras = signal<Sura[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorState = signal(false);

  ngOnInit(): void {
    this.loadSuras();
  }

  protected loadSuras(): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.mushafService
      .getSuras()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.suras.set(response.results);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorState.set(true);
        },
      });
  }
}
