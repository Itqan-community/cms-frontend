import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CmsPublisher } from '../../services/publishers.service';

const CONTENT_TYPE_OPTIONS = [
  { label: 'تلاوات', value: 'recitations' },
  { label: 'مصاحف صوتية', value: 'audio_mushaf' },
  { label: 'مصاحف نصية', value: 'text_mushaf' },
  { label: 'تفاسير', value: 'tafseer' },
  { label: 'ترجمات', value: 'translations' },
  { label: 'أذان', value: 'adhan' },
];

@Component({
  selector: 'app-publisher-edit',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './publisher-edit.component.html',
  styleUrl: './publisher-edit.component.less',
})
export class PublisherEditComponent implements OnInit {
  @Input({ required: true }) publisher!: CmsPublisher;
  @Output() saved = new EventEmitter<Partial<CmsPublisher>>();
  @Output() cancelled = new EventEmitter<void>();

  form!: FormGroup;
  saving = signal(false);
  selectedTypes = signal<string[]>([]);
  typeInput = signal('');
  readonly contentTypeOptions = CONTENT_TYPE_OPTIONS;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.selectedTypes.set(this.publisher.content_types ?? []);
    this.form = this.fb.group({
      name_ar: [this.publisher.name_ar, [Validators.required, Validators.minLength(2)]],
      name_en: [this.publisher.name_en ?? ''],
      description: [this.publisher.description ?? ''],
      country: [this.publisher.country ?? ''],
      foundation_year: [this.publisher.foundation_year ?? null],
      website: [this.publisher.website ?? ''],
      contact_email: [this.publisher.contact_email ?? '', [Validators.email]],
      address: [this.publisher.address ?? ''],
    });
  }

  addType(value: string): void {
    if (!value || this.selectedTypes().includes(value)) return;
    this.selectedTypes.update((types) => [...types, value]);
    this.typeInput.set('');
  }

  removeType(value: string): void {
    this.selectedTypes.update((types) => types.filter((t) => t !== value));
  }

  contentTypeLabel(value: string): string {
    return CONTENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }

  onSave(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity();
      });
      return;
    }
    this.saved.emit({ ...this.form.value, content_types: this.selectedTypes() });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
