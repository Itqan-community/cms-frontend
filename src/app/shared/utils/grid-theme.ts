import { themeQuartz } from 'ag-grid-community';

/**
 * AG Grid's Quartz theme with the Fanar navy palette in dark mode. ThemeService sets
 * data-ag-theme-mode on <html>, which picks the mode; light mode stays stock Quartz.
 */
export const fanarGridTheme = themeQuartz.withParams(
  {
    backgroundColor: '#10323e',
    foregroundColor: '#f5f6f3',
    chromeBackgroundColor: '#123744',
    headerBackgroundColor: '#123744',
    oddRowBackgroundColor: '#0f3540',
    borderColor: '#2c4752',
    rowHoverColor: '#143c49',
    selectedRowBackgroundColor: 'rgba(134, 204, 172, 0.16)',
    accentColor: '#86ccac',
  },
  'dark'
);
