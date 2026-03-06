import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { RecitationItem } from '../../models/recitations.models';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-recitation-card',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzModalModule, RouterLink],
  template: `
    <div class="recitation-card" dir="rtl">
      <div class="recitation-card__header">
        <div class="recitation-card__info">
          <h3 class="recitation-card__name">
            {{ recitation.reciter.name || 'مقرئ غير معروف' }}
            @if (recitation.style) {
              <span>({{ recitation.style }})</span>
            }
          </h3>
          <span class="recitation-card__name-en">{{ nameEnWithStyle }}</span>
        </div>

        <div class="recitation-card__actions">
          <button nz-button nzDanger nzType="text" class="delete-btn" (click)="showDeleteConfirm()">
            <i class="bx bx-trash" style="font-size: 1.25rem;"></i>
          </button>
        </div>
      </div>

      <div class="recitation-card__body">
        <div class="info-row info-row--purple">
          <span class="info-row__label">القراءة:</span>
          <span class="info-row__value">{{ recitation.qiraah?.name || 'غير محدد' }}</span>
        </div>

        <div class="info-row info-row--blue">
          <span class="info-row__label">الرواية:</span>
          <span class="info-row__value">{{ recitation.riwayah?.name || 'غير محدد' }}</span>
        </div>

        <div class="info-row">
          <span class="info-row__label">الأسلوب:</span>
          <span class="info-row__value">{{ recitation.style || 'غير محدد' }}</span>
        </div>

        <div class="info-row">
          <span class="info-row__label">الجودات:</span>
          <div class="info-row__tags">
            <span class="info-tag">128kbps</span>
            <span class="info-tag">64kbps</span>
          </div>
        </div>
      </div>

      <div class="recitation-card__footer">
        <a
          nz-button
          nzType="primary"
          [routerLink]="['/quranic-cms/audio/reciters', recitation.reciter.id]"
          class="recitation-card__btn"
        >
          عرض المقرئ
        </a>
      </div>
    </div>
  `,
  styleUrl: './recitation-card.component.less',
})
export class RecitationCardComponent {
  private readonly modal = inject(NzModalService);

  @Input({ required: true }) recitation!: RecitationItem;
  @Output() delete = new EventEmitter<number>();

  get nameEnWithStyle(): string {
    const reciter = this.recitation.reciter;
    const englishName = reciter?.name_en || (reciter as any)?.en_name || (reciter as any)?.nameEn;

    if (!englishName) return '';

    let styleEn = '';
    if (this.recitation.style) {
      if (this.recitation.style.includes('مرتل')) styleEn = 'Murattal';
      else if (this.recitation.style.includes('مجود')) styleEn = 'Mujawwad';
      else styleEn = this.recitation.style;
    }

    return styleEn ? `${englishName} (${styleEn})` : englishName;
  }

  showDeleteConfirm(): void {
    this.modal.confirm({
      nzTitle: 'هل أنت متأكد من حذف هذا المصحف؟',
      nzContent:
        '<b>هذا الإجراء لا يمكن التراجع عنه.</b> سيتم حذف جميع البيانات المرتبطة بهذا المصحف.',
      nzOkText: 'نعم، قم بالحذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzOnOk: () => {
        this.delete.emit(this.recitation.id);
      },
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
    });
  }
}
