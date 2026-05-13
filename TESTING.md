# Testing Guide for ContextLens

This directory contains comprehensive test suites for both the backend (Express server) and frontend (React dashboard) of ContextLens.

## Project Structure

```
tests/
├── backend/           # Backend (Node.js/Express) tests
│   ├── lib/          # Library function tests
│   └── middleware/   # Middleware tests
├── frontend/         # Frontend (React) tests
│   ├── components/   # React component tests
│   └── lib/         # Frontend utility function tests
```

## Backend Tests

### Location
`src/__tests__/`

### Available Test Files

1. **lib/redaction.test.js**
   - Tests for `redactText()` - redacts sensitive patterns from strings
   - Tests for `redactDeep()` - recursively redacts sensitive data from objects/arrays
   - Coverage: API keys, tokens, passwords, private keys

2. **middleware/auth.test.js**
   - Tests for `requireAuth()` middleware
   - Validates Firebase ID token verification
   - Tests error handling for invalid/expired tokens
   - Mocks Firebase auth service

3. **lib/errors.test.js**
   - Tests for `typedError()` - creates structured error objects
   - Tests for `mapError()` - maps error messages to HTTP status codes
   - Coverage: 401, 403, 404, 429, 500, 504 status codes

### Running Backend Tests

```bash
# Run all backend tests
cd /path/to/ContextLens
npm test

# Run tests in watch mode (re-run on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/__tests__/lib/redaction.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="redactText"
```

## Frontend Tests

### Location
`contextlens-dashboard/src/__tests__/`

### Available Test Files

1. **lib/api.test.ts**
   - Tests for API utility functions: `explainDiff()`, `branchSummary()`, `search()`
   - Tests error handling and retry logic
   - Mocks `fetch` and Firebase auth
   - Coverage: Timeouts, network errors, quota limits, auth errors

2. **components/ErrorBoundary.test.tsx**
   - Tests for Error Boundary component
   - Tests error catching and rendering fallback UI
   - Tests user interactions (refresh, try again buttons)
   - Uses React Testing Library

### Running Frontend Tests

```bash
# Navigate to dashboard
cd contextlens-dashboard

# Run all frontend tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/__tests__/lib/api.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="explainDiff"
```

## Test Configuration

### Backend (Jest)
- **Config file**: `jest.config.js`
- **Test environment**: Node.js
- **Coverage threshold**: 50% (branches, functions, lines, statements)
- **Test patterns**: `**/__tests__/**/*.test.js`, `**/tests/**/*.test.js`

### Frontend (Jest + React Testing Library)
- **Config file**: `contextlens-dashboard/jest.config.js`
- **Test environment**: jsdom (browser-like)
- **Setup file**: `contextlens-dashboard/src/setupTests.ts`
- **Transforms**: Babel (TypeScript + React)
- **Test patterns**: `**/__tests__/**/*.test.tsx`, `**/*.test.tsx`

## Writing New Tests

### Backend Test Template

```javascript
const { functionName } = require('../../src/path/to/module');

describe('Module Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'test data';

    // Act
    const result = functionName(input);

    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Frontend Test Template

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Component } from '../../components/Component';

describe('Component', () => {
  it('should render component', () => {
    render(<Component />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('should handle user interaction', () => {
    render(<Component />);
    const button = screen.getByRole('button', { name: /Click me/i });
    fireEvent.click(button);
    // Assert behavior
  });
});
```

## Mocking

### Backend Mocks
- **Firebase Auth**: Mocked in auth middleware tests
- **External services**: Use Jest mocks for HTTP calls

### Frontend Mocks
- **fetch**: Mocked in API utility tests
- **Firebase**: Mocked in API tests
- **React Router**: Can be mocked for component tests

Example:
```typescript
jest.mock('../../lib/firebase', () => ({
  auth: {
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('mock_token'),
    },
  },
}));
```

## Coverage Reports

Generate and view coverage:

```bash
# Backend
npm run test:coverage

# Frontend
cd contextlens-dashboard
npm run test:coverage
```

Coverage reports are generated in:
- Backend: `coverage/` directory
- Frontend: `contextlens-dashboard/coverage/` directory

Open `coverage/lcov-report/index.html` in a browser for detailed coverage visualization.

## Debugging Tests

### Run single test file
```bash
npm test -- path/to/test.test.js
```

### Run with debugging output
```bash
npm test -- --verbose
```

### Node debugging
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

Then open Chrome DevTools (chrome://inspect) to debug.

## CI/CD Integration

Tests are configured to run in CI/CD pipelines:

```bash
# Run all tests with coverage
npm run test:coverage
```

The following scripts should be added to CI:

```yaml
- name: Run Backend Tests
  run: npm run test:coverage

- name: Run Frontend Tests
  run: cd contextlens-dashboard && npm run test:coverage
```

## Best Practices

1. **Test one thing per test** - Each test should verify a single behavior
2. **Use descriptive names** - `it('should redact API keys')`
3. **Follow AAA pattern** - Arrange, Act, Assert
4. **Mock external dependencies** - Don't test Firebase, HTTP clients directly
5. **Test edge cases** - Empty inputs, null values, errors
6. **Keep tests fast** - Avoid unnecessary delays
7. **Use fixtures** - Extract test data into reusable objects

## Troubleshooting

### Tests not running
- Ensure Jest is installed: `npm install jest --save-dev`
- Check test file names end with `.test.js` or `.test.ts`

### Import errors
- Verify file paths are correct
- Use relative paths: `../../src/lib/module`

### Mock not working
- Ensure mock is defined before the module is imported
- Check mock path matches the require/import statement

### React component tests fail
- Install: `@testing-library/react @testing-library/jest-dom`
- Check setupTests.ts is configured in jest.config.js

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro)
- [Jest Mocking Guide](https://jestjs.io/docs/mock-functions)
