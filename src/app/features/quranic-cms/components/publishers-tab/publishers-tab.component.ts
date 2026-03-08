import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  CmsPublisher,
  CmsPublishersService,
} from '../../publishers/services/publishers.service';

const AUDIO_TYPES = new Set(['recitations', 'audio_mushaf', 'adhan']);
const TEXT_TYPES = new Set(['text_mushaf', 'tafseer', 'translations']);

export const CONTENT_TYPE_OPTIONS = [
  { label: 'تلاوات', value: 'recitations' },
  { label: 'مصاحف صوتية', value: 'audio_mushaf' },
  { label: 'مصاحف نصية', value: 'text_mushaf' },
  { label: 'تفاسير', value: 'tafseer' },
  { label: 'ترجمات', value: 'translations' },
  { label: 'أذان', value: 'adhan' },
];

const CONTENT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  CONTENT_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

@Component({
  selector: 'app-qcms-publishers-tab',
  standalone: true,
  imports: [RouterLink, NzSpinModule, NzTagModule, FormsModule, ReactiveFormsModule],
  templateUrl: './publishers-tab.component.html',
  styleUrl: './publishers-tab.component.less',
})
export class PublishersTabComponent implements OnInit {
  private readonly service = inject(CmsPublishersService);
  private readonly message = inject(NzMessageService);
  private readonly fb = inject(FormBuilder);

  publishers = signal<CmsPublisher[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  typeFilter = signal('all');
  isAddingPublisher = signal(false);
  saving = signal(false);

  addForm!: FormGroup;
  selectedContentTypes = signal<string[]>([]);
  contentTypeInput = signal('');
  readonly contentTypeOptions = CONTENT_TYPE_OPTIONS;

  // ── Stats ──────────────────────────────────────────────────
  totalPublishers = computed(() => this.publishers().length);
  totalCountries = computed(
    () => new Set(this.publishers().map((p) => p.country).filter(Boolean)).size
  );
  audioSources = computed(
    () => this.publishers().filter((p) => p.content_types?.some((t) => AUDIO_TYPES.has(t))).length
  );
  textSources = computed(
    () => this.publishers().filter((p) => p.content_types?.some((t) => TEXT_TYPES.has(t))).length
  );

  // ── Filtered list ──────────────────────────────────────────
  filtered = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const type = this.typeFilter();
    return this.publishers().filter((p) => {
      const matchesSearch =
        !q || p.name_ar.toLowerCase().includes(q) || p.name_en?.toLowerCase().includes(q);
      const matchesType =
        type === 'all' ||
        (type === 'audio' && p.content_types?.some((t) => AUDIO_TYPES.has(t))) ||
        (type === 'text' && p.content_types?.some((t) => TEXT_TYPES.has(t)));
      return matchesSearch && matchesType;
    });
  });

  ngOnInit(): void {
    this.addForm = this.fb.group({
      name_ar: ['', [Validators.required, Validators.minLength(2)]],
      unique_identifier: ['', [Validators.required]],
      name_en: [''],
      country: [''],
      address: [''],
      contact_email: ['', [Validators.email]],
      website: [''],
      foundation_year: [null],
      description: [''],
    });

    this.service.getPublishers().subscribe({
      next: (res) => this.publishers.set(res.results),
      error: () => {
        this.message.error('تعذر تحميل قائمة الناشرين');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  toggleAddForm(): void {
    this.isAddingPublisher.update((v) => !v);
    if (!this.isAddingPublisher()) {
      this.resetAddForm();
    }
  }

  addContentType(value: string): void {
    const trimmed = value.trim();
    if (!trimmed || this.selectedContentTypes().includes(trimmed)) return;
    this.selectedContentTypes.update((types) => [...types, trimmed]);
    this.contentTypeInput.set('');
  }

  removeContentType(value: string): void {
    this.selectedContentTypes.update((types) => types.filter((t) => t !== value));
  }

  contentTypeLabel(value: string): string {
    return CONTENT_TYPE_LABELS[value] ?? value;
  }

  onSubmitAdd(): void {
    if (this.addForm.invalid) {
      Object.values(this.addForm.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity();
      });
      return;
    }
    this.saving.set(true);
    const payload: Partial<CmsPublisher> = {
      ...this.addForm.value,
      content_types: this.selectedContentTypes(),
    };
    this.service.createPublisher(payload).subscribe({
      next: (created) => {
        this.publishers.update((list) => [created, ...list]);
        this.message.success('تم إضافة الناشر بنجاح');
        this.isAddingPublisher.set(false);
        this.resetAddForm();
      },
      error: () => this.message.error('تعذر إضافة الناشر'),
      complete: () => this.saving.set(false),
    });
  }

  publisherBadge(p: CmsPublisher): { label: string; type: 'audio' | 'text' | 'both' } | null {
    const types = p.content_types ?? [];
    const hasAudio = types.some((t) => AUDIO_TYPES.has(t));
    const hasText = types.some((t) => TEXT_TYPES.has(t));
    if (hasAudio && hasText) return { label: 'صوتيات ونصوص', type: 'both' };
    if (hasAudio) return { label: 'صوتيات', type: 'audio' };
    if (hasText) return { label: 'نصوص', type: 'text' };
    return null;
  }

  private resetAddForm(): void {
    this.addForm.reset();
    this.selectedContentTypes.set([]);
    this.contentTypeInput.set('');
  }
}
