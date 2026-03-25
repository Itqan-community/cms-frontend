import { Component } from '@angular/core';

@Component({
  selector: 'app-recitations-banner',
  standalone: true,
  template: `
    <div class="recitations-banner">
      <div class="recitations-banner__content">
        <h2 class="recitations-banner__title">
          <i class="bx bx-microphone"></i> إدارة المصاحف الصوتية
        </h2>
        <p class="recitations-banner__subtitle">
          تصفّح المصاحف الصوتية المسجّلة بالمكتبة، وأضف مصاحف جديدة مع تفاصيل الرواية والقراءات.
        </p>
      </div>
    </div>
  `,
  styleUrl: './recitations-banner.component.less',
})
export class RecitationsBannerComponent {}
