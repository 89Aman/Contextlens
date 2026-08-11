import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

// Suppress console.error for tests
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Safe content</div>;
};

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('should catch errors and display fallback message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(
      screen.getByText(
        "We encountered an unexpected error. Don't worry, your data is safe in the cloud."
      )
    ).toBeInTheDocument();
  });

  it('should display custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('should display the error message in the technical details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should have reload page button that works', () => {
    const reloadSpy = jest.fn();

    render(
      <ErrorBoundary onReload={reloadSpy}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const refreshButton = screen.getByRole('button', { name: /Reload Page/i });
    fireEvent.click(refreshButton);

    expect(reloadSpy).toHaveBeenCalled();
  });

  it('should have go-home button that resets error state', () => {
    const { rerender } = render(
      <ErrorBoundary onGoHome={jest.fn()}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // The children still throw until re-rendered; reset happens via the button
    rerender(
      <ErrorBoundary onGoHome={jest.fn()}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    const homeButton = screen.getByRole('button', { name: /Go to Home/i });
    fireEvent.click(homeButton);

    // After resetting, the safe children render
    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });
});
