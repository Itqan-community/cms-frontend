import { Component } from '@angular/core';

@Component({
  selector: 'app-asset-detail-skeleton',
  template: `
    <div class="asset-detail-skeleton" aria-hidden="true">
      <div class="asset-detail-skeleton__content">
        <div class="asset-detail-skeleton__main">
          <div class="skeleton skeleton--title"></div>
          <div class="skeleton skeleton--description"></div>
          <div class="skeleton skeleton--description-short"></div>
          <div class="skeleton skeleton--image"></div>
        </div>
        <div class="asset-detail-skeleton__sidebar">
          <div class="skeleton skeleton--card"></div>
          <div class="skeleton skeleton--card"></div>
          <div class="skeleton skeleton--card-short"></div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './asset-detail-skeleton.component.less',
})
export class AssetDetailSkeletonComponent {}
