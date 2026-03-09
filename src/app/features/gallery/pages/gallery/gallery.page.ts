import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AssetsListingComponent } from '../../components/assets-listing/assets-listing.component';

@Component({
  selector: 'app-gallery-page',
  standalone: true,
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.less'],
  imports: [AssetsListingComponent, TranslateModule],
})
export class GalleryPage {}
