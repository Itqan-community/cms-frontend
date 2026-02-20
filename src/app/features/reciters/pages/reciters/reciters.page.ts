import { Component, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ReciterFormComponent } from '../../components/reciter-form/reciter-form.component';
import { RecitersListComponent } from '../../components/reciters-list/reciters-list.component';

@Component({
  selector: 'app-reciters-page',
  standalone: true,
  imports: [TranslateModule, ReciterFormComponent, RecitersListComponent],
  templateUrl: './reciters.page.html',
  styleUrls: ['./reciters.page.less'],
})
export class RecitersPage {
  private readonly recitersList = viewChild(RecitersListComponent);

  onReciterCreated(): void {
    this.recitersList()?.loadReciters();
  }
}
