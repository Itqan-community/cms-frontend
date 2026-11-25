import { TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { reporterLabel } from './issue-reporter.util';

describe('reporterLabel', () => {
  let translate: TranslateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TranslateModule.forRoot()] });
    translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      ADMIN: { ISSUES: { DETAIL: { REPORTER_FALLBACK: 'Reporter #{{id}}' } } },
    });
    translate.use('en');
  });

  it('shows the name when the reporter has one', () => {
    // Act
    const label = reporterLabel({ id: 3, name: 'Amina', email: 'amina@example.com' }, translate);

    // Assert
    expect(label).toBe('Amina');
  });

  it('falls back to the email staff see when the name is blank', () => {
    // Act
    const label = reporterLabel({ id: 3, name: '  ', email: 'amina@example.com' }, translate);

    // Assert
    expect(label).toBe('amina@example.com');
  });

  it('shows "Reporter #id" to publisher members when there is no name and the email is hidden', () => {
    // Act
    const label = reporterLabel({ id: 3, name: '', email: null }, translate);

    // Assert
    expect(label).toBe('Reporter #3');
  });
});
