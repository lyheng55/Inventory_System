// Continuous Testing System
// Runs automated browser tests on a schedule and provides real-time monitoring

const { runBrowserTests } = require('./test-browser-automation');
const fs = require('fs');
const path = require('path');

class ContinuousTester {
  constructor() {
    this.isRunning = false;
    this.testHistory = [];
    this.schedule = {
      interval: 60 * 60 * 1000, // 1 hour default
      enabled: true
    };
    this.notifications = {
      email: false,
      webhook: false,
      console: true
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [CONTINUOUS-TESTING] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
    
    // Save to log file
    fs.appendFileSync('continuous-testing.log', logMessage + '\n');
  }

  async runScheduledTest() {
    if (this.isRunning) {
      this.log('Test already running, skipping scheduled test', 'warning');
      return;
    }

    this.isRunning = true;
    this.log('🚀 Starting scheduled browser test', 'info');

    try {
      const startTime = Date.now();
      await runBrowserTests();
      const duration = Date.now() - startTime;

      const testResult = {
        timestamp: new Date().toISOString(),
        duration,
        status: 'completed',
        report: 'BROWSER_TESTING_REPORT.md'
      };

      this.testHistory.push(testResult);
      this.log(`✅ Scheduled test completed in ${(duration / 1000).toFixed(2)}s`, 'success');

      // Send notifications if enabled
      await this.sendNotifications(testResult);

    } catch (error) {
      this.log(`❌ Scheduled test failed: ${error.message}`, 'error');
      
      const testResult = {
        timestamp: new Date().toISOString(),
        duration: 0,
        status: 'failed',
        error: error.message
      };

      this.testHistory.push(testResult);
      await this.sendNotifications(testResult);
    } finally {
      this.isRunning = false;
    }
  }

  async sendNotifications(testResult) {
    if (this.notifications.console) {
      this.log(`Test ${testResult.status}: ${testResult.duration}ms`, testResult.status === 'completed' ? 'success' : 'error');
    }

    if (this.notifications.email && testResult.status === 'failed') {
      // In a real implementation, you would send email notifications here
      this.log('📧 Email notification would be sent for test failure', 'info');
    }

    if (this.notifications.webhook) {
      // In a real implementation, you would send webhook notifications here
      this.log('🔗 Webhook notification would be sent', 'info');
    }
  }

  startScheduler() {
    if (!this.schedule.enabled) {
      this.log('Scheduler is disabled', 'warning');
      return;
    }

    this.log(`⏰ Starting continuous testing scheduler (interval: ${this.schedule.interval / 1000}s)`, 'info');
    
    // Run initial test
    this.runScheduledTest();

    // Schedule recurring tests
    setInterval(() => {
      this.runScheduledTest();
    }, this.schedule.interval);
  }

  stopScheduler() {
    this.schedule.enabled = false;
    this.log('⏹️ Continuous testing scheduler stopped', 'info');
  }

  setSchedule(intervalMs) {
    this.schedule.interval = intervalMs;
    this.log(`⏰ Schedule updated to ${intervalMs / 1000}s interval`, 'info');
  }

  getTestHistory() {
    return this.testHistory;
  }

  generateDashboard() {
    const dashboard = {
      status: this.isRunning ? 'running' : 'idle',
      schedule: this.schedule,
      totalTests: this.testHistory.length,
      lastTest: this.testHistory[this.testHistory.length - 1] || null,
      successRate: this.calculateSuccessRate(),
      averageDuration: this.calculateAverageDuration()
    };

    const dashboardHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Continuous Testing Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .running { background-color: #e3f2fd; border-left: 4px solid #2196f3; }
        .idle { background-color: #f3e5f5; border-left: 4px solid #9c27b0; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
        .test-history { margin-top: 20px; }
        .test-item { padding: 5px; margin: 5px 0; border-left: 3px solid #ccc; }
        .success { border-left-color: #4caf50; }
        .failed { border-left-color: #f44336; }
    </style>
</head>
<body>
    <h1>🧪 Continuous Testing Dashboard</h1>
    
    <div class="status ${dashboard.status}">
        <h2>Status: ${dashboard.status.toUpperCase()}</h2>
        <p>Schedule: ${dashboard.schedule.enabled ? 'Enabled' : 'Disabled'} (${dashboard.schedule.interval / 1000}s interval)</p>
    </div>

    <div class="metrics">
        <div class="metric">
            <h3>Total Tests</h3>
            <p>${dashboard.totalTests}</p>
        </div>
        <div class="metric">
            <h3>Success Rate</h3>
            <p>${dashboard.successRate.toFixed(1)}%</p>
        </div>
        <div class="metric">
            <h3>Average Duration</h3>
            <p>${dashboard.averageDuration.toFixed(2)}s</p>
        </div>
    </div>

    <div class="test-history">
        <h2>Recent Test History</h2>
        ${this.testHistory.slice(-10).map(test => `
            <div class="test-item ${test.status}">
                <strong>${new Date(test.timestamp).toLocaleString()}</strong> - 
                ${test.status} (${test.duration}ms)
                ${test.error ? `<br><em>Error: ${test.error}</em>` : ''}
            </div>
        `).join('')}
    </div>

    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;

    fs.writeFileSync('continuous-testing-dashboard.html', dashboardHtml);
    this.log('📊 Dashboard generated: continuous-testing-dashboard.html', 'success');
  }

  calculateSuccessRate() {
    if (this.testHistory.length === 0) return 0;
    const successful = this.testHistory.filter(test => test.status === 'completed').length;
    return (successful / this.testHistory.length) * 100;
  }

  calculateAverageDuration() {
    if (this.testHistory.length === 0) return 0;
    const totalDuration = this.testHistory.reduce((sum, test) => sum + test.duration, 0);
    return totalDuration / this.testHistory.length / 1000; // Convert to seconds
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const tester = new ContinuousTester();

  switch (command) {
    case 'start':
      tester.startScheduler();
      // Keep the process running
      process.on('SIGINT', () => {
        tester.log('🛑 Received SIGINT, stopping scheduler...', 'info');
        tester.stopScheduler();
        process.exit(0);
      });
      break;

    case 'run':
      await tester.runScheduledTest();
      break;

    case 'dashboard':
      tester.generateDashboard();
      break;

    case 'history':
      console.log(JSON.stringify(tester.getTestHistory(), null, 2));
      break;

    case 'schedule':
      const interval = parseInt(args[1]) * 1000; // Convert seconds to milliseconds
      if (interval) {
        tester.setSchedule(interval);
      } else {
        console.log('Usage: node continuous-testing.js schedule <interval-in-seconds>');
      }
      break;

    default:
      console.log(`
🧪 Continuous Testing System

Usage:
  node continuous-testing.js start                    - Start continuous testing scheduler
  node continuous-testing.js run                      - Run a single test
  node continuous-testing.js dashboard                - Generate dashboard HTML
  node continuous-testing.js history                  - Show test history
  node continuous-testing.js schedule <seconds>       - Set test interval

Examples:
  node continuous-testing.js start                    - Start with 1-hour intervals
  node continuous-testing.js schedule 1800            - Set 30-minute intervals
  node continuous-testing.js run                      - Run test immediately
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ContinuousTester };
