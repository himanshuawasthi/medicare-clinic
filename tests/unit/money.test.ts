import { describe, it, expect } from 'vitest';
import { toPaise, toRupees, formatRupees, sumPaise } from '@/lib/money';

describe('money helpers', () => {
  describe('toPaise', () => {
    it('converts whole rupees to paise', () => {
      expect(toPaise(1)).toBe(100);
      expect(toPaise(100)).toBe(10000);
    });

    it('converts fractional rupees to paise (rounded)', () => {
      expect(toPaise(12.5)).toBe(1250);
      expect(toPaise(1.999)).toBe(200); // rounds to nearest
    });

    it('returns 0 for 0', () => {
      expect(toPaise(0)).toBe(0);
    });
  });

  describe('toRupees', () => {
    it('converts paise to rupees', () => {
      expect(toRupees(100)).toBe(1);
      expect(toRupees(1250)).toBe(12.5);
      expect(toRupees(0)).toBe(0);
    });
  });

  describe('formatRupees', () => {
    it('formats paise as ₹ INR string', () => {
      const result = formatRupees(150);
      expect(result).toContain('₹');
      expect(result).toContain('1.50');
    });

    it('formats large amounts with Indian notation', () => {
      const result = formatRupees(12345600); // ₹1,23,456.00
      expect(result).toContain('₹');
    });

    it('formats zero as ₹0.00', () => {
      const result = formatRupees(0);
      expect(result).toContain('0.00');
    });
  });

  describe('sumPaise', () => {
    it('sums an array of paise values', () => {
      expect(sumPaise([100, 200, 300])).toBe(600);
    });

    it('returns 0 for empty array', () => {
      expect(sumPaise([])).toBe(0);
    });

    it('handles single value', () => {
      expect(sumPaise([1250])).toBe(1250);
    });
  });
});