import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AdminAuthService } from '../../../admin/services/admin-auth.service';
import { UsageDashboardComponent } from '../usage-dashboard/usage-dashboard.component';
import { AssetUsageSectionComponent } from './asset-usage-section.component';

@Component({ selector: 'app-usage-dashboard', standalone: true, template: '' })
class FakeDashboardComponent {
  readonly scope = input<string>();
  readonly assetId = input<number | null>(null);
  readonly category = input<string | null>(null);
  readonly syncUrl = input(true);
}

describe('AssetUsageSectionComponent', () => {
  let fixture: ComponentFixture<AssetUsageSectionComponent>;
  const permissions = signal<string[]>([]);
  const isItqanAdmin = signal(false);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetUsageSectionComponent, TranslateModule.forRoot()],
      providers: [
        {
          provide: AdminAuthService,
          useValue: {
            isItqanAdmin,
            hasPermission: (code: string) => permissions().includes(code),
          },
        },
      ],
    })
      .overrideComponent(AssetUsageSectionComponent, {
        remove: { imports: [UsageDashboardComponent] },
        add: { imports: [FakeDashboardComponent] },
      })
      .compileComponents();
  });

  function render(): FakeDashboardComponent | null {
    fixture = TestBed.createComponent(AssetUsageSectionComponent);
    fixture.componentRef.setInput('assetId', 7);
    fixture.componentRef.setInput('category', 'recitation');
    fixture.detectChanges();
    const element = fixture.debugElement.query(
      (node) => node.componentInstance instanceof FakeDashboardComponent
    );
    return element ? (element.componentInstance as FakeDashboardComponent) : null;
  }

  it('renders nothing without the usage permission', () => {
    permissions.set([]);
    expect(render()).toBeNull();
  });

  it('embeds an asset dashboard that keeps its filters out of the URL', () => {
    permissions.set(['portal_read_usage']);
    isItqanAdmin.set(false);
    const dashboard = render();
    expect(dashboard?.scope()).toBe('publisher');
    expect(dashboard?.assetId()).toBe(7);
    expect(dashboard?.category()).toBe('recitation');
    expect(dashboard?.syncUrl()).toBeFalse();
  });

  it('uses the admin scope for Itqan admins', () => {
    permissions.set(['portal_read_usage']);
    isItqanAdmin.set(true);
    expect(render()?.scope()).toBe('admin');
  });
});
