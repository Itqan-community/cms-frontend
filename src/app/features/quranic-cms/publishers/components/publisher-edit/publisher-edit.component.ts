import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { Publisher } from '../../models/publishers-stats.models';

@Component({
  selector: 'app-publisher-edit',
  standalone: true,
  imports: [ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule, NzGridModule],
  templateUrl: './publisher-edit.component.html',
  styleUrl: './publisher-edit.component.less',
})
export class PublisherEditComponent implements OnChanges {
  @Input({ required: true }) publisher!: Publisher;
  @Input() submitting = false;

  @Output() save = new EventEmitter<Partial<Publisher>>();
  @Output() cancel = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);

  protected readonly form = this.fb.group({
    name_ar: ['', [Validators.required, this.requiredTrimmed()]],
    name_en: ['', [Validators.required, this.requiredTrimmed()]],
    country: [''],
    website: ['', [Validators.pattern(/^https?:\/\/.+/i)]],
    icon_url: ['', [Validators.pattern(/^https?:\/\/.+/i)]],
    foundation_year: [null as number | null, [Validators.min(1), Validators.max(9999)]],
    address: [''],
    contact_email: ['', [Validators.email]],
    description: [''],
    is_verified: [false],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['publisher']?.currentValue) {
      this.form.reset({
        name_ar: this.publisher.name_ar ?? '',
        name_en: this.publisher.name_en ?? '',
        country: this.publisher.country ?? '',
        website: this.publisher.website ?? '',
        icon_url: this.publisher.icon_url ?? '',
        foundation_year: this.publisher.foundation_year ?? null,
        address: this.publisher.address ?? '',
        contact_email: this.publisher.contact_email ?? '',
        description: this.publisher.description ?? '',
        is_verified: this.publisher.is_verified ?? false,
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();

    const payload = {
      ...this.publisher,
      name_ar: (rawValue.name_ar ?? '').trim(),
      name_en: (rawValue.name_en ?? '').trim(),
      country: rawValue.country || undefined,
      website: rawValue.website || undefined,
      icon_url: rawValue.icon_url || undefined,
      foundation_year: rawValue.foundation_year ?? undefined,
      address: rawValue.address || undefined,
      contact_email: rawValue.contact_email || undefined,
      description: rawValue.description || undefined,
      is_verified: rawValue.is_verified ?? false,
    };

    this.save.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  private requiredTrimmed(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (typeof value !== 'string') {
        return null;
      }

      return value.trim().length > 0 ? null : { requiredTrimmed: true };
    };
  }
}
