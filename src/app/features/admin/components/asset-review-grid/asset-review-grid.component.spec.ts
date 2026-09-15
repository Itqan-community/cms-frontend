import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of, throwError } from 'rxjs';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import type { ReviewChange, ReviewChangesResponse } from '../../models/asset-review.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetReviewService } from '../../services/asset-review.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { AssetReviewGridComponent } from './asset-review-grid.component';

describe('AssetReviewGridComponent', () => {
  let component: AssetReviewGridComponent;
  let fixture: ComponentFixture<AssetReviewGridComponent>;
  let reviewServiceSpy: jasmine.SpyObj<AssetReviewService>;
  let adminAuthSpy: jasmine.SpyObj<AdminAuthService>;
  let lastLanguageSpy: jasmine.SpyObj<LastActiveLanguageService>;
  let messageSpy: jasmine.SpyObj<NzMessageService>;

  const mockChange: ReviewChange = {
    id: 1,
    sura: 1,
    aya: 1,
    surah_name: 'الفاتحة',
    change_type: 'modified',
    old_text: 'old text',
    new_text: 'new text',
    baseline_text: 'baseline text',
    commit_ref: 'c123456',
    commit_id: 10,
    review_state: 'unreviewed',
    comment: '',
    reviewed_by: null,
    reviewed_at: null,
  };

  const mockResponse: ReviewChangesResponse = {
    count: 1,
    results: [mockChange],
  };

  beforeEach(async () => {
    reviewServiceSpy = jasmine.createSpyObj('AssetReviewService', [
      'listLanguages',
      'listChanges',
      'setState',
    ]);
    adminAuthSpy = jasmine.createSpyObj('AdminAuthService', ['hasPermission']);
    lastLanguageSpy = jasmine.createSpyObj('LastActiveLanguageService', ['get', 'set']);
    messageSpy = jasmine.createSpyObj('NzMessageService', ['success', 'error', 'warning', 'info']);

    adminAuthSpy.hasPermission.and.callFake(
      (perm: string) => perm === PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT
    );
    reviewServiceSpy.listLanguages.and.returnValue(of(['en', 'fr']));
    reviewServiceSpy.listChanges.and.returnValue(of(mockResponse));
    reviewServiceSpy.setState.and.returnValue(of({ ...mockChange, review_state: 'approved' }));
    lastLanguageSpy.get.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AssetReviewGridComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        { provide: AssetReviewService, useValue: reviewServiceSpy },
        { provide: AdminAuthService, useValue: adminAuthSpy },
        { provide: LastActiveLanguageService, useValue: lastLanguageSpy },
        { provide: NzMessageService, useValue: messageSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetReviewGridComponent);
    component = fixture.componentInstance;
    component.kind = 'translation';
    component.slug = 'en-sahih';
  });

  it('should create and load languages on init when user has permission', () => {
    fixture.detectChanges();

    expect(adminAuthSpy.hasPermission).toHaveBeenCalledWith(
      PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT
    );
    expect(reviewServiceSpy.listLanguages).toHaveBeenCalledWith('translation', 'en-sahih');
    expect(component.languages()).toEqual(['en', 'fr']);
    expect(component.selectedLanguage()).toBe('en');
    expect(reviewServiceSpy.listChanges).toHaveBeenCalled();
  });

  it('should restore remembered language from LastActiveLanguageService', () => {
    lastLanguageSpy.get.and.returnValue('fr');

    fixture.detectChanges();

    expect(component.selectedLanguage()).toBe('fr');
    expect(reviewServiceSpy.listChanges).toHaveBeenCalledWith(
      'translation',
      'en-sahih',
      'fr',
      1,
      25,
      'unreviewed'
    );
  });

  it('should not load languages on init when user lacks permission', () => {
    adminAuthSpy.hasPermission.and.returnValue(false);
    const unauthorizedFixture = TestBed.createComponent(AssetReviewGridComponent);
    const unauthorizedComp = unauthorizedFixture.componentInstance;
    unauthorizedComp.kind = 'translation';
    unauthorizedComp.slug = 'en-sahih';

    unauthorizedFixture.detectChanges();

    expect(unauthorizedComp.canReview()).toBe(false);
    expect(reviewServiceSpy.listLanguages).not.toHaveBeenCalled();
  });

  it('should handle listLanguages failure gracefully and flag languagesError', () => {
    reviewServiceSpy.listLanguages.and.returnValue(throwError(() => new Error('API down')));

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.languagesError()).toBe(true);
    expect(component.languages()).toEqual([]);
  });

  it('should switch language, update lastLanguage, and reload changes on page 1', () => {
    fixture.detectChanges();
    reviewServiceSpy.listChanges.calls.reset();

    component.page.set(3);
    component.onLanguageChange('fr');

    expect(component.selectedLanguage()).toBe('fr');
    expect(lastLanguageSpy.set).toHaveBeenCalledWith('translation', 'en-sahih', 'fr');
    expect(component.page()).toBe(1);
    expect(reviewServiceSpy.listChanges).toHaveBeenCalledWith(
      'translation',
      'en-sahih',
      'fr',
      1,
      25,
      'unreviewed'
    );
  });

  it('should switch filter and reload changes on page 1', () => {
    fixture.detectChanges();
    reviewServiceSpy.listChanges.calls.reset();

    component.page.set(2);
    component.onFilterChange('approved');

    expect(component.stateFilter()).toBe('approved');
    expect(component.page()).toBe(1);
    expect(reviewServiceSpy.listChanges).toHaveBeenCalledWith(
      'translation',
      'en-sahih',
      'en',
      1,
      25,
      'approved'
    );
  });

  it('should approve a row with approve action tracking', () => {
    fixture.detectChanges();

    component.approve(mockChange);

    expect(reviewServiceSpy.setState).toHaveBeenCalledWith(
      'translation',
      'en-sahih',
      mockChange.id,
      'approved',
      undefined
    );
    expect(messageSpy.success).toHaveBeenCalled();
  });

  it('should unreview a row with unreview action tracking', () => {
    fixture.detectChanges();
    reviewServiceSpy.setState.and.returnValue(of({ ...mockChange, review_state: 'unreviewed' }));

    component.unreview(mockChange);

    expect(reviewServiceSpy.setState).toHaveBeenCalledWith(
      'translation',
      'en-sahih',
      mockChange.id,
      'unreviewed',
      undefined
    );
  });

  it('should open comment dialog and submit comment with action tracking', () => {
    fixture.detectChanges();
    reviewServiceSpy.setState.and.returnValue(
      of({ ...mockChange, review_state: 'commented', comment: 'Needs fix' })
    );

    component.openComment(mockChange);
    expect(component.commentOpen()).toBe(true);
    expect(component.commentChangeId).toBe(mockChange.id);

    component.commentText.set('Needs fix');
    component.confirmComment();

    expect(reviewServiceSpy.setState).toHaveBeenCalledWith(
      'translation',
      'en-sahih',
      mockChange.id,
      'commented',
      'Needs fix'
    );
    expect(component.commentOpen()).toBe(false);
    expect(component.commentChangeId).toBeNull();
  });

  it('should close comment dialog and reset state on closeComment', () => {
    component.openComment(mockChange);
    expect(component.commentOpen()).toBe(true);

    component.closeComment();
    expect(component.commentOpen()).toBe(false);
    expect(component.commentChangeId).toBeNull();
  });

  it('should not submit comment if text is empty', () => {
    component.openComment(mockChange);
    component.commentText.set('   ');
    component.confirmComment();

    expect(reviewServiceSpy.setState).not.toHaveBeenCalled();
  });
});
