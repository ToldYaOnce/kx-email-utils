/**
 * Base template renderer using Mustache
 */

import Mustache from 'mustache';
import { convert } from 'html-to-text';
import type { TemplateRenderer, EmailContent, Locale } from '../types';

/**
 * Template definition interface
 */
export interface TemplateDefinition {
  /** HTML template string */
  html: string;
  /** Plain text template string (optional) */
  text?: string;
  /** Subject line template */
  subject: string;
  /** Default values for template variables */
  defaults?: Record<string, any>;
}

/**
 * Base Mustache template renderer
 */
export class MustacheTemplateRenderer implements TemplateRenderer {
  private template: TemplateDefinition;
  private locale: Locale;

  constructor(template: TemplateDefinition, locale: Locale = 'en') {
    this.template = template;
    this.locale = locale;
  }

  /**
   * Render email content from template data
   */
  async render(data: any, locale?: Locale): Promise<EmailContent> {
    const renderLocale = locale || this.locale;
    
    // Merge with defaults
    const templateData = {
      ...this.template.defaults,
      ...data,
      locale: renderLocale,
    };

    // Render HTML
    const html = Mustache.render(this.template.html, templateData);
    
    // Render or generate text content
    let text: string;
    if (this.template.text) {
      text = Mustache.render(this.template.text, templateData);
    } else {
      // Generate text from HTML
      text = convert(html, {
        wordwrap: 130,
        selectors: [
          { selector: 'img', options: { ignoreHref: true } },
          { selector: 'a', options: { hideLinkHrefIfSameAsText: true } }
        ]
      });
    }

    // Render subject
    const subject = Mustache.render(this.template.subject, templateData);

    return {
      html,
      text,
      subject,
    };
  }

  /**
   * Get template locale
   */
  getLocale(): Locale {
    return this.locale;
  }

  /**
   * Create a new renderer with different locale
   */
  withLocale(locale: Locale): MustacheTemplateRenderer {
    return new MustacheTemplateRenderer(this.template, locale);
  }
}