import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ReciterFormComponent } from '../../components/reciter-form/reciter-form.component';
import { Reciter } from '../../models/reciter.model';

@Component({
  selector: 'app-reciters-page',
  standalone: true,
  imports: [TranslateModule, ReciterFormComponent],
  templateUrl: './reciters.page.html',
  styleUrls: ['./reciters.page.less'],
})
export class RecitersPage {
  onReciterCreated(reciter: Reciter): void {
    console.log('Reciter created:', reciter);
  }
}
