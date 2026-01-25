import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Simple smoke test to verify testing setup works
describe('Frontend Test Setup', () => {
  it('should render without crashing', () => {
    // Verify that the testing environment is set up correctly
    expect(true).toBe(true);
  });

  it('should have access to testing-library utilities', () => {
    const TestComponent = () => <div data-testid="test">Hello EasyRate</div>;

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByTestId('test')).toBeInTheDocument();
    expect(screen.getByText('Hello EasyRate')).toBeInTheDocument();
  });

  it('should support Danish characters in tests', () => {
    const TestComponent = () => (
      <div data-testid="danish">Hvordan var din oplevelse? ÆØÅ æøå</div>
    );

    render(
      <BrowserRouter>
        <TestComponent />
      </BrowserRouter>
    );

    expect(screen.getByText(/Hvordan var din oplevelse/)).toBeInTheDocument();
  });
});
