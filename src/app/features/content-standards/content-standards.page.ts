import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-content-standards-page',
  standalone: true,
  imports: [TranslateModule, BreadcrumbComponent, NgIcon],
  templateUrl: './content-standards.page.html',
  styleUrls: ['./content-standards.page.less'],
})
export class UsageStandardsPage {}
