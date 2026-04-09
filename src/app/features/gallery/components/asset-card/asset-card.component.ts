import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { Categories } from '../../../../core/enums/categories.enum';
import { LicenseTagComponent } from '../../../../shared/components/license-tag/license-tag.component';
import { Asset } from '../../models/assets.model';

@Component({
  selector: 'app-asset-card',
  imports: [LicenseTagComponent, TranslatePipe, RouterLink, NzButtonComponent, NgIcon],
  styleUrl: './asset-card.component.less',
  template: `
    <div class="asset-card">
      <div class="asset-card__header">
        <ng-icon [name]="categoryIconName" />
        <app-license-tag [license]="asset().license" [muted]="true" />
      </div>
      <div class="asset-card__content">
        <div class="content-wrapper">
          <div class="main-content">
            <div class="text-content">
              <h3>{{ asset().name }}</h3>
              <p>{{ asset().description }}</p>
            </div>
            <div class="publisher-info">
              <div class="publisher-text">
                <span class="label">{{ 'UI.PUBLISHER_LABEL' | translate }}</span>
                <a routerLink="/publisher/{{ asset().publisher.id }}">{{
                  asset().publisher.name
                }}</a>
              </div>
            </div>
          </div>
          <div class="button-container">
            <a nz-button nzSize="large" routerLink="/gallery/asset/{{ asset().id }}" class="w-full">
              <ng-icon name="lucideEye" />
              {{ 'GALLERY.VIEW_DETAILS' | translate }}
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AssetCardComponent {
  asset = input.required<Asset>();

  get categoryIconName(): string {
    switch (this.asset().category) {
      case Categories.MUSHAF:
        return 'lucideBookmark';
      case Categories.TAFSIR:
        return 'lucideFileText';
      case Categories.RECITATION:
        return 'lucideMic';
      default:
        return 'lucideFile';
    }
  }
}
