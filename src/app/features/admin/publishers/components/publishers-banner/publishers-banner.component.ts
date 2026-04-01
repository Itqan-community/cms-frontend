import { Component } from '@angular/core';

@Component({
  selector: 'app-publishers-banner',
  standalone: true,
  imports: [],
  template: `
    <div class="banner-container">
      <div class="banner-content">
        <div class="banner-icon-wrapper">
          <i class="bx bx-newspaper"></i>
        </div>

        <div class="text-group">
          <h1 class="banner-title">الناشرون والمصادر</h1>
          <p class="banner-description">
            إدارة الجهات والمؤسسات التي نحصل منها على المحتوى القرآني
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .banner-container {
        background: #0076df;
        padding: 25px 40px;
        border-radius: 12px;
        margin-bottom: 24px;
        color: white;
        direction: rtl;
      }
      .banner-content {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 20px;
        justify-content: flex-start;
      }
      .banner-icon-wrapper {
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .banner-icon-wrapper i {
        font-size: 60px;
        line-height: 1;
        color: white;
      }

      .text-group {
        text-align: right;
      }
      .banner-title {
        font-size: 2rem;
        margin: 0;
        color: white;
        font-weight: 600;
      }
      .banner-description {
        margin-top: 5px;
        font-size: 1rem;
        opacity: 0.85;
      }
    `,
  ],
})
export class PublishersBannerComponent {}
