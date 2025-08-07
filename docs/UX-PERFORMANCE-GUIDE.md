# UX Performance Optimization Guide for TraderAI

## Overview
This guide outlines performance optimizations implemented to improve the user experience of the TraderAI application, focusing on both the React/TypeScript frontend (ecne-core) and Streamlit dashboards (gct-market).

## 1. Performance Metrics Target

### Core Web Vitals
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTI (Time to Interactive)**: < 3.9s
- **FCP (First Contentful Paint)**: < 1.8s

## 2. React/TypeScript Optimizations (ecne-core)

### Code Splitting
```typescript
// Lazy load heavy components
const MarketDashboard = lazy(() => import('./pages/MarketDashboard'));
const InferenceCenter = lazy(() => import('./pages/InferenceCenter'));

// Use Suspense with loading states
<Suspense fallback={<LoadingState />}>
  <Routes>
    <Route path="/dashboard" element={<MarketDashboard />} />
    <Route path="/inference" element={<InferenceCenter />} />
  </Routes>
</Suspense>
```

### Memoization for Expensive Calculations
```typescript
// Memoize filtered data
const filteredData = useMemo(() => {
  return state.activeSource === 'all' 
    ? state.coherenceData 
    : state.coherenceData.filter(d => d.label === state.activeSource);
}, [state.activeSource, state.coherenceData]);

// Memoize complex components
const MemoizedChart = memo(RealTimeChart, (prevProps, nextProps) => {
  return prevProps.data.length === nextProps.data.length &&
         prevProps.config.refreshInterval === nextProps.config.refreshInterval;
});
```

### WebSocket Optimization
```typescript
// Batch WebSocket updates
const batchedUpdates = useDeferredValue(updates);

// Throttle high-frequency updates
const throttledUpdate = useCallback(
  throttle((data: FilteredDataPoint) => {
    setState(prev => ({
      ...prev,
      coherenceData: [...prev.coherenceData, data].slice(-100)
    }));
  }, 100),
  []
);
```

### Virtual Scrolling for Large Lists
```typescript
import { FixedSizeList } from 'react-window';

const VirtualDataTable = ({ data }) => (
  <FixedSizeList
    height={400}
    itemCount={data.length}
    itemSize={50}
    width="100%"
  >
    {({ index, style }) => (
      <div style={style}>
        <DataRow data={data[index]} />
      </div>
    )}
  </FixedSizeList>
);
```

## 3. CSS Performance Optimizations

### Critical CSS Inlining
```html
<!-- Inline critical CSS in <head> -->
<style>
  /* Critical above-the-fold styles */
  .app-container { min-height: 100vh; display: flex; flex-direction: column; }
  .header { position: sticky; top: 0; z-index: 1020; }
  .main { flex: 1; padding: 1rem; }
  .skeleton { animation: shimmer 1.5s infinite; }
</style>

<!-- Load non-critical CSS asynchronously -->
<link rel="preload" href="/css/dashboard.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

### CSS Containment
```css
/* Isolate layout calculations */
.card {
  contain: layout style paint;
}

.chart-container {
  contain: strict;
  content-visibility: auto;
}

/* Use will-change sparingly */
.animated-element {
  will-change: transform;
}

.animated-element:hover {
  will-change: auto;
}
```

## 4. Image Optimization

### Responsive Images
```html
<picture>
  <source media="(max-width: 768px)" srcset="chart-mobile.webp">
  <source media="(min-width: 769px)" srcset="chart-desktop.webp">
  <img src="chart-fallback.jpg" alt="Market analysis chart" loading="lazy" decoding="async">
</picture>
```

### Lazy Loading
```typescript
const LazyImage = ({ src, alt, ...props }) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <img
      ref={imgRef}
      src={isIntersecting ? src : undefined}
      alt={alt}
      loading="lazy"
      {...props}
    />
  );
};
```

## 5. Bundle Optimization

### Webpack Configuration
```javascript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['chart.js', 'd3'],
          'utils': ['lodash', 'date-fns']
        }
      }
    },
    // Enable compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
});
```

### Tree Shaking
```typescript
// Import only what you need
import { debounce, throttle } from 'lodash-es';
// Instead of: import _ from 'lodash';

// Use ES modules for better tree shaking
import { format } from 'date-fns';
// Instead of: const dateFns = require('date-fns');
```

## 6. Network Optimization

### HTTP/2 Push
```nginx
# nginx.conf
location / {
  http2_push /css/critical.css;
  http2_push /js/vendor.js;
}
```

### Service Worker for Caching
```javascript
// sw.js
const CACHE_NAME = 'ecne-v1';
const urlsToCache = [
  '/',
  '/css/dashboard.css',
  '/js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

## 7. Streamlit Performance (gct-market)

### Session State Optimization
```python
import streamlit as st
from functools import lru_cache

# Cache expensive computations
@st.cache_data(ttl=300)  # 5-minute cache
def calculate_coherence_metrics(data):
    return expensive_calculation(data)

# Use session state for persistence
if 'data_cache' not in st.session_state:
    st.session_state.data_cache = {}

# Batch updates
@st.fragment
def update_metrics():
    with st.container():
        col1, col2, col3 = st.columns(3)
        # Update all metrics at once
```

### Database Query Optimization
```python
# Use connection pooling
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)

# Optimize queries
@st.cache_resource
def get_market_data(symbol: str, limit: int = 100):
    query = """
    SELECT * FROM market_data 
    WHERE symbol = %s 
    ORDER BY timestamp DESC 
    LIMIT %s
    """
    return pd.read_sql(query, engine, params=[symbol, limit])
```

## 8. Monitoring and Measurement

### Performance Monitoring Setup
```typescript
// Performance observer
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    // Log to analytics
    analytics.track('performance', {
      name: entry.name,
      duration: entry.duration,
      type: entry.entryType
    });
  }
});

observer.observe({ entryTypes: ['measure', 'navigation'] });
```

### Custom Performance Marks
```typescript
// Mark important events
performance.mark('data-fetch-start');
fetchData().then(() => {
  performance.mark('data-fetch-end');
  performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
});
```

## 9. Accessibility Performance

### Reduce Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Efficient Focus Management
```typescript
// Use passive event listeners
useEffect(() => {
  const handleScroll = () => {
    // Handle scroll
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  return () => window.removeEventListener('scroll', handleScroll);
}, []);
```

## 10. Best Practices Checklist

### Before Deployment
- [ ] Run Lighthouse audit (target: 90+ score)
- [ ] Check bundle size (< 200KB initial JS)
- [ ] Verify lazy loading is working
- [ ] Test on slow 3G connection
- [ ] Validate accessibility with axe DevTools
- [ ] Check for memory leaks
- [ ] Verify WebSocket reconnection logic
- [ ] Test error boundaries
- [ ] Validate responsive breakpoints
- [ ] Check print styles

### Monitoring
- [ ] Set up Real User Monitoring (RUM)
- [ ] Configure error tracking (Sentry)
- [ ] Monitor WebSocket connection stability
- [ ] Track Core Web Vitals
- [ ] Set up performance budgets

## Resources
- [Web.dev Performance Guide](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Streamlit Performance](https://docs.streamlit.io/library/advanced-features/performance)