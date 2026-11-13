import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { AdminTenantService, MyPublisherOut } from '../../services/admin-tenant.service';
import { AssetChannelsFieldsComponent } from './asset-channels.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AssetChannelsFieldsComponent],
  template: `<form [formGroup]="form"><app-asset-channels-fields /></form>`,
})
class HostComponent {
  readonly form = new FormGroup({
    publisher_id: new FormControl<number | null>(null),
    in_gallery: new FormControl(true),
    in_public_api: new FormControl(true),
    in_cli: new FormControl(true),
    in_tenants: new FormControl(false),
  });
}

function publisher(id: number, hasWebsite: boolean): MyPublisherOut {
  return {
    id,
    name: `P${id}`,
    slug: `p${id}`,
    icon_url: null,
    permissions: [],
    has_website: hasWebsite,
  };
}

describe('AssetChannelsFieldsComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  function render(publisherId: number | null): HostComponent {
    TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: AdminTenantService,
          useValue: { publishers: signal([publisher(1, true), publisher(2, false)]) },
        },
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.form.controls.publisher_id.setValue(publisherId);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  function labels(): string[] {
    const options = fixture.nativeElement.querySelectorAll('[nz-checkbox]') as NodeListOf<Element>;
    return Array.from(options, (option) => option.textContent!.trim());
  }

  it('offers Publisher website when the publisher has a website', () => {
    render(1);

    expect(labels()).toEqual([
      'ADMIN.COMMON.CHANNELS.GALLERY',
      'ADMIN.COMMON.CHANNELS.PUBLIC_API',
      'ADMIN.COMMON.CHANNELS.CLI',
      'ADMIN.COMMON.CHANNELS.TENANTS',
    ]);
  });

  it('hides Publisher website and keeps its value when the publisher has no website', () => {
    const host = render(2);

    expect(labels()).not.toContain('ADMIN.COMMON.CHANNELS.TENANTS');
    expect(labels().length).toBe(3);
    expect(host.form.controls.in_tenants.value).toBeFalse();
  });

  it('hides Publisher website while the publisher is not known yet', () => {
    render(null);

    expect(labels()).not.toContain('ADMIN.COMMON.CHANNELS.TENANTS');
  });

  it('shows Publisher website once an edit form loads a publisher with a website', () => {
    const host = render(null);

    host.form.controls.publisher_id.setValue(1);
    fixture.detectChanges();

    expect(labels()).toContain('ADMIN.COMMON.CHANNELS.TENANTS');
  });
});
