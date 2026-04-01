import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-publishers-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="publishers-layout">
      <nav class="custom-nav-container">
        <div class="nav-pill-wrapper">
          <a routerLink="/admin/publishers/sources" routerLinkActive="active" class="nav-item"
            >المصادر</a
          >

          <a routerLink="/admin/publishers/authors" routerLinkActive="active" class="nav-item"
            >المؤلفون</a
          >

          <a
            routerLink="/admin/publishers"
            [routerLinkActiveOptions]="{ exact: true }"
            routerLinkActive="active"
            class="nav-item"
            >الناشرون</a
          >
        </div>
      </nav>

      <main class="content-area">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [
    `
      .publishers-layout {
        background: white;
        margin-top: 45px;
        border-radius: 15px;
        border: solid #f0f2f5 3px;
        padding: 20px 0;
      }

      .custom-nav-container {
        display: flex;
        justify-content: center;
        margin-bottom: 30px;
      }

      .nav-pill-wrapper {
        background-color: #f0f2f5;
        border-radius: 50px;
        padding: 4px;
        display: inline-flex;
        border: 1px solid #e8e8e8;
        min-width: 400px;
        justify-content: space-between;
      }

      .nav-item {
        padding: 8px 35px;
        border-radius: 50px;
        text-decoration: none;
        color: #8c8c8c;
        font-size: 14px;
        transition: all 0.3s ease;
        text-align: center;
        flex: 1;
      }

      .active {
        background-color: #ffffff;
        color: #262626 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        font-weight: 500;
      }

      .content-area {
        padding: 0 24px;
      }
    `,
  ],
})
export class PublishersLayoutComponent {}
