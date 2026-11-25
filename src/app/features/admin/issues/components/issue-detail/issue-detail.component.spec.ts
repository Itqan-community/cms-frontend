import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { IssueReportOut } from '../../models/issues.models';
import { IssuesService } from '../../services/issues.service';
import { IssueDetailComponent } from './issue-detail.component';

describe('IssueDetailComponent', () => {
  const issue = {
    id: 42,
    asset_name: 'Warsh & Hafs',
    reporter: { id: 1, name: '', email: 'reporter@example.com' },
    status: 'pending',
    context: null,
    context_label: '',
    created_at: '2026-01-01T00:00:00Z',
  } as unknown as IssueReportOut;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IssueDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['id', '42']]) } } },
        { provide: IssuesService, useValue: { get: () => of(issue) } },
      ],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      ADMIN: { ISSUES: { DETAIL: { CONTACT_SUBJECT: 'Issue #{{id}}: {{asset}}' } } },
    });
    translate.use('en');
  });

  it('builds a mailto link to the reporter with the asset name and issue number in the subject', () => {
    // Arrange
    const component = TestBed.createComponent(IssueDetailComponent).componentInstance;

    // Act
    const href = component.contactHref(issue);

    // Assert
    expect(href).toBe(
      `mailto:reporter@example.com?subject=${encodeURIComponent('Issue #42: Warsh & Hafs')}`
    );
  });
});
