import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  imports: [NgIcon, TranslateModule],
  templateUrl: './coming-soon.component.html',
  styleUrls: ['./coming-soon.component.less'],
})
export class ComingSoonComponent {
  private readonly route = inject(ActivatedRoute);

  icon = computed(() => this.route.snapshot.data['icon'] ?? 'lucideClock');
}
