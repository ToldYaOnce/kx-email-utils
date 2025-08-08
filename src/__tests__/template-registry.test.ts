/**
 * Tests for template registry functionality
 */

import { TemplateRegistry, createTemplate } from '../templates';
import type { TemplateDefinition } from '../templates/base';

describe('TemplateRegistry', () => {
  let registry: TemplateRegistry;

  beforeEach(() => {
    registry = new TemplateRegistry();
  });

  describe('template registration', () => {
    it('should register and retrieve templates', () => {
      const mockDefinition: TemplateDefinition = {
        subject: 'Test Subject',
        html: '<p>Hello {{name}}</p>',
        text: 'Hello {{name}}',
      };

      const template = createTemplate(mockDefinition, 'en');
      registry.registerTemplate('test', 'en', template);

      const retrieved = registry.getTemplate('test', 'en');
      expect(retrieved).toBeDefined();
      expect(retrieved?.getLocale()).toBe('en');
    });

    it('should register templates from definition', () => {
      const definition: TemplateDefinition = {
        subject: 'Welcome {{name}}',
        html: '<h1>Welcome {{name}}!</h1>',
        text: 'Welcome {{name}}!',
      };

      registry.registerFromDefinition('welcome', 'en', definition);

      const template = registry.getTemplate('welcome', 'en');
      expect(template).toBeDefined();
    });

    it('should fallback to default locale', () => {
      const definition: TemplateDefinition = {
        subject: 'Default Template',
        html: '<p>Default content</p>',
        text: 'Default content',
      };

      registry.registerFromDefinition('fallback', 'en', definition);

      // Request non-existent locale, should fallback to 'en'
      const template = registry.getTemplate('fallback', 'fr');
      expect(template).toBeDefined();
    });

    it('should return undefined for non-existent templates', () => {
      const template = registry.getTemplate('nonexistent', 'en');
      expect(template).toBeUndefined();
    });
  });

  describe('template queries', () => {
    beforeEach(() => {
      const definition: TemplateDefinition = {
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
      };

      registry.registerFromDefinition('test', 'en', definition);
      registry.registerFromDefinition('test', 'es', definition);
      registry.registerFromDefinition('other', 'en', definition);
    });

    it('should list available types', () => {
      const types = registry.getAvailableTypes();
      expect(types).toContain('test');
      expect(types).toContain('other');
      expect(types).toContain('invite'); // Default templates
      expect(types).toContain('resetPassword');
    });

    it('should list available locales for a type', () => {
      const locales = registry.getAvailableLocales('test');
      expect(locales).toContain('en');
      expect(locales).toContain('es');
    });

    it('should check template existence', () => {
      expect(registry.hasTemplate('test', 'en')).toBe(true);
      expect(registry.hasTemplate('test', 'fr')).toBe(true); // Fallback
      expect(registry.hasTemplate('nonexistent', 'en')).toBe(false);
    });
  });

  describe('template rendering', () => {
    beforeEach(() => {
      const definition: TemplateDefinition = {
        subject: 'Hello {{name}}',
        html: '<p>Hello {{name}}, welcome to {{company}}!</p>',
        text: 'Hello {{name}}, welcome to {{company}}!',
        defaults: {
          company: 'Default Company',
        },
      };

      registry.registerFromDefinition('greeting', 'en', definition);
    });

    it('should render template with data', async () => {
      const content = await registry.renderTemplate('greeting', {
        name: 'John',
        company: 'Acme Corp',
      }, 'en');

      expect(content.subject).toBe('Hello John');
      expect(content.html).toContain('Hello John, welcome to Acme Corp!');
      expect(content.text).toContain('Hello John, welcome to Acme Corp!');
    });

    it('should use default values', async () => {
      const content = await registry.renderTemplate('greeting', {
        name: 'John',
      }, 'en');

      expect(content.html).toContain('Default Company');
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        registry.renderTemplate('nonexistent', {}, 'en')
      ).rejects.toThrow('Template \'nonexistent\' not found');
    });
  });
});