import { Component, computed, model } from '@angular/core';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';

const I18N = 'ADMIN.COMMON.INITIAL_VERSION';

@Component({
  selector: 'app-asset-initial-version-fields',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    NgIcon,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
  ],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './asset-initial-version-fields.component.html',
  styleUrl: './asset-initial-version-fields.component.less',
})
export class AssetInitialVersionFieldsComponent {
  /** Content file for the first asset version (distinct from thumbnail). */
  readonly versionFile = model<File | null>(null);
  readonly selectedFileName = computed(() => this.versionFile()?.name ?? null);

  readonly i18n = I18N;

  onPickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.versionFile.set(file);
    input.value = '';
  }

  clearFile(): void {
    this.versionFile.set(null);
  }
}
