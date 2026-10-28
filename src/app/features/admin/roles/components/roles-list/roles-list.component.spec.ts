import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideShieldCheck, lucideSquarePen, lucideTrash2 } from '@ng-icons/lucide';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { GroupDetailOut, GroupListOut } from '../../../members/models/groups.models';
import { GroupsService } from '../../../members/services/groups.service';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { RolesListComponent } from './roles-list.component';

const EDITORS: GroupListOut = { id: 7, name: 'المحررون', name_en: 'Editors', name_ar: 'المحررون' };
const EDITORS_DETAIL: GroupDetailOut = {
  ...EDITORS,
  permissions: [{ code_name: 'portal_read_reciter', name: 'لوحة التحكم - عرض القراء' }],
};

describe('RolesListComponent', () => {
  let fixture: ComponentFixture<RolesListComponent>;
  let component: RolesListComponent;
  let groups: jasmine.SpyObj<GroupsService>;
  let tenant: {
    refresh: jasmine.Spy;
    selectedPublisherId: ReturnType<typeof signal<number | null>>;
  };
  let granted: Set<string>;

  function setup(codes: string[]): void {
    granted = new Set(codes);
    groups = jasmine.createSpyObj<GroupsService>('GroupsService', [
      'list',
      'listPermissions',
      'get',
      'create',
      'update',
      'setPermissions',
      'delete',
    ]);
    groups.list.and.returnValue(of({ results: [EDITORS], count: 1 }));
    groups.listPermissions.and.returnValue(
      of([
        {
          key: 'reciters',
          name: 'القراء',
          permissions: [
            { code_name: 'portal_read_reciter', name: 'لوحة التحكم - عرض القراء', implies: [] },
            {
              code_name: 'portal_create_reciter',
              name: 'لوحة التحكم - إنشاء قراء',
              implies: ['portal_read_reciter', 'portal_update_reciter'],
            },
            {
              code_name: 'portal_update_reciter',
              name: 'لوحة التحكم - تحديث القراء',
              implies: ['portal_read_reciter', 'portal_create_reciter'],
            },
          ],
        },
      ])
    );
    groups.get.and.returnValue(of(EDITORS_DETAIL));
    tenant = {
      refresh: jasmine.createSpy('refresh').and.returnValue(of(true)),
      selectedPublisherId: signal(3),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RolesListComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideIcons({ lucidePlus, lucideShieldCheck, lucideSquarePen, lucideTrash2 }),
        { provide: GroupsService, useValue: groups },
        {
          provide: AdminAuthService,
          useValue: { hasPermission: (code: string) => granted.has(code) },
        },
        { provide: AdminTenantService, useValue: tenant },
      ],
    });
    fixture = TestBed.createComponent(RolesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  const el = (selector: string): HTMLElement | null =>
    (fixture.nativeElement as HTMLElement).querySelector(selector);

  it('lists roles by their English and Arabic names only', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP]);

    const headers = [...(fixture.nativeElement as HTMLElement).querySelectorAll('th')].length;
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Editors');
    expect(text).toContain('المحررون');
    expect(headers).toBe(3);
  });

  it('groups the permission checklist by usage', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP]);
    component.openEditor(EDITORS);
    fixture.detectChanges();

    expect(component.catalogue().map((g) => g.name)).toEqual(['القراء']);
    expect(document.body.textContent).toContain('القراء');
  });

  it('ticks and locks the permissions a selected one implies', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP, PORTAL_PERMISSIONS.PORTAL_UPDATE_GROUP]);
    groups.get.and.returnValue(of({ ...EDITORS_DETAIL, permissions: [] }));
    component.openEditor(EDITORS);

    component.togglePermission('portal_create_reciter', true);

    expect(component.isSelected('portal_read_reciter')).toBeTrue();
    expect(component.isLocked('portal_read_reciter')).toBeTrue();
    expect(component.isLocked('portal_update_reciter')).toBeTrue();
    expect(component.isLocked('portal_create_reciter')).toBeFalse();

    component.togglePermission('portal_create_reciter', false);

    expect(component.isSelected('portal_read_reciter')).toBeFalse();
  });

  it('hides the create button without the create permission', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP]);
    expect(el('[data-testid="roles-create"]')).toBeNull();

    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP, PORTAL_PERMISSIONS.PORTAL_CREATE_GROUP]);
    expect(el('[data-testid="roles-create"]')).not.toBeNull();
  });

  it('creates a role with both trimmed names and opens it for editing', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP, PORTAL_PERMISSIONS.PORTAL_CREATE_GROUP]);
    groups.create.and.returnValue(of({ ...EDITORS_DETAIL, permissions: [] }));
    component.openCreate();
    component.createForm.setValue({ name_en: ' Editors ', name_ar: ' المحررون ' });

    component.submitCreate();

    expect(groups.create).toHaveBeenCalledWith({ name_en: 'Editors', name_ar: 'المحررون' });
    expect(component.editing()?.id).toBe(7);
  });

  it('does not submit a role without its Arabic name', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP, PORTAL_PERMISSIONS.PORTAL_CREATE_GROUP]);
    component.openCreate();
    component.createForm.setValue({ name_en: 'Editors', name_ar: '' });

    component.submitCreate();

    expect(groups.create).not.toHaveBeenCalled();
  });

  it('saves renamed names and the selected permissions, then refreshes the caller’s permissions', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP, PORTAL_PERMISSIONS.PORTAL_UPDATE_GROUP]);
    groups.update.and.returnValue(of({ ...EDITORS_DETAIL, name_en: 'Writers' }));
    groups.setPermissions.and.returnValue(of(EDITORS_DETAIL));
    component.openEditor(EDITORS);
    component.editForm.setValue({ name_en: 'Writers', name_ar: 'المحررون' });
    component.togglePermission('portal_create_reciter', true);

    component.saveEditor();

    expect(groups.update).toHaveBeenCalledWith(7, { name_en: 'Writers', name_ar: 'المحررون' });
    expect(groups.setPermissions).toHaveBeenCalledWith(7, [
      'portal_create_reciter',
      'portal_read_reciter',
      'portal_update_reciter',
    ]);
    expect(tenant.refresh).toHaveBeenCalled();
  });

  it('closes the editor after a successful save', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP, PORTAL_PERMISSIONS.PORTAL_UPDATE_GROUP]);
    groups.setPermissions.and.returnValue(of(EDITORS_DETAIL));
    component.openEditor(EDITORS);

    component.saveEditor();

    expect(component.editing()).toBeNull();
  });

  it('skips the rename call when the names did not change', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP, PORTAL_PERMISSIONS.PORTAL_UPDATE_GROUP]);
    groups.setPermissions.and.returnValue(of(EDITORS_DETAIL));
    component.openEditor(EDITORS);

    component.saveEditor();

    expect(groups.update).not.toHaveBeenCalled();
    expect(groups.setPermissions).toHaveBeenCalled();
  });

  it('opens the editor read-only without the update permission', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP]);

    component.openEditor(EDITORS);

    expect(component.editForm.disabled).toBeTrue();
    expect(component.canUpdate()).toBeFalse();
  });

  it('reloads roles and permission names when the UI language changes', () => {
    setup([PORTAL_PERMISSIONS.PORTAL_READ_GROUP]);
    groups.list.calls.reset();
    groups.listPermissions.calls.reset();

    TestBed.inject(TranslateService).use('ar');

    expect(groups.list).toHaveBeenCalledWith(jasmine.objectContaining({ ordering: 'name_ar' }));
    expect(groups.listPermissions).toHaveBeenCalled();
  });
});
