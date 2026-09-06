import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminHomeComponent } from './admin-home.component';

describe('AdminHomeComponent', () => {
  let hasPermission: jasmine.Spy;
  let isItqanAdmin: jasmine.Spy;

  beforeEach(() => {
    hasPermission = jasmine.createSpy('hasPermission').and.returnValue(false);
    isItqanAdmin = jasmine.createSpy('isItqanAdmin').and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [AdminHomeComponent],
      providers: [
        {
          provide: AdminAuthService,
          useValue: { hasPermission, isItqanAdmin },
        },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
            getCurrentLang: () => 'en',
            onLangChange: of({ lang: 'en' }),
          },
        },
      ],
    });

    TestBed.overrideComponent(AdminHomeComponent, {
      set: { template: '' },
    });
  });

  it('omits the home card and keeps issues visible without extra permissions', () => {
    const fixture = TestBed.createComponent(AdminHomeComponent);
    const sections = fixture.componentInstance.sections();

    expect(sections.map((section) => section.route)).toEqual(['/admin/issues']);
  });

  it('includes only modules the user can access', () => {
    hasPermission.and.callFake(
      (code: string) =>
        code === PORTAL_PERMISSIONS.PORTAL_READ_RECITATION ||
        code === PORTAL_PERMISSIONS.PORTAL_ACCESS
    );

    const fixture = TestBed.createComponent(AdminHomeComponent);
    const sections = fixture.componentInstance.sections();

    expect(sections.map((section) => section.route)).toEqual([
      '/admin/recitations',
      '/admin/issues',
      '/admin/usage',
    ]);
  });
});
