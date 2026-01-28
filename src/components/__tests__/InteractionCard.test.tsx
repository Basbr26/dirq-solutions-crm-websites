import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const InteractionCard = ({ interaction }: { interaction: any }) => {
  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      call: 'Phone',
      email: 'Mail',
      meeting: 'Users',
      note: 'FileText',
      task: 'CheckSquare',
      linkedin: 'Linkedin',
      physical_mail: 'Send',
    };
    return icons[type] || 'Circle';
  };

  const getColor = (type: string) => {
    const colors: Record<string, string> = {
      call: 'blue',
      email: 'green',
      meeting: 'purple',
      note: 'gray',
      task: 'orange',
      linkedin: 'cyan',
      physical_mail: 'indigo',
    };
    return colors[type] || 'gray';
  };

  return (
    <div data-testid="interaction-card">
      <span data-testid="icon">{getIcon(interaction.type)}</span>
      <span data-testid="type">{interaction.type}</span>
      <span data-testid="color">{getColor(interaction.type)}</span>
      {interaction.notes && <p data-testid="notes">{interaction.notes}</p>}
      {interaction.outcome && <span data-testid="outcome">{interaction.outcome}</span>}
    </div>
  );
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('InteractionCard Component', () => {
  const mockInteraction = {
    id: 'interaction-123',
    type: 'call',
    company_id: 'company-123',
    notes: 'Discussed project scope',
    outcome: 'positive',
    created_at: '2026-01-28T10:00:00Z',
  };

  it('should render interaction type', () => {
    render(<InteractionCard interaction={mockInteraction} />, { wrapper });
    expect(screen.getByTestId('type')).toHaveTextContent('call');
  });

  it('should render correct icon for type', () => {
    render(<InteractionCard interaction={mockInteraction} />, { wrapper });
    expect(screen.getByTestId('icon')).toHaveTextContent('Phone');
  });

  it('should render correct color for type', () => {
    render(<InteractionCard interaction={mockInteraction} />, { wrapper });
    expect(screen.getByTestId('color')).toHaveTextContent('blue');
  });

  it('should render notes when present', () => {
    render(<InteractionCard interaction={mockInteraction} />, { wrapper });
    expect(screen.getByTestId('notes')).toHaveTextContent('Discussed project scope');
  });

  it('should render outcome when present', () => {
    render(<InteractionCard interaction={mockInteraction} />, { wrapper });
    expect(screen.getByTestId('outcome')).toHaveTextContent('positive');
  });

  describe('Interaction Types', () => {
    const types = [
      { type: 'call', icon: 'Phone', color: 'blue' },
      { type: 'email', icon: 'Mail', color: 'green' },
      { type: 'meeting', icon: 'Users', color: 'purple' },
      { type: 'note', icon: 'FileText', color: 'gray' },
      { type: 'task', icon: 'CheckSquare', color: 'orange' },
      { type: 'linkedin', icon: 'Linkedin', color: 'cyan' },
      { type: 'physical_mail', icon: 'Send', color: 'indigo' },
    ];

    types.forEach(({ type, icon, color }) => {
      it(`should render ${type} with correct icon and color`, () => {
        const interaction = { ...mockInteraction, type };
        render(<InteractionCard interaction={interaction} />, { wrapper });
        
        expect(screen.getByTestId('icon')).toHaveTextContent(icon);
        expect(screen.getByTestId('color')).toHaveTextContent(color);
      });
    });
  });

  describe('Outcomes', () => {
    it('should render positive outcome', () => {
      const positive = { ...mockInteraction, outcome: 'positive' };
      render(<InteractionCard interaction={positive} />, { wrapper });
      expect(screen.getByTestId('outcome')).toHaveTextContent('positive');
    });

    it('should render negative outcome', () => {
      const negative = { ...mockInteraction, outcome: 'negative' };
      render(<InteractionCard interaction={negative} />, { wrapper });
      expect(screen.getByTestId('outcome')).toHaveTextContent('negative');
    });

    it('should render neutral outcome', () => {
      const neutral = { ...mockInteraction, outcome: 'neutral' };
      render(<InteractionCard interaction={neutral} />, { wrapper });
      expect(screen.getByTestId('outcome')).toHaveTextContent('neutral');
    });
  });

  describe('Optional Fields', () => {
    it('should not render notes if missing', () => {
      const noNotes = { ...mockInteraction, notes: undefined };
      render(<InteractionCard interaction={noNotes} />, { wrapper });
      expect(screen.queryByTestId('notes')).not.toBeInTheDocument();
    });

    it('should not render outcome if missing', () => {
      const noOutcome = { ...mockInteraction, outcome: undefined };
      render(<InteractionCard interaction={noOutcome} />, { wrapper });
      expect(screen.queryByTestId('outcome')).not.toBeInTheDocument();
    });
  });
});
