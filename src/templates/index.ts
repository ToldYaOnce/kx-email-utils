/**
 * Template management and registration system
 */

import type { 
  TemplateRenderer, 
  TemplateCollection, 
  Locale,
  EmailContent 
} from '../types';
import { MustacheTemplateRenderer, TemplateDefinition } from './base';

/**
 * Template registry for managing email templates
 */
export class TemplateRegistry {
  private templates: TemplateCollection;
  private defaultLocale: Locale;

  constructor(defaultLocale: Locale = 'en') {
    this.defaultLocale = defaultLocale;
    this.templates = {
      invite: {},
      resetPassword: {},
    };
  }

  /**
   * Register a template for a specific type and locale
   */
  registerTemplate(
    type: string,
    locale: Locale,
    renderer: TemplateRenderer
  ): void {
    if (!this.templates[type]) {
      this.templates[type] = {};
    }
    this.templates[type][locale] = renderer;
  }

  /**
   * Register templates from definitions
   */
  registerFromDefinition(
    type: string,
    locale: Locale,
    definition: TemplateDefinition
  ): void {
    const renderer = new MustacheTemplateRenderer(definition, locale);
    this.registerTemplate(type, locale, renderer);
  }

  /**
   * Get a template renderer
   */
  getTemplate(type: string, locale?: Locale): TemplateRenderer | undefined {
    const targetLocale = locale || this.defaultLocale;
    
    // Try exact locale match
    if (this.templates[type]?.[targetLocale]) {
      return this.templates[type][targetLocale];
    }

    // Fallback to default locale
    if (targetLocale !== this.defaultLocale && this.templates[type]?.[this.defaultLocale]) {
      return this.templates[type][this.defaultLocale];
    }

    // Fallback to any available locale for this type
    const availableLocales = Object.keys(this.templates[type] || {});
    if (availableLocales.length > 0) {
      return this.templates[type][availableLocales[0]];
    }

    return undefined;
  }

  /**
   * Set all templates at once
   */
  setTemplates(templates: Partial<TemplateCollection>): void {
    Object.keys(templates).forEach(key => {
      if (templates[key]) {
        this.templates[key] = templates[key]!;
      }
    });
  }

  /**
   * Get all available template types
   */
  getAvailableTypes(): string[] {
    return Object.keys(this.templates);
  }

  /**
   * Get available locales for a template type
   */
  getAvailableLocales(type: string): Locale[] {
    return Object.keys(this.templates[type] || {});
  }

  /**
   * Check if a template exists
   */
  hasTemplate(type: string, locale?: Locale): boolean {
    return this.getTemplate(type, locale) !== undefined;
  }

  /**
   * Render a template with data
   */
  async renderTemplate(
    type: string,
    data: any,
    locale?: Locale
  ): Promise<EmailContent> {
    const template = this.getTemplate(type, locale);
    if (!template) {
      throw new Error(`Template '${type}' not found for locale '${locale || this.defaultLocale}'`);
    }

    return template.render(data, locale);
  }

  /**
   * Clear all templates
   */
  clear(): void {
    this.templates = {
      invite: {},
      resetPassword: {},
    };
  }
}

/**
 * Default template registry instance
 */
export const defaultTemplateRegistry = new TemplateRegistry();

/**
 * Helper function to create template renderer from definition
 */
export function createTemplate(
  definition: TemplateDefinition,
  locale: Locale = 'en'
): TemplateRenderer {
  return new MustacheTemplateRenderer(definition, locale);
}

export { MustacheTemplateRenderer, TemplateDefinition };