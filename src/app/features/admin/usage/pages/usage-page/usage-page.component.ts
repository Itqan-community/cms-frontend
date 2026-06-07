import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import { PublisherFilterItem } from '../../../tafsirs/models/tafsirs.models';
import { UsageService } from '../../services/usage.service';

@Component({
  selector: 'app-usage-page',
  standalone: true,
  imports: [
    NzAlertModule,
    NzSpinModule,
    NzEmptyModule,
    NzSelectModule,
    FormsModule,
    TranslateModule,
  ],
  templateUrl: './usage-page.component.html',
  styleUrl: './usage-page.component.less',
})
export class UsagePageComponent implements OnInit {
  private readonly usageService = inject(UsageService);
  private readonly authService = inject(AuthService);
  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly hasError = signal(false);
  readonly boardUrl = signal<SafeResourceUrl | null>(null);
  readonly publishers = signal<PublisherFilterItem[]>([]);
  readonly selectedPublisherId = signal<number | null>(null);

  readonly isStaff = computed(() => !!this.authService.currentUser()?.is_admin);

  ngOnInit(): void {
    if (this.isStaff()) {
      this.publishersFilterService
        .search('', 1)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (res) => this.publishers.set(res.results) });
    }
    this.loadBoardUrl(null);
  }

  onPublisherChange(publisherId: number | null): void {
    this.selectedPublisherId.set(publisherId);
    this.loadBoardUrl(publisherId);
  }

  private loadBoardUrl(publisherId: number | null): void {
    this.loading.set(true);
    this.hasError.set(false);
    this.boardUrl.set(null);

    this.usageService
      .getBoardUrl(publisherId)
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
