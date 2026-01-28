import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const ContactCard = ({ contact, onEdit }: { contact: any; onEdit?: () => void }) => {
  return (
    <div data-testid="contact-card">
      <h3>{contact.first_name} {contact.last_name}</h3>
      <span>{contact.email}</span>
      <span>{contact.phone}</span>
      <button onClick={onEdit}>Edit</button>
    </div>
  );
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);

describe('ContactCard', () => {
  const mockContact = {
    id: 'contact-123',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    phone: '+31612345678',
    company_id: 'company-123',
  };

  it('should render contact name', () => {
    render(<ContactCard contact={mockContact} />, { wrapper });
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should render contact email', () => {
    render(<ContactCard contact={mockContact} />, { wrapper });
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('should render contact phone', () => {
    render(<ContactCard contact={mockContact} />, { wrapper });
    expect(screen.getByText('+31612345678')).toBeInTheDocument();
  });

  it('should call onEdit when edit clicked', () => {
    const onEdit = vi.fn();
    render(<ContactCard contact={mockContact} onEdit={onEdit} />, { wrapper });
    
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalled();
  });
});
