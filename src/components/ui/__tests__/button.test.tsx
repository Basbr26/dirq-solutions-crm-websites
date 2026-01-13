import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('should apply default variant and size', () => {
    render(<Button>Default</Button>);
    const button = screen.getByRole('button');
    
    // Check for default classes (primary background, default height)
    expect(button).toHaveClass('bg-primary', 'h-10');
  });

  it('should apply destructive variant', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-destructive');
  });

  it('should apply outline variant', () => {
    render(<Button variant="outline">Outline</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('border', 'border-input');
  });

  it('should apply secondary variant', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-secondary');
  });

  it('should apply ghost variant', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('hover:bg-accent');
  });

  it('should apply link variant', () => {
    render(<Button variant="link">Link</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('text-primary', 'underline-offset-4');
  });

  it('should apply small size', () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('h-9');
  });

  it('should apply large size', () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('h-11');
  });

  it('should apply icon size', () => {
    render(<Button size="icon">Icon</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('h-10', 'w-10');
  });

  it('should handle disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:pointer-events-none', 'disabled:opacity-50');
  });

  it('should merge custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('bg-primary'); // Still has default variant
  });

  it('should handle onClick events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    
    const button = screen.getByRole('button');
    button.click();
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should support type attribute', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should render as child when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test');
  });

  it('should have correct accessibility attributes', () => {
    render(<Button aria-label="Close">X</Button>);
    const button = screen.getByRole('button', { name: /close/i });
    
    expect(button).toHaveAttribute('aria-label', 'Close');
  });

  it('should support combination of variants and sizes', () => {
    render(
      <Button variant="destructive" size="lg">
        Large Delete
      </Button>
    );
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('bg-destructive', 'h-11');
  });
});
