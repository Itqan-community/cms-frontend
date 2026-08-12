import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';

interface AdminSection {
  titleKey: string;
  descriptionKey: string;
  icon: string;
  route: string;
}

const SECTIONS: AdminSection[] = [
  {
    titleKey: 'ADMIN.HOME.SECTION_RECITATIONS',
    descriptionKey: 'ADMIN.HOME.SECTION_RECITATIONS_DESC',
    icon: 'lucideVolume2',
    route: '/admin/recitations',
  },
  {
    titleKey: 'ADMIN.HOME.SECTION_ASSETS',
    descriptionKey: 'ADMIN.HOME.SECTION_ASSETS_DESC',
    icon: 'lucideAppWindow',
    route: '/admin/publishers',
  },
  {
    titleKey: 'ADMIN.HOME.SECTION_AUDIO',
    descriptionKey: 'ADMIN.HOME.SECTION_AUDIO_DESC',
    icon: 'lucideAudioLines',
    route: '/admin/audio',
  },
  {
    titleKey: 'ADMIN.HOME.SECTION_ANALYTICS',
    descriptionKey: 'ADMIN.HOME.SECTION_ANALYTICS_DESC',
    icon: 'lucideBarChart2',
    route: '/admin/usage',
  },
];

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [RouterLink, NzCardModule, NzGridModule, NgIcon, TranslateModule],
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.less'],
})
export class AdminHomeComponent {
  readonly sections = SECTIONS;
}
