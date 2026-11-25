import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { IssueReportOut } from '../../models/issues.models';
import { IssuesService } from '../../services/issues.service';
import { IssueDetailComponent } from './issue-detail.component';

describe('IssueDetailComponent', () => {
  const issue = {
    id: 42,
    asset_id: 7,
    asset_name: 'Warsh & Hafs',
    reporter: { id: 1, name: 'Amina', email: null },
    status: 'pending',
    description: 'The ayah audio is cut short.',
    context: null,
    context_label: '',
    created_at: '2026-01-01T00:00:00Z',
  } as unknown as IssueReportOut;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IssueDetailComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { params: { id: '42' } } } },
        {
          provide: IssuesService,
          useValue: { get: () => of(issue), listComments: () => of([]) },
        },
      ],
    });
    TestBed.overrideProvider(NzModalService, { useValue: {} });
  });

  it('shows the comment thread for the issue in place of a mailto link', () => {
    // Arrange
    const fixture = TestBed.createComponent(IssueDetailComponent);

    // Act
    fixture.detectChanges();

    // Assert
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-issue-comments')).not.toBeNull();
    expect(el.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(el.querySelector('.issue-detail__reporter')?.textContent).toContain('Amina');
  });
});
