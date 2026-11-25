import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of, throwError } from 'rxjs';
import { IssueReportComment } from '../../models/issues.models';
import { IssuesService } from '../../services/issues.service';
import { IssueCommentsComponent } from './issue-comments.component';

describe('IssueCommentsComponent', () => {
  const memberComment: IssueReportComment = {
    id: 1,
    author: { id: 5, name: 'Member', is_reporter: false },
    body: 'We are looking into it.',
    created_at: '2026-01-01T00:00:00Z',
  };
  const reporterComment: IssueReportComment = {
    id: 2,
    author: { id: 9, name: 'Amina', is_reporter: true },
    body: 'Thanks!',
    created_at: '2026-01-02T00:00:00Z',
  };

  let service: jasmine.SpyObj<IssuesService>;
  let message: jasmine.SpyObj<NzMessageService>;

  beforeEach(() => {
    service = jasmine.createSpyObj<IssuesService>('IssuesService', ['listComments', 'addComment']);
    message = jasmine.createSpyObj<NzMessageService>('NzMessageService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [IssueCommentsComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        { provide: IssuesService, useValue: service },
        { provide: NzMessageService, useValue: message },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(IssueCommentsComponent);
    fixture.componentRef.setInput('issueId', 42);
    fixture.detectChanges();
    return fixture;
  }

  it('lists the thread oldest first and marks the reporter', () => {
    // Arrange
    service.listComments.and.returnValue(of([memberComment, reporterComment]));

    // Act
    const fixture = create();

    // Assert
    expect(service.listComments).toHaveBeenCalledWith(42);
    const items = fixture.nativeElement.querySelectorAll('.issue-comments__item');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('We are looking into it.');
    expect(items[1].querySelector('nz-tag')).not.toBeNull();
    expect(items[0].querySelector('nz-tag')).toBeNull();
  });

  it('sends a trimmed comment, appends it and clears the box', () => {
    // Arrange
    service.listComments.and.returnValue(of([]));
    service.addComment.and.returnValue(of(memberComment));
    const fixture = create();
    const component = fixture.componentInstance;
    component.draft.set('  We are looking into it.  ');

    // Act
    component.send();
    fixture.detectChanges();

    // Assert
    expect(service.addComment).toHaveBeenCalledWith(42, { body: 'We are looking into it.' });
    expect(component.comments()).toEqual([memberComment]);
    expect(component.draft()).toBe('');
    expect(message.success).toHaveBeenCalledTimes(1);
  });

  it('does not send a blank comment', () => {
    // Arrange
    service.listComments.and.returnValue(of([]));
    const component = create().componentInstance;
    component.draft.set('   ');

    // Act
    component.send();

    // Assert
    expect(component.canSend()).toBeFalse();
    expect(service.addComment).not.toHaveBeenCalled();
  });

  it("shows the backend's message once when sending fails and keeps the draft", () => {
    // Arrange
    service.listComments.and.returnValue(of([]));
    service.addComment.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { error_name: 'comment_too_long', message: 'A comment cannot exceed 2000.' },
          })
      )
    );
    const component = create().componentInstance;
    component.draft.set('Too long');

    // Act
    component.send();

    // Assert
    expect(message.error).toHaveBeenCalledOnceWith('A comment cannot exceed 2000.');
    expect(component.draft()).toBe('Too long');
    expect(component.sending()).toBeFalse();
  });

  it("shows the backend's message inline when the thread fails to load", () => {
    // Arrange
    service.listComments.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: { error_name: 'report_not_found', message: 'Issue report not found.' },
          })
      )
    );

    // Act
    const fixture = create();

    // Assert
    expect(fixture.componentInstance.loadError()).toBe('Issue report not found.');
    expect(fixture.nativeElement.querySelector('nz-alert')).not.toBeNull();
  });

  it('hides the form when the viewer may not comment', () => {
    // Arrange
    service.listComments.and.returnValue(of([]));
    const fixture = TestBed.createComponent(IssueCommentsComponent);
    fixture.componentRef.setInput('issueId', 42);
    fixture.componentRef.setInput('canComment', false);

    // Act
    fixture.detectChanges();

    // Assert
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
});
