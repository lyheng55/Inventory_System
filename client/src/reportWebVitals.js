// Performance monitoring for the React application

const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // Simple performance monitoring without external dependencies
    try {
      // Basic performance metrics
      const navigation = performance.getEntriesByType('navigation')[0];
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
        
        onPerfEntry({
          name: 'load-time',
          value: loadTime,
          delta: loadTime
        });
        
        onPerfEntry({
          name: 'dom-content-loaded',
          value: domContentLoaded,
          delta: domContentLoaded
        });
      }
    } catch (error) {
      console.log('Performance monitoring not available:', error);
    }
  }
};

export default reportWebVitals;
