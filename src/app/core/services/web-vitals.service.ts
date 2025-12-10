import { Injectable, isDevMode } from '@angular/core';
import { Metric, onCLS, onINP, onLCP } from 'web-vitals';

@Injectable({ providedIn: 'root' })
export class WebVitalsService {
  private readonly metricConfig: Record<string, { label: string; desc: string }> = {
    LCP: { label: 'Largest Contentful Paint', desc: 'Loading Performance' },
    CLS: { label: 'Cumulative Layout Shift', desc: 'Visual Stability' },
    INP: { label: 'Interaction to Next Paint', desc: 'Interactivity' },
  };

  private hasStarted = false;

  constructor() {
    if (isDevMode()) {
      this.monitorCoreWebVitals();
    }
  }

  private monitorCoreWebVitals(): void {
    const log = (metric: Metric) => {
      if (this.hasStarted) return;
      this.hasStarted = true;

      console.log('[Web Vitals] Loading...');

      const config = this.metricConfig[metric.name];
      if (!config) return;

      const formattedValue = Math.round(metric.value * 100) / 100;

      const style =
        metric.rating === 'good'
          ? 'color: #188038; font-weight: bold;' // Green
          : metric.rating === 'needs-improvement'
            ? 'color: #e37400; font-weight: bold;' // Orange
            : 'color: #d93025; font-weight: bold;'; // Red

      console.log(
        `[Web Vitals] ${metric.name} - ${config.label} (${config.desc}): %c${formattedValue} (${metric.rating})`,
        style
      );
    };

    onLCP(log);
    onCLS(log);
    onINP(log);
  }
}
