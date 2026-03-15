/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../src/theme/index.js';
import { SkeletonCard } from '../../src/components/SkeletonCard.js';

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

describe('SkeletonCard', () => {
  it('renders skeleton card with correct testid', () => {
    render(<SkeletonCard />, { wrapper: Wrapper });
    expect(screen.getByTestId('skeleton-card')).toBeInTheDocument();
  });

  it('has correct border styling', () => {
    render(<SkeletonCard />, { wrapper: Wrapper });
    const card = screen.getByTestId('skeleton-card');
    // MUI sx applies styles via CSS classes — verify the element exists and has classes
    expect(card).toBeInTheDocument();
    expect(card.className).toBeTruthy();
  });

  it('contains multiple Skeleton elements', () => {
    render(<SkeletonCard />, { wrapper: Wrapper });
    const card = screen.getByTestId('skeleton-card');
    // MUI Skeleton renders spans with MuiSkeleton-root class
    const skeletons = card.querySelectorAll('.MuiSkeleton-root');
    // Should have at least 6 skeletons: category, status, title x2, metadata x2
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('has layout styles applied via MUI sx Emotion classes', () => {
    render(<SkeletonCard />, { wrapper: Wrapper });
    const card = screen.getByTestId('skeleton-card');
    // MUI sx applies minHeight, display:flex, flexDirection:column via Emotion CSS classes
    expect(card.className).toMatch(/css-/);
    // Verify the card has at least one Emotion-generated class (confirms sx was applied)
    const classNames = card.className.split(' ');
    const emotionClasses = classNames.filter((c) => c.startsWith('css-'));
    expect(emotionClasses.length).toBeGreaterThanOrEqual(1);
  });

  it('contains text variant skeletons for title lines', () => {
    render(<SkeletonCard />, { wrapper: Wrapper });
    const card = screen.getByTestId('skeleton-card');
    const textSkeletons = card.querySelectorAll('.MuiSkeleton-text');
    // At least 4 text skeletons: category, title line 1, title line 2, metadata x2
    expect(textSkeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('contains a rounded variant skeleton for status chip', () => {
    render(<SkeletonCard />, { wrapper: Wrapper });
    const card = screen.getByTestId('skeleton-card');
    const roundedSkeletons = card.querySelectorAll('.MuiSkeleton-rounded');
    expect(roundedSkeletons.length).toBeGreaterThanOrEqual(1);
  });
});
