import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Recitation } from '../../models/recitation.model';

@Component({
  selector: 'app-recitation-card',
  standalone: true,
  imports: [TranslateModule, NzTagModule, NzButtonModule, NzModalModule],
  templateUrl: './recitation-card.component.html',
  styleUrls: ['./recitation-card.component.less'],
})
export class RecitationCardComponent {
  private readonly modal = inject(NzModalService);
  private readonly router = inject(Router);

  recitation = input.required<Recitation>();
  deleted = output<number>();

  viewReciter(): void {
    this.router.navigate(['/reciters']);
  }

  confirmDelete(): void {
    this.modal.confirm({
      nzTitle: 'RECITATIONS.CARDS.DELETE_CONFIRM_TITLE',
      nzContent: 'RECITATIONS.CARDS.DELETE_CONFIRM_MESSAGE',
      nzOkText: 'RECITATIONS.CARDS.DELETE_OK',
      nzOkDanger: true,
      nzCancelText: 'COMMON.CANCEL',
      nzOnOk: () => {
        this.deleted.emit(this.recitation().id);
      },
    });
  }
}
