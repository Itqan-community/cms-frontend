import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UsageDashboardComponent } from '../../components/usage-dashboard/usage-dashboard.component';
import { DeveloperUsagePage } from './developer-usage.page';

@Component({ selector: 'app-usage-dashboard', standalone: true, template: '' })
class FakeDashboardComponent {
  readonly scope = input<string>();
}

describe('DeveloperUsagePage', () => {
  let fixture: ComponentFixture<DeveloperUsagePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeveloperUsagePage, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    })
      .overrideComponent(DeveloperUsagePage, {
        remove: { imports: [UsageDashboardComponent] },
        add: { imports: [FakeDashboardComponent] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(DeveloperUsagePage);
    fixture.detectChanges();
  });

  it('shows the developer-scope dashboard with a link back to the API keys', () => {
    const dashboard = fixture.debugElement.query(
      (node) => node.componentInstance instanceof FakeDashboardComponent
    );
    expect((dashboard.componentInstance as FakeDashboardComponent).scope()).toBe('developer');
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href="/account/api-keys"]'
    );
    expect(link).not.toBeNull();
  });
});
