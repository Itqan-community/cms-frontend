import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { UsageChartComponent } from './usage-chart.component';

describe('UsageChartComponent', () => {
  let fixture: ComponentFixture<UsageChartComponent>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const query = (selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(selector);

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UsageChartComponent, TranslateModule.forRoot()],
    }).compileComponents();
    fixture = TestBed.createComponent(UsageChartComponent);
    fixture.componentRef.setInput('title', 'Plays');
  });

  it('shows a skeleton while loading', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(query('nz-skeleton')).not.toBeNull();
    expect(query('[echarts]')).toBeNull();
  });

  it('shows the error with a retry button that emits', () => {
    let retried = false;
    fixture.componentInstance.retry.subscribe(() => (retried = true));
    fixture.componentRef.setInput('error', true);
    fixture.detectChanges();
    expect(text()).toContain('USAGE.LOAD_ERROR');
    (query('.usage-chart__error button') as HTMLButtonElement).click();
    expect(retried).toBeTrue();
  });

  it('shows the empty state', () => {
    fixture.componentRef.setInput('empty', true);
    fixture.detectChanges();
    expect(query('nz-empty')).not.toBeNull();
  });

  it('switches between the chart and the table view', () => {
    fixture.componentRef.setInput('options', { series: [] });
    fixture.componentRef.setInput('rows', [{ label: 'SA', value: '9' }]);
    fixture.detectChanges();
    expect(query('[echarts]')).not.toBeNull();

    (query('.usage-chart__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(query('[echarts]')).toBeNull();
    expect(query('table')?.textContent).toContain('SA');
    expect(query('table')?.textContent).toContain('9');
  });

  it('resizes a chart that was laid out while hidden once its element has a real width', async () => {
    const dom = document.createElement('div');
    dom.style.width = '600px';
    document.body.appendChild(dom);
    const chart = jasmine.createSpyObj('ECharts', ['getDom', 'getWidth', 'isDisposed', 'resize']);
    chart.getDom.and.returnValue(dom);
    chart.getWidth.and.returnValue(100); // ECharts' fallback width for a zero-sized box
    chart.isDisposed.and.returnValue(false);

    fixture.componentInstance.onChartInit(chart);
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));

    expect(chart.resize).toHaveBeenCalled();
    fixture.destroy();
    dom.remove();
  });
});
