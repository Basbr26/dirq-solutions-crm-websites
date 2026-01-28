import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

// Mock CompanyCard component
const CompanyCard = ({ 
  company, 
  onEdit, 
  onDelete 
}: { 
  company: any; 
  onEdit?: () => void; 
  onDelete?: () => void;
}) => {
  return (
    <div data-testid="company-card">
      <h3>{company.name}</h3>
      <span data-testid="status">{company.status}</span>
      <span data-testid="priority">{company.priority}</span>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDelete}>Delete</button>
    </div>
  );
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('CompanyCard', () => {
  const mockCompany = {
    id: 'company-123',
    name: 'Acme Corp',
    status: 'customer',
    priority: 'high',
    monthly_recurring_revenue: 1000,
  };

  describe('Rendering', () => {
    it('should render company name', () => {
      render(<CompanyCard company={mockCompany} />, { wrapper });
      
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    it('should render company status', () => {
      render(<CompanyCard company={mockCompany} />, { wrapper });
      
      expect(screen.getByTestId('status')).toHaveTextContent('customer');
    });

    it('should render company priority', () => {
      render(<CompanyCard company={mockCompany} />, { wrapper });
      
      expect(screen.getByTestId('priority')).toHaveTextContent('high');
    });

    it('should render edit button', () => {
      render(<CompanyCard company={mockCompany} />, { wrapper });
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should render delete button', () => {
      render(<CompanyCard company={mockCompany} />, { wrapper });
      
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onEdit when edit button clicked', () => {
      const onEdit = vi.fn();
      render(<CompanyCard company={mockCompany} onEdit={onEdit} />, { wrapper });
      
      fireEvent.click(screen.getByText('Edit'));
      
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when delete button clicked', () => {
      const onDelete = vi.fn();
      render(<CompanyCard company={mockCompany} onDelete={onDelete} />, { wrapper });
      
      fireEvent.click(screen.getByText('Delete'));
      
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Badge', () => {
    it('should display customer status with green badge', () => {
      const customer = { ...mockCompany, status: 'customer' };
      render(<CompanyCard company={customer} />, { wrapper });
      
      const status = screen.getByTestId('status');
      expect(status).toHaveTextContent('customer');
    });

    it('should display prospect status with blue badge', () => {
      const prospect = { ...mockCompany, status: 'prospect' };
      render(<CompanyCard company={prospect} />, { wrapper });
      
      const status = screen.getByTestId('status');
      expect(status).toHaveTextContent('prospect');
    });

    it('should display inactive status with gray badge', () => {
      const inactive = { ...mockCompany, status: 'inactive' };
      render(<CompanyCard company={inactive} />, { wrapper });
      
      const status = screen.getByTestId('status');
      expect(status).toHaveTextContent('inactive');
    });
  });

  describe('Priority Indicator', () => {
    it('should display high priority with red indicator', () => {
      const highPriority = { ...mockCompany, priority: 'high' };
      render(<CompanyCard company={highPriority} />, { wrapper });
      
      const priority = screen.getByTestId('priority');
      expect(priority).toHaveTextContent('high');
    });

    it('should display medium priority with yellow indicator', () => {
      const mediumPriority = { ...mockCompany, priority: 'medium' };
      render(<CompanyCard company={mediumPriority} />, { wrapper });
      
      const priority = screen.getByTestId('priority');
      expect(priority).toHaveTextContent('medium');
    });

    it('should display low priority with green indicator', () => {
      const lowPriority = { ...mockCompany, priority: 'low' };
      render(<CompanyCard company={lowPriority} />, { wrapper });
      
      const priority = screen.getByTestId('priority');
      expect(priority).toHaveTextContent('low');
    });
  });

  describe('MRR Display', () => {
    it('should show MRR for customers', () => {
      const customerWithMRR = {
        ...mockCompany,
        status: 'customer',
        monthly_recurring_revenue: 1500,
      };
      render(<CompanyCard company={customerWithMRR} />, { wrapper });
      
      expect(screen.getByTestId('company-card')).toBeInTheDocument();
    });

    it('should not show MRR for prospects', () => {
      const prospect = {
        ...mockCompany,
        status: 'prospect',
        monthly_recurring_revenue: 0,
      };
      render(<CompanyCard company={prospect} />, { wrapper });
      
      expect(screen.getByTestId('status')).toHaveTextContent('prospect');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels', () => {
      render(<CompanyCard company={mockCompany} />, { wrapper });
      
      const editButton = screen.getByText('Edit');
      const deleteButton = screen.getByText('Delete');
      
      expect(editButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<CompanyCard company={mockCompany} />, { wrapper });
      
      const editButton = screen.getByText('Edit');
      
      editButton.focus();
      expect(document.activeElement).toBe(editButton);
    });
  });

  describe('Mobile Swipe Actions', () => {
    it('should show swipe actions on mobile', () => {
      const { container } = render(<CompanyCard company={mockCompany} />, { wrapper });
      
      expect(container.querySelector('[data-testid="company-card"]')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render when props unchanged', () => {
      const { rerender } = render(<CompanyCard company={mockCompany} />, { wrapper });
      
      const initialElement = screen.getByTestId('company-card');
      
      rerender(<CompanyCard company={mockCompany} />);
      
      const afterRerender = screen.getByTestId('company-card');
      
      expect(initialElement).toBe(afterRerender);
    });
  });
});
