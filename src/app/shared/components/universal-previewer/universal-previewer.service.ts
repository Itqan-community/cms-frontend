import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NzDrawerRef, NzDrawerService } from 'ng-zorro-antd/drawer';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { UniversalPreviewerComponent } from './universal-previewer.component';
import {
  PreviewerConfig,
  PreviewerDrawerData,
  PreviewerModalData,
  PreviewSource,
} from './universal-previewer.types';
import { resolvePreviewTitle } from './universal-previewer.utils';

const DEFAULT_MODAL_WIDTH = 'min(900px, 92vw)';
const DEFAULT_DRAWER_WIDTH = 'min(900px, 92vw)';

@Injectable({ providedIn: 'root' })
export class PreviewerService {
  private readonly modal = inject(NzModalService);
  private readonly drawer = inject(NzDrawerService);
  private readonly translate = inject(TranslateService);

  open(source: PreviewSource, config: PreviewerConfig = {}): NzModalRef | NzDrawerRef {
    const host = config.host ?? 'modal';
    const title =
      resolvePreviewTitle(source, config.title) ||
      this.translate.instant('UNIVERSAL_PREVIEWER.DEFAULT_TITLE');

    if (host === 'drawer') {
      return this.drawer.create<UniversalPreviewerComponent, PreviewerDrawerData>({
        nzTitle: title,
        nzContent: UniversalPreviewerComponent,
        nzData: { source },
        nzWidth: config.width ?? DEFAULT_DRAWER_WIDTH,
        nzPlacement: config.drawerPlacement ?? 'right',
        nzClosable: true,
      });
    }

    return this.modal.create<UniversalPreviewerComponent, PreviewerModalData>({
      nzTitle: title,
      nzContent: UniversalPreviewerComponent,
      nzData: { source },
      nzFooter: null,
      nzWidth: config.width ?? DEFAULT_MODAL_WIDTH,
      nzCentered: true,
    });
  }
}
