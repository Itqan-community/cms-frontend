import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

@Component({
  selector: 'app-privacy',
  imports: [NzTypographyModule, TranslateModule],
  templateUrl: './privacy.page.html',
  styleUrl: './privacy.page.less',
})
export class PrivacyPage {}
