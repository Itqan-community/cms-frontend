import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzEmptyModule } from 'ng-zorro-antd/empty';

@Component({
  selector: 'app-empty-placeholder',
  standalone: true,
  imports: [NzEmptyModule],
  template: `
    <div class="placeholder-container">
      <nz-empty
        [nzNotFoundContent]="content"
        nzNotFoundImage="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
      >
        <ng-template #content>
          <span>قريباً: إدارة {{ title }}</span>
        </ng-template>
      </nz-empty>
    </div>
  `,
  styles: [
    `
      .placeholder-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 400px;
        background: white;
        border-radius: 12px;
        padding: 40px;
      }
    `,
  ],
})
export class EmptyPlaceholderComponent {
  private route = inject(ActivatedRoute);
  title = this.route.snapshot.data['title'] || 'المحتوى';
}
