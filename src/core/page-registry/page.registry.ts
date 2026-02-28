import type { ReportPage } from './page.types';

/**
 * PageRegistry is the central catalog of all renderable report pages.
 *
 * Pages are registered by name at startup. The report engine resolves a
 * tenant's pageOrder against this registry at generation time, so adding
 * a new page never requires touching report generation logic.
 */
class PageRegistry {
  private readonly pages = new Map<string, ReportPage>();

  register(page: ReportPage): void {
    if (this.pages.has(page.name)) {
      throw new Error(`Page "${page.name}" is already registered.`);
    }
    this.pages.set(page.name, page);
  }

  resolve(name: string): ReportPage | undefined {
    return this.pages.get(name);
  }

  resolveMany(names: string[]): Array<{ name: string; found: boolean }> {
    return names.map((name) => ({
      name,
      found: this.pages.has(name),
    }));
  }

  list(): string[] {
    return Array.from(this.pages.keys());
  }

  has(name: string): boolean {
    return this.pages.has(name);
  }
}

export const pageRegistry = new PageRegistry();
