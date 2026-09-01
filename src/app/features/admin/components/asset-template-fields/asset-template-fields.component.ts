import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { environment } from '../../../../../environments/environment';
import {
  CONTENT_TEMPLATES,
  MUSHAF_PRINTS,
  type ContentTemplate,
  type MushafPrint,
} from '../../models/content-template.models';

@Component({
  selector: 'app-asset-template-fields',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule, NzFormModule, NzGridModule, NzSelectModule],
  templateUrl: './asset-template-fields.component.html',
})
export class AssetTemplateFieldsComponent implements OnChanges {
  @Input({ required: true }) parentForm!: FormGroup;
  @Input() readOnly = false;

  readonly enabled = environment.assetTemplates;
  readonly templateOptions = CONTENT_TEMPLATES;
  readonly mushafPrintOptions = MUSHAF_PRINTS;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['parentForm'] && this.parentForm && this.enabled) {
      this.ensureControls();
    }
    if (changes['readOnly'] && this.parentForm) {
      this.applyReadOnly();
    }
  }

  get templateControl(): FormControl<ContentTemplate | null> {
    return this.parentForm.get('content_template') as FormControl<ContentTemplate | null>;
  }

  get mushafPrintControl(): FormControl<MushafPrint | null> {
    return this.parentForm.get('mushaf_print') as FormControl<MushafPrint | null>;
  }

  showMushafPrint(): boolean {
    return this.templateControl?.value === 'page';
  }

  private ensureControls(): void {
    if (!this.parentForm.contains('content_template')) {
      this.parentForm.addControl(
        'content_template',
        new FormControl<ContentTemplate>('ayah', {
          nonNullable: true,
          validators: [Validators.required],
        })
      );
    }
    if (!this.parentForm.contains('mushaf_print')) {
      this.parentForm.addControl('mushaf_print', new FormControl<MushafPrint | null>(null));
    }
    this.applyReadOnly();
  }

  private applyReadOnly(): void {
    if (!this.enabled) return;
    if (this.readOnly) {
      this.templateControl?.disable({ emitEvent: false });
      this.mushafPrintControl?.disable({ emitEvent: false });
    } else {
      this.templateControl?.enable({ emitEvent: false });
      if (this.showMushafPrint()) {
        this.mushafPrintControl?.enable({ emitEvent: false });
      }
    }
  }
}
