import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import {
    Component,
    Input
} from '@angular/core';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Publisher } from '../../models/publishers-stats.models';
import { PublisherCardComponent } from '../publisher-card/publisher-card.component';

@Component({
  selector: 'app-publisher-list',
  standalone: true,
  imports: [
    CommonModule,
    NzGridModule,
    NzEmptyModule,
    NzSpinModule,
    PublisherCardComponent,
    ScrollingModule,
  ],
  template: `
    <div class="list-container" #scrollContainer>
      <div nz-row [nzGutter]="[16, 16]">
        <div
          nz-col
          [nzXs]="24"
          [nzSm]="12"
          [nzMd]="8"
          [nzLg]="8"
          *ngFor="let publisher of publishers"
        >
          <app-publisher-card [publisher]="publisher"></app-publisher-card>
        </div>
      </div>

      <div *ngIf="loading" class="loading-spinner">
        <nz-spin nzSimple nzSize="large"></nz-spin>
      </div>

      <div *ngIf="!loading && publishers.length === 0" class="empty-state">
        <nz-empty nzNotFoundImage="simple" nzNotFoundContent="No publishers found"></nz-empty>
      </div>

      <div *ngIf="!hasMore && publishers.length > 0" class="no-more">
        <p>لا يوجد المزيد من الناشرين</p>
      </div>
    </div>
  `,
  styles: [
    `
      .list-container {
        min-height: 400px;
      }
      .loading-spinner {
        display: flex;
        justify-content: center;
        padding: 24px;
      }
      .empty-state {
        padding: 60px 0;
      }
      .no-more {
        text-align: center;
        padding: 24px;
        color: #8c8c8c;
      }
    `,
  ],
})
export class PublisherListComponent {
  @Input() publishers: Publisher[] = [];
  @Input() loading = false;
  @Input() hasMore = true;
}
