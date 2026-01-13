import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateICSContent, downloadICSFile } from '../calendarUtils';

describe('calendarUtils', () => {
  describe('generateICSContent', () => {
    it('should generate valid ICS content for basic event', () => {
      const event = {
        title: 'Test Meeting',
        startDate: new Date('2026-01-15T10:00:00'),
        endDate: new Date('2026-01-15T11:00:00'),
      };

      const ics = generateICSContent(event);

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('SUMMARY:Test Meeting');
      expect(ics).toContain('DTSTART:20260115T100000');
      expect(ics).toContain('DTEND:20260115T110000');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('should include description when provided', () => {
      const event = {
        title: 'Meeting',
        description: 'Important meeting about project',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      const ics = generateICSContent(event);

      expect(ics).toContain('DESCRIPTION:Important meeting about project');
    });

    it('should include location when provided', () => {
      const event = {
        title: 'Meeting',
        location: 'Conference Room A',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      const ics = generateICSContent(event);

      expect(ics).toContain('LOCATION:Conference Room A');
    });

    it('should handle all-day events', () => {
      const event = {
        title: 'All Day Event',
        startDate: new Date('2026-01-15'),
        allDay: true,
      };

      const ics = generateICSContent(event);

      expect(ics).toContain('DTSTART;VALUE=DATE:20260115');
      expect(ics).toContain('DTEND;VALUE=DATE:');
      expect(ics).not.toContain('T'); // Time component should not be present for all-day
    });

    it('should default to 1 hour duration when no end date provided', () => {
      const startDate = new Date('2026-01-15T10:00:00');
      const event = {
        title: 'Meeting',
        startDate,
      };

      const ics = generateICSContent(event);

      expect(ics).toContain('DTSTART:20260115T100000');
      expect(ics).toContain('DTEND:20260115T110000'); // 1 hour later
    });

    it('should escape newlines in description', () => {
      const event = {
        title: 'Meeting',
        description: 'Line 1\nLine 2\nLine 3',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      const ics = generateICSContent(event);

      expect(ics).toContain('DESCRIPTION:Line 1\\nLine 2\\nLine 3');
    });

    it('should include UID for event uniqueness', () => {
      const event = {
        title: 'Meeting',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      const ics = generateICSContent(event);

      expect(ics).toMatch(/UID:.+@dirq-solutions\.nl/);
    });

    it('should mark event as confirmed', () => {
      const event = {
        title: 'Meeting',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      const ics = generateICSContent(event);

      expect(ics).toContain('STATUS:CONFIRMED');
    });

    it('should use correct line endings (CRLF)', () => {
      const event = {
        title: 'Meeting',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      const ics = generateICSContent(event);

      expect(ics).toContain('\r\n');
    });
  });

  describe('downloadICSFile', () => {
    let createElementSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;
    let mockLink: any;

    beforeEach(() => {
      // Mock document methods
      mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };

      createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      // Mock URL methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock Blob
      global.Blob = vi.fn((content, options) => ({
        content,
        options,
      })) as any;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create and download ICS file', () => {
      const event = {
        title: 'Test Meeting',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      downloadICSFile(event);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
      expect(mockLink.click).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should use custom filename when provided', () => {
      const event = {
        title: 'Test Meeting',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      downloadICSFile(event, 'custom-event.ics');

      expect(mockLink.download).toBe('custom-event.ics');
    });

    it('should generate filename from title when not provided', () => {
      const event = {
        title: 'Test Meeting 123',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      downloadICSFile(event);

      expect(mockLink.download).toBe('Test_Meeting_123.ics');
    });

    it('should create blob with correct content type', () => {
      const event = {
        title: 'Test Meeting',
        startDate: new Date('2026-01-15T10:00:00'),
      };

      downloadICSFile(event);

      expect(global.Blob).toHaveBeenCalledWith(
        expect.any(Array),
        { type: 'text/calendar;charset=utf-8' }
      );
    });
  });
});
