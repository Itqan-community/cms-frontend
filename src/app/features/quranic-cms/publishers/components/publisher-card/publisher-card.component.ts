import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzCardModule } from 'ng-zorro-antd/card';

import { Publisher } from '../../models/publishers-stats.models';

@Component({
  selector: 'app-publisher-card',
  standalone: true,
  imports: [NzCardModule, NzAvatarModule],
  template: `
    <nz-card class="publisher-card">
      <div class="card-actions">
        <i
          class="bx bx-edit-alt edit-btn"
          role="button"
          tabindex="0"
          aria-label="تعديل الناشر"
          (click)="onEdit()"
          (keyup.enter)="onEdit()"
        ></i>
        <i
          class="bx bx-trash delete-btn"
          role="button"
          tabindex="0"
          aria-label="حذف الناشر"
          (click)="onDelete()"
          (keyup.enter)="onDelete()"
        ></i>
      </div>

      <div class="card-identity">
        <nz-avatar [nzSize]="64" [nzSrc]="publisher.icon_url" nzIcon="user" class="publisher-logo">
        </nz-avatar>

        <div class="name-container">
          <h2 class="name-ar">
            {{ publisher.name_ar }}
            @if (publisher.is_verified) {
              <i class="bx bxs-check-circle verified-icon"></i>
            }
          </h2>
          <p class="name-en">{{ publisher.name_en }}</p>
        </div>
      </div>

      @if (publisher.description) {
        <div class="card-body">
          <p class="description-text">{{ publisher.description }}</p>
        </div>
      }

      <div class="card-details">
        @if (publisher.country) {
          <div class="detail-row">
            <i class="bx bx-map"></i>
            <span>{{ publisher.country }}</span>
          </div>
        }

        @if (publisher.foundation_year) {
          <div class="detail-row">
            <i class="bx bx-calendar"></i>
            <span>تأسس عام {{ publisher.foundation_year }}</span>
          </div>
        }

        @if (publisher.address) {
          <div class="detail-row">
            <i class="bx bx-pin"></i>
            <span>{{ publisher.address }}</span>
          </div>
        }

        @if (publisher.website) {
          <div class="detail-row">
            <i class="bx bx-globe"></i>
            <a [href]="publisher.website" target="_blank">{{ publisher.website }}</a>
          </div>
        }

        @if (publisher.contact_email) {
          <div class="detail-row">
            <i class="bx bx-envelope"></i>
            <span>{{ publisher.contact_email }}</span>
          </div>
        }
      </div>
    </nz-card>
  `,
  styles: [
    `
      .publisher-card {
        border-radius: 16px;
        direction: rtl;
        border: 1px solid #f0f0f0;
        transition: box-shadow 0.3s ease;
      }
      .publisher-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      /* Actions Styling */
      .card-actions {
        display: flex;
        justify-content: flex-start;
        gap: 12px;
        margin-bottom: 10px;
      }

      .card-actions {
        display: flex;
        justify-content: end;
      }

      .card-actions i {
        font-size: 20px;
        cursor: pointer;
        padding: 5px;
        border-radius: 6px;
        transition: background 0.2s;
      }
      .edit-btn {
        color: #1890ff;
      }
      .edit-btn:hover {
        background: #e6f7ff;
      }
      .delete-btn {
        color: #ff4d4f;
      }
      .delete-btn:hover {
        background: #fff1f0;
      }

      /* Identity Styling */
      .card-identity {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 16px;
      }
      .name-ar {
        font-size: 22px;
        font-weight: 700;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .verified-icon {
        color: #1890ff;
        font-size: 18px;
      }
      .name-en {
        color: #8c8c8c;
        margin: 0;
        font-size: 14px;
      }

      /* Content Styling */
      .description-text {
        font-size: 14px;
        color: #595959;
        line-height: 1.6;
        margin-bottom: 16px;
      }

      .card-details {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .detail-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: #595959;
      }
      .detail-row i {
        font-size: 18px;
        color: #bfbfbf;
      }
      .detail-row a {
        color: #1890ff;
        text-decoration: none;
      }
    `,
  ],
})
export class PublisherCardComponent {
  @Input() publisher!: Publisher;

  // Events to notify the parent component
  @Output() edit = new EventEmitter<Publisher>();
  @Output() delete = new EventEmitter<Publisher>();

  onEdit() {
    this.edit.emit(this.publisher);
  }

  onDelete() {
    this.delete.emit(this.publisher);
  }
}
