import { Component, inject, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SeoService } from '../../core/services/seo.service';
import { NgIcon } from '@ng-icons/core';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-content-standards-page',
  standalone: true,
  imports: [TranslateModule, BreadcrumbComponent, NgIcon],
  templateUrl: './content-standards.page.html',
  styleUrls: ['./content-standards.page.less'],
})
export class UsageStandardsPage implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);

  ngOnInit(): void {
    this.seo.setSeo({
      title: `${this.translate.instant('CONTENT_STANDARDS.TITLE')} | ITQAN`,
      description: this.translate.instant('CONTENT_STANDARDS.DESCRIPTION'),
      path: '/content-standards',
    });
  }
}
