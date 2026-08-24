import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'app-not-found.page',
  imports: [NgIcon, NzButtonModule, TranslateModule, RouterLink],
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.less',
})
export class NotFoundPage {}
