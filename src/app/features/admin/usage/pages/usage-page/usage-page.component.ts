import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { TranslateModule } from '@ngx-translate/core';
import { UsageService } from '../../services/usage.service';

@Component({
  selector: 'app-usage-page',
  standalone: true,
  imports: [NzAlertModule, NzSpinModule, NzEmptyModule, TranslateModule],
  templateUrl: './usage-page.component.html',
  styleUrl: './usage-page.component.less',
})
export class UsagePageComponent implements OnInit {
  private readonly usageService = inject(UsageService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly hasError = signal(false);
  readonly boardUrl = signal<SafeResourceUrl | null>(null);

  ngOnInit(): void {
    this.usageService
      .getBoardUrl()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ board_url }) => {
          this.loading.set(false);
          if (board_url) {
            this.boardUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(board_url));
          } else {
            this.hasError.set(true);
          }
        },
        error: () => {
          this.loading.set(false);
          this.hasError.set(true);
        },
      });
  }
}
