import { describe, it, expect } from 'vitest';
import { formatDate, formatTime, ageFromDOB, isExpired, isExpiringSoon } from '@/lib/date';

describe('date helpers', () => {
  describe('formatDate', () => {
    it('formats a UTC date as dd-MMM-yyyy in IST', () => {
      // 2026-05-18T00:00:00Z → IST is same day at 05:30
      const result = formatDate('2026-05-18T00:00:00Z');
      expect(result).toBe('18 May 2026'); // en-GB locale format
    });

    it('accepts a Date object', () => {
      const result = formatDate(new Date('2026-01-01T00:00:00Z'));
      expect(result).toMatch(/2026/);
    });
  });

  describe('formatTime', () => {
    it('returns a 12-hour time string with AM/PM', () => {
      const result = formatTime('2026-05-18T06:30:00Z'); // 12:00 PM IST
      expect(result).toMatch(/(AM|PM)/i);
    });
  });

  describe('ageFromDOB', () => {
    it('calculates age correctly', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 30);
      expect(ageFromDOB(dob)).toBe(30);
    });

    it('handles birthday not yet reached this year', () => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 25);
      dob.setMonth(dob.getMonth() + 1); // birthday next month
      expect(ageFromDOB(dob)).toBe(24);
    });
  });

  describe('isExpired', () => {
    it('returns true for a past date', () => {
      expect(isExpired('2020-01-01')).toBe(true);
    });

    it('returns false for a future date', () => {
      expect(isExpired('2099-12-31')).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isExpired(null)).toBe(false);
      expect(isExpired(undefined)).toBe(false);
    });
  });

  describe('isExpiringSoon', () => {
    it('returns true for a date within 90 days', () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 30);
      expect(isExpiringSoon(soon)).toBe(true);
    });

    it('returns false for a date beyond 90 days', () => {
      const far = new Date();
      far.setDate(far.getDate() + 180);
      expect(isExpiringSoon(far)).toBe(false);
    });

    it('returns false for an already-expired date', () => {
      expect(isExpiringSoon('2020-01-01')).toBe(false);
    });
  });
});