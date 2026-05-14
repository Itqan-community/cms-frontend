import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { Subject, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs';
import { Categories } from '../../../../../core/enums/categories.enum';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { AuthService } from '../../../../../core/auth/services/auth.service';
import { Asset } from '../../../../gallery/models/assets.model';
import { AssetsService } from '../../../../gallery/services/assets.service';
import { IssueReportStatus } from '../../models/issues.models';
import { IssuesService } from '../../services/issues.service';

@Component({
  selector: 'app-issue-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzFormModule,
    NgIcon,
    NzInputModule,
    NzSelectModule,
    NzSkeletonModule,
    TranslateModule,
  ],
  templateUrl: './issue-form.component.html',
  styleUrl: './issue-form.component.less',
})
export class IssueFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly issuesService = inject(IssuesService);
  private readonly assetsService = inject(AssetsService);
  private readonly authService = inject(AuthService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly assetSearch = new Subject<string>();

  readonly isEditMode = signal(false);
  readonly loadingDetail = signal(false);
  readonly submitting = signal(false);
  readonly assetOptions = signal<Asset[]>([]);
  readonly assetsLoading = signal(false);

  readonly statusOptions: IssueReportStatus[] = [
    'pending',
    'under_review',
    'resolved',
    'dismissed',
  ];

  readonly form = this.fb.group({
    asset_id: [null as number | null, Validators.required],
    description: ['', [Validators.required, Validators.minLength(3)]],
    status: [null as IssueReportStatus | null],
  });

  private editId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const isEdit = this.route.snapshot.routeConfig?.path === ':id/edit';
    if (isEdit && idParam != null) {
      this.isEditMode.set(true);
      this.editId = Number(idParam);
      this.form.get('asset_id')?.disable();
      this.form.get('status')?.setValidators([Validators.required]);
      this.loadForEdit();
    }

    const publisherId = this.authService.currentUser()?.publisher_id ?? undefined;

    this.assetSearch
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          this.assetsLoading.set(true);
          return this.assetsService
            .getAssets([], q ?? '', [], publisherId ?? null)
            .pipe(finalize(() => this.assetsLoading.set(false)));
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => this.assetOptions.set(res.results),
        error: () => this.assetOptions.set([]),
      });

    if (!this.isEditMode()) {
      this.assetSearch.next('');
    }
  }

  onAssetSearch(query: string): void {
    this.assetSearch.next(query?.trim() ?? '');
  }

  statusLabel(s: IssueReportStatus): string {
    return this.translate.instant(`ADMIN.ISSUES.STATUS.${s.toUpperCase()}`);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    this.submitting.set(true);

    if (this.isEditMode() && this.editId != null) {
      const description = this.form.get('description')?.value ?? '';
      const status = this.form.get('status')?.value ?? null;
      this.issuesService
        .patch(this.editId, { description, status })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            this.message.success(this.translate.instant('ADMIN.ISSUES.MESSAGES.UPDATE_SUCCESS'));
            this.submitting.set(false);
            void this.router.navigate(['/admin/issues', res.id]);
          },
          error: () => {
            this.submitting.set(false);
            this.message.error(this.translate.instant('ADMIN.ISSUES.MESSAGES.UPDATE_ERROR'));
          },
        });
      return;
    }

    const asset_id = this.form.get('asset_id')?.value;
    const description = this.form.get('description')?.value ?? '';
    if (asset_id == null) {
      this.submitting.set(false);
      return;
    }

    this.issuesService
      .create({ asset_id, description })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.message.success(this.translate.instant('ADMIN.ISSUES.MESSAGES.CREATE_SUCCESS'));
          this.submitting.set(false);
          void this.router.navigate(['/admin/issues', res.id]);
        },
        error: () => {
          this.submitting.set(false);
          this.message.error(this.translate.instant('ADMIN.ISSUES.MESSAGES.CREATE_ERROR'));
        },
      });
  }

  private loadForEdit(): void {
    if (this.editId == null) return;
    this.loadingDetail.set(true);
    this.issuesService
      .get(this.editId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (issue) => {
          this.form.patchValue({
            asset_id: issue.asset_id,
            description: issue.description,
            status: issue.status,
          });
          this.assetOptions.set([
            {
              id: issue.asset_id,
              category: Categories.TAFSIR,
              name: issue.asset_name,
              description: '',
              publisher: { id: 0, name: '' },
              license: Licenses.CC0,
            },
          ]);
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
          this.message.error(this.translate.instant('ADMIN.ISSUES.MESSAGES.LOAD_ERROR'));
        },
      });
  }
}
