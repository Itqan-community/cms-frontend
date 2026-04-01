import { Component, inject, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-coming-soon',
  standalone: true,
  templateUrl: './coming-soon.component.html',
  styleUrls: ['./coming-soon.component.less'],
})
export class ComingSoonComponent {
  private readonly route = inject(ActivatedRoute);

  /** Emoji from route data or default */
  emoji = computed(() => this.route.snapshot.data['emoji'] ?? '📋');
}
