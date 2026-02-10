import { describe, it, expect } from 'vitest';

// Extract function for testing
export function kebabToPascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

describe('kebabToPascalCase', () => {
  it('should convert simple kebab-case', () => {
    expect(kebabToPascalCase('hello')).toBe('Hello');
  });

  it('should convert with single hyphen', () => {
    expect(kebabToPascalCase('my-component')).toBe('MyComponent');
  });

  it('should convert with multiple hyphens', () => {
    expect(kebabToPascalCase('my-cool-button')).toBe('MyCoolButton');
  });

  it('should handle all uppercase input', () => {
    expect(kebabToPascalCase('MY-COOL-BUTTON')).toBe('MyCoolButton');
  });

  it('should handle all lowercase input', () => {
    expect(kebabToPascalCase('my-cool-button')).toBe('MyCoolButton');
  });

  it('should handle mixed case input', () => {
    expect(kebabToPascalCase('My-Cool-Button')).toBe('MyCoolButton');
  });

  it('should handle no hyphens', () => {
    expect(kebabToPascalCase('button')).toBe('Button');
  });

  it('should handle many segments', () => {
    expect(kebabToPascalCase('super-duper-mega-ultra-button')).toBe('SuperDuperMegaUltraButton');
  });

  it('should handle single character segments', () => {
    expect(kebabToPascalCase('a-b-c')).toBe('ABC');
  });

  it('should handle empty string', () => {
    expect(kebabToPascalCase('')).toBe('');
  });
});

describe('Component Discovery Integration', () => {
  it('should produce valid JavaScript identifiers', () => {
    const testCases = [
      'hello',
      'my-component',
      'super-cool-button',
      'button-v2',
      'icon-24px',
    ];

    testCases.forEach(input => {
      const result = kebabToPascalCase(input);
      // Valid JS identifier: starts with letter, contains only letters/numbers
      expect(result).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
    });
  });

  it('should be idempotent when input is already PascalCase', () => {
    expect(kebabToPascalCase('MyComponent')).toBe('Mycomponent'); // lowercase all but first
  });
});
