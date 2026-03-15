import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { Reciter, ReciterCreate, RecitersStats } from '../models/reciter.model';
import { RecitersService } from '../services/reciters.service';

@Component({
  selector: 'app-reciters-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzButtonComponent,
    NzInputModule,
    NzFormModule,
    NzPaginationModule,
  ],
  templateUrl: './reciters.page.html',
  styleUrls: ['./reciters.page.less'],
})
export class RecitersPage implements OnInit {
  private readonly recitersService = inject(RecitersService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  // Sub-navigation
  activeSubTab = signal<'reciters' | 'recitations'>('reciters');

  // Stats
  stats = signal<RecitersStats | null>(null);
  statsLoading = signal(true);
  usingMockStats = computed(() => this.stats()?.isMock === true);

  // Reciters list
  reciters = signal<Reciter[]>([]);
  recitersLoading = signal(true);
  totalReciters = signal(0);
  currentPage = signal(1);
  pageSize = 12;

  // Search
  searchQuery = signal('');
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Add form
  showAddForm = signal(false);
  addLoading = signal(false);
  addForm!: FormGroup;

  ngOnInit(): void {
    this.addForm = this.fb.group({
      id: ['', [Validators.required]],
      name: ['', [Validators.required]],
      name_en: [''],
      nationality: [''],
      birth_year: [null],
      death_year: [null],
      photo_url: [''],
      bio: [''],
    });

    this.loadStats();
    this.loadReciters();
  }

  setSubTab(tab: 'reciters' | 'recitations'): void {
    this.activeSubTab.set(tab);
  }

  // --- Stats ---
  private loadStats(): void {
    this.statsLoading.set(true);
    this.recitersService.getStats().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => this.stats.set(data),
      error: () => {
        this.stats.set({
          total_reciters: 0,
          total_contemporary: 0,
          total_nationalities: 0,
          isMock: true,
        });
      },
      complete: () => this.statsLoading.set(false),
    });
  }

  // --- Reciters List ---
  loadReciters(): void {
    this.recitersLoading.set(true);
    this.recitersService
      .getReciters(this.searchQuery(), this.currentPage(), this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.reciters.set(response.results);
          this.totalReciters.set(response.count);
        },
        error: () => {
          this.reciters.set([]);
          this.totalReciters.set(0);
          this.messages.error('تعذر تحميل قائمة القرّاء');
        },
        complete: () => this.recitersLoading.set(false),
      });
  }

  // --- Search ---
  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchQuery.set(value);
      this.currentPage.set(1);
      this.loadReciters();
    }, 400);
  }

  // --- Pagination ---
  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadReciters();
  }

  // --- Add Form ---
  toggleAddForm(): void {
    this.showAddForm.update((v) => !v);
  }

  submitAddForm(): void {
    if (this.addForm.invalid) {
      Object.values(this.addForm.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return;
    }

    this.addLoading.set(true);
    const data: ReciterCreate = this.addForm.value;

    this.recitersService.createReciter(data).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.messages.success('تمت إضافة القارئ بنجاح');
        this.addForm.reset();
        this.showAddForm.set(false);
        this.loadReciters();
        this.loadStats();
      },
      error: () => {
        this.messages.error('حدث خطأ أثناء إضافة القارئ');
      },
      complete: () => this.addLoading.set(false),
    });
  }

  getSkeletonArray(): number[] {
    return Array.from({ length: 6 }, (_, i) => i);
  }
}
