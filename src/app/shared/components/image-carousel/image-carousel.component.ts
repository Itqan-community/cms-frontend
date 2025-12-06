import { Component, input } from '@angular/core';
import { NzCarouselModule } from 'ng-zorro-antd/carousel';

@Component({
  selector: 'app-image-carousel',
  imports: [NzCarouselModule],
  templateUrl: './image-carousel.component.html',
  styleUrl: './image-carousel.component.less',
})
export class ImageCarouselComponent {
  images = input<string[]>([]);
}
