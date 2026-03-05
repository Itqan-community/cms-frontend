import { NgClass } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { Publisher, PublishersStats } from './models/publisher.model';
import { PublishersService } from './services/publishers.service';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-publishers-page',
  standalone: true,
  imports: [
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    NzButtonComponent,
    NzInputModule,
    NzFormModule,
    NzPaginationModule,
    NzSelectModule,
    NzSwitchModule,
  ],
  templateUrl: './publishers.page.html',
  styleUrls: ['./publishers.page.less'],
})
export class PublishersPage implements OnInit {
  private readonly publishersService = inject(PublishersService);
  private readonly messages = inject(NzMessageService);

  activeSubTab = signal<'publishers' | 'authors' | 'sources'>('publishers');
  stats = signal<PublishersStats | null>(null);
  statsLoading = signal(true);
  publishers = signal<Publisher[]>([]);
  publishersLoading = signal(true);
  totalPublishers = signal(0);
  currentPage = signal(1);
  searchQuery = signal('');
  activeFilter = signal<boolean | undefined>(undefined);
  showAddForm = signal(false);
  addLoading = signal(false);

  usingMock = computed(() => this.stats()?.isMock === true);
  pageSize = PAGE_SIZE;

  addForm = new FormGroup({
    name_ar: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    name_en: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    country: new FormControl('', { nonNullable: true }),
    foundation_year: new FormControl<number | null>(null),
    address: new FormControl('', { nonNullable: true }),
    contact_email: new FormControl('', { nonNullable: true, validators: [Validators.email] }),
    website: new FormControl('', { nonNullable: true }),
    icon_url: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    is_verified: new FormControl(false, { nonNullable: true }),
  });

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.loadStats();
    this.loadPublishers();
  }

  setSubTab(tab: 'publishers' | 'authors' | 'sources'): void {
    this.activeSubTab.set(tab);
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchQuery.set(value);
      this.currentPage.set(1);
      this.loadPublishers();
    }, 300);
  }

  onActiveFilterChange(value: string): void {
    this.activeFilter.set(value === 'all' ? undefined : value === 'true');
    this.currentPage.set(1);
    this.loadPublishers();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadPublishers();
  }

  toggleAddForm(): void {
    this.showAddForm.update((v) => !v);
    if (!this.showAddForm()) this.addForm.reset();
  }

  onSubmitAdd(): void {
    if (this.addForm.invalid) return;
    this.addLoading.set(true);
    const raw = this.addForm.getRawValue();
    const payload: Record<string, unknown> = { name_ar: raw.name_ar, name_en: raw.name_en };
    if (raw.country) payload['country'] = raw.country;
    if (raw.foundation_year) payload['foundation_year'] = raw.foundation_year;
    if (raw.address) payload['address'] = raw.address;
    if (raw.contact_email) payload['contact_email'] = raw.contact_email;
    if (raw.website) payload['website'] = raw.website;
    if (raw.icon_url) payload['icon_url'] = raw.icon_url;
    if (raw.description) payload['description'] = raw.description;
    if (raw.is_verified) payload['is_verified'] = raw.is_verified;

    this.publishersService.createPublisher(payload as any).subscribe({
      next: () => {
        this.messages.success('تمت إضافة الناشر بنجاح');
        this.addForm.reset();
        this.showAddForm.set(false);
        this.addLoading.set(false);
        this.currentPage.set(1);
        this.loadPublishers();
        this.loadStats();
      },
      error: () => {
        this.messages.error('فشل في إضافة الناشر');
        this.addLoading.set(false);
      },
    });
  }

  getSkeletonArray(): number[] {
    return Array.from({ length: 6 }, (_, i) => i);
  }

  private loadStats(): void {
    this.statsLoading.set(true);
    this.publishersService.getStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => this.stats.set({ total_publishers: 0, total_active: 0, total_countries: 0, isMock: true }),
      complete: () => this.statsLoading.set(false),
    });
  }

  private loadPublishers(): void {
    this.publishersLoading.set(true);
    this.publishersService
      .getPublishers(this.searchQuery(), this.currentPage(), PAGE_SIZE, this.activeFilter())
      .subscribe({
        next: (res) => {
          this.publishers.set(res.results);
          this.totalPublishers.set(res.count);
        },
        error: () => {
          this.publishers.set([]);
          this.totalPublishers.set(0);
        },
        complete: () => this.publishersLoading.set(false),
      });
  }
}
