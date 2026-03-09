import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PublishersService } from '../../services/publishers.service';

@Component({
  selector: 'app-publisher-add',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzGridModule,
    NzIconModule,
  ],
  template: `
    <div *ngIf="!isAdding" class="add-button-container">
      <button nz-button nzType="primary" (click)="showForm()" class="add-btn">
        <span nz-icon nzType="plus"></span>
        إضافة ناشر جديد
      </button>
    </div>

    <div *ngIf="isAdding" class="form-page-wrapper">
      <div class="inline-form-card">
        <div class="form-header">
          <h2 class="form-title">إضافة ناشر جديد</h2>
        </div>

        <form nz-form [formGroup]="publisherForm" [nzLayout]="'vertical'">
          <div nz-row [nzGutter]="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired>اسم الناشر بالإنجليزي (name_en) *</nz-form-label>
                <nz-form-control nzExtra="(English Name)">
                  <input nz-input formControlName="name_en" placeholder="Every Ayah" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzRequired>اسم الناشر بالعربي (name_ar) *</nz-form-label>
                <nz-form-control nzExtra="(Arabic Name)">
                  <input nz-input formControlName="name_ar" placeholder="كل آية" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row [nzGutter]="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>الدولة</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    formControlName="country"
                    placeholder="المملكة العربية السعودية"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>سنة التأسيس</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    type="number"
                    formControlName="foundation_year"
                    placeholder="2026"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row [nzGutter]="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>الموقع الإلكتروني</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="website" placeholder="https://example.com" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>البريد الإلكتروني</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="contact_email" placeholder="info@example.com" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row [nzGutter]="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>العنوان</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    formControlName="address"
                    placeholder="مثلاً: الرياض، حي المروج"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label>رابط الأيقونة (URL)</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    formControlName="icon_url"
                    placeholder="https://example.com/logo.png"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <nz-form-item>
            <nz-form-label>الوصف</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                formControlName="description"
                rows="4"
                placeholder="وصف مختصر عن الناشر..."
              ></textarea>
            </nz-form-control>
          </nz-form-item>

          <div class="form-footer">
            <button nz-button nzType="link" (click)="handleCancel()" class="cancel-link">
              إلغاء
            </button>
            <button
              nz-button
              nzType="primary"
              [disabled]="publisherForm.invalid"
              [nzLoading]="isConfirmLoading"
              (click)="handleOk()"
              class="full-width-save-btn"
            >
              <span nz-icon nzType="save"></span>
              حفظ الناشر
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [
    `
      .form-page-wrapper {
        padding: 40px 20px;
        min-height: 100vh;
        width: 100%;
        border-radius: 12px;
        direction: rtl;
      }

      .add-btn {
        height: 40px;
        border-radius: 10px;
        background-color: #1890ff;
        border: none;
        font-weight: 500;
      }

      .inline-form-card {
        background-color: #e1edfc !important;
        border-radius: 12px;
        padding: 32px;
        max-width: 1000px;
        margin: 0 auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
      }

      .form-header {
        text-align: right;
        margin-bottom: 32px;
      }

      .form-title {
        color: #3f51b5;
        font-size: 16px;
        font-weight: 500;
      }

      ::ng-deep .ant-form-item-label > label {
        color: #595959;
        font-size: 13px;
        height: auto;
      }

      input,
      textarea {
        background: white;
        border: 1px solid #e6e9f0 !important;
        border-radius: 6px !important;
        padding: 10px 12px !important;
      }

      input::placeholder,
      textarea::placeholder {
        color: #bfbfbf;
        font-size: 13px;
      }

      ::ng-deep .ant-form-item-extra {
        font-size: 11px;
        color: #bfbfbf;
        text-align: right;
        margin-top: 4px;
      }

      .form-footer {
        margin-top: 32px;
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .full-width-save-btn {
        width: 100%;
        height: 48px;
        background-color: #2f65ff;
        border: none;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .cancel-link {
        height: 48px;
        color: #8c8c8c;
        width: 100px;
      }

      nz-form-item {
        margin-bottom: 20px;
      }
    `,
  ],
})
export class PublisherAddComponent {
  @Input() isAdding = false;
  @Output() isAddingChange = new EventEmitter<boolean>();
  @Output() publisherAdded = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private publishersService = inject(PublishersService);
  private message = inject(NzMessageService);

  isConfirmLoading = false;

  publisherForm: FormGroup = this.fb.group({
    name_ar: ['', [Validators.required]],
    name_en: ['', [Validators.required]],
    country: [''],
    foundation_year: [null],
    address: [''],
    contact_email: ['', [Validators.email]],
    website: [''],
    icon_url: [''],
    description: [''],
    is_verified: [false],
  });

  showForm(): void {
    this.isAdding = true;
    this.isAddingChange.emit(true);
  }

  handleOk(): void {
    if (this.publisherForm.valid) {
      this.isConfirmLoading = true;
      this.publishersService.createPublisher(this.publisherForm.value).subscribe({
        next: () => {
          this.message.success('تمت إضافة الناشر بنجاح');
          this.isConfirmLoading = false;
          this.publisherForm.reset();
          this.isAdding = false;
          this.isAddingChange.emit(false);
          this.publisherAdded.emit();
        },
        error: () => {
          this.message.error('عذراً، حدث خطأ أثناء إضافة الناشر');
          this.isConfirmLoading = false;
        },
      });
    }
  }

  handleCancel(): void {
    this.isAdding = false;
    this.isAddingChange.emit(false);
    this.publisherForm.reset();
  }
}
