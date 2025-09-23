# CI/CD Pipeline Documentation

This directory contains the GitHub Actions workflows and configuration for the comprehensive testing strategy.

## Workflows

### 1. CI/CD Pipeline (`ci.yml`)

Main continuous integration workflow that runs on push and pull requests.

**Jobs:**
- **Unit & Component Tests**: Fast feedback loop for unit and component tests
- **Integration Tests**: API, database, and integration testing with DynamoDB Local
- **E2E Tests**: Cross-browser end-to-end testing (Chromium, Firefox, WebKit)
- **Accessibility Tests**: Component and E2E accessibility validation
- **Performance Tests**: Performance unit tests, E2E tests, and Lighthouse CI
- **Test Reporting**: Aggregates results and provides notifications

**Features:**
- Parallel test execution for faster feedback
- Browser matrix testing for E2E tests
- Artifact collection for test results
- PR comments with test status
- Failure notifications

### 2. Quality Gates (`quality-gates.yml`)

Enforces quality standards through coverage, performance, and accessibility metrics.

**Jobs:**
- **Coverage Report**: Collects and validates code coverage thresholds
- **Performance Monitoring**: Monitors test execution performance and alerts on slowdowns
- **Audit Integration**: Runs accessibility and performance audits
- **Quality Gates**: Enforces overall quality standards

**Quality Thresholds:**
- Code Coverage: 80% statements, 75% branches, 80% functions, 80% lines
- Performance: Test suites must complete within defined time limits
- Accessibility: 95% Lighthouse accessibility score
- Performance Score: 90% Lighthouse performance score

## Scripts

### Test Performance Monitor (`scripts/test-performance-monitor.js`)

Monitors test execution times and generates performance alerts.

```bash
npm run test:performance:monitor:ci
```

**Features:**
- Tracks test suite execution times
- Identifies slow tests
- Generates performance alerts
- Configurable thresholds per test type

### Quality Report Generator (`scripts/quality-report-generator.js`)

Generates comprehensive quality reports combining all metrics.

```bash
npm run quality:report
```

**Features:**
- Combines coverage, performance, and accessibility data
- Calculates overall quality score
- Generates actionable recommendations
- Outputs JSON and Markdown reports

## Branch Protection

The `branch-protection.json` file contains recommended branch protection settings that enforce:

- All CI/CD checks must pass before merge
- At least one approving review required
- Stale reviews dismissed on new commits
- Conversation resolution required

To apply these settings, use the GitHub CLI or API:

```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --input .github/branch-protection.json
```

## Environment Variables

### Required for CI/CD

```yaml
# Authentication
NEXTAUTH_SECRET: "test-secret-for-ci"
NEXTAUTH_URL: "http://localhost:3000"

# AWS/DynamoDB (for testing)
AWS_ACCESS_KEY_ID: "test"
AWS_SECRET_ACCESS_KEY: "test"
AWS_REGION: "us-east-1"
DYNAMODB_ENDPOINT: "http://localhost:8000"
```

### Optional for Enhanced Features

```yaml
# Slack notifications (if implemented)
SLACK_WEBHOOK_URL: "https://hooks.slack.com/..."

# Email notifications (if implemented)
SMTP_HOST: "smtp.example.com"
SMTP_USER: "notifications@example.com"
SMTP_PASS: "password"
```

## Artifacts

The workflows generate several artifacts that are retained for 7-30 days:

- **Test Results**: Coverage reports, test outputs
- **E2E Reports**: Playwright HTML reports and screenshots
- **Performance Data**: Lighthouse reports and performance metrics
- **Quality Reports**: Comprehensive quality analysis

## Monitoring and Alerts

### Performance Alerts

Triggered when test suites exceed time thresholds:
- Unit Tests: > 30 seconds
- Component Tests: > 60 seconds  
- Integration Tests: > 120 seconds
- E2E Tests: > 300 seconds
- Total Suite: > 600 seconds

### Quality Gate Failures

The pipeline fails if:
- Code coverage below thresholds
- High severity performance alerts
- Accessibility score below 95%
- Performance score below 90%

### Notifications

- PR comments with test results and coverage
- Commit status updates
- Workflow failure notifications
- Performance degradation alerts

## Local Development

Run the same checks locally:

```bash
# Run all tests with coverage
npm run test:coverage

# Monitor test performance
npm run test:performance:monitor:ci

# Generate quality report
npm run quality:report

# Run complete quality gates
npm run quality:gates
```

## Troubleshooting

### Common Issues

1. **DynamoDB Connection Failures**
   - Ensure DynamoDB Local service is running
   - Check AWS credentials and region settings

2. **Playwright Browser Issues**
   - Run `npx playwright install` to update browsers
   - Check for system dependencies

3. **Coverage Threshold Failures**
   - Review uncovered code in coverage reports
   - Add tests for missing coverage areas

4. **Performance Degradation**
   - Check for resource-intensive tests
   - Review test data setup/teardown
   - Consider test parallelization

### Getting Help

- Check workflow logs in GitHub Actions
- Review artifact files for detailed reports
- Run tests locally to reproduce issues
- Check test configuration files for settings

## Maintenance

### Regular Tasks

- Review and update performance thresholds
- Update browser versions for E2E tests
- Monitor artifact storage usage
- Review and update quality gate criteria

### Quarterly Reviews

- Analyze test performance trends
- Review coverage requirements
- Update accessibility standards
- Evaluate new testing tools and practices