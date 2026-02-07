import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import App from './App';

describe('App', () => {
  it('renders the CMS heading', () => {
    render(<App />);
    expect(screen.getByText('CMS')).toBeInTheDocument();
    expect(screen.getByText('Content Management System')).toBeInTheDocument();
  });
});
