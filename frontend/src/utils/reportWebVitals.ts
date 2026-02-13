import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (!onPerfEntry) return;
  onCLS(onPerfEntry);
  onFID(onPerfEntry);
  onLCP(onPerfEntry);
  onFCP(onPerfEntry);
  onTTFB(onPerfEntry);
};

export default reportWebVitals;
