import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-unauthorized-page',
  standalone: true,
  imports: [NgIcon, NzButtonModule, TranslateModule],
  templateUrl: './unauthorized.page.html',
  styleUrls: ['./unauthorized.page.less'],
})
export class UnauthorizedPage implements OnInit {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  /** Visible seconds remaining before auto-navigation to `/gallery`. */
  readonly countdownSeconds = signal(5);

  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearCountdownTimer());
  }

  ngOnInit(): void {
    this.clearCountdownTimer();
    this.countdownSeconds.set(5);
    this.intervalId = globalThis.setInterval(() => {
      const next = this.countdownSeconds() - 1;
      this.countdownSeconds.set(next);
      if (next <= 0) {
        this.clearCountdownTimer();
        void this.navigateToGallery();
      }
    }, 1000);
  }

  goToGallery(): void {
    this.clearCountdownTimer();
    void this.navigateToGallery();
  }

  private navigateToGallery(): void {
    void this.router.navigate(['/gallery'], { replaceUrl: true });
  }

  private clearCountdownTimer(): void {
    if (this.intervalId != null) {
      globalThis.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
