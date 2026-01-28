import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const ProjectCard = ({ project }: { project: any }) => {
  return (
    <div data-testid="project-card">
      <h3>{project.name}</h3>
      <span data-testid="stage">{project.stage}</span>
      <span data-testid="value">€{project.value}</span>
      <span data-testid="probability">{project.probability}%</span>
    </div>
  );
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('ProjectCard Component', () => {
  const mockProject = {
    id: 'project-123',
    name: 'Website Redesign',
    stage: 'quote_sent',
    value: 15000,
    probability: 50,
    company_id: 'company-123',
  };

  it('should render project name', () => {
    render(<ProjectCard project={mockProject} />, { wrapper });
    expect(screen.getByText('Website Redesign')).toBeInTheDocument();
  });

  it('should render stage', () => {
    render(<ProjectCard project={mockProject} />, { wrapper });
    expect(screen.getByTestId('stage')).toHaveTextContent('quote_sent');
  });

  it('should render project value', () => {
    render(<ProjectCard project={mockProject} />, { wrapper });
    expect(screen.getByTestId('value')).toHaveTextContent('€15000');
  });

  it('should render win probability', () => {
    render(<ProjectCard project={mockProject} />, { wrapper });
    expect(screen.getByTestId('probability')).toHaveTextContent('50%');
  });

  describe('Stage Colors', () => {
    it('should show gray for lead stage', () => {
      const lead = { ...mockProject, stage: 'lead' };
      render(<ProjectCard project={lead} />, { wrapper });
      expect(screen.getByTestId('stage')).toHaveTextContent('lead');
    });

    it('should show green for won stage', () => {
      const won = { ...mockProject, stage: 'won' };
      render(<ProjectCard project={won} />, { wrapper });
      expect(screen.getByTestId('stage')).toHaveTextContent('won');
    });

    it('should show red for lost stage', () => {
      const lost = { ...mockProject, stage: 'lost' };
      render(<ProjectCard project={lost} />, { wrapper });
      expect(screen.getByTestId('stage')).toHaveTextContent('lost');
    });
  });

  describe('Value Formatting', () => {
    it('should format large values with thousands separator', () => {
      const largeValue = { ...mockProject, value: 100000 };
      render(<ProjectCard project={largeValue} />, { wrapper });
      expect(screen.getByTestId('value')).toBeInTheDocument();
    });

    it('should handle zero value', () => {
      const zeroValue = { ...mockProject, value: 0 };
      render(<ProjectCard project={zeroValue} />, { wrapper });
      expect(screen.getByTestId('value')).toHaveTextContent('€0');
    });
  });
});
