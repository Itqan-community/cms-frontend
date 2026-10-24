/**
 * Tree-shaken ECharts build for the usage dashboards (line, bar, pie, heatmap).
 * Loaded lazily by `provideUsageCharts()`, so only usage screens download it.
 */
import { BarChart, HeatmapChart, LineChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  HeatmapChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export default echarts;
