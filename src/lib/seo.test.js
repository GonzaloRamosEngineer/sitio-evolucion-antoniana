import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { canonicalUrl } from '@/lib/seo';

const ROOT = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('higiene SEO de rutas', () => {
  it('construye canonicals sobre el dominio configurado y no sobre el preview', () => {
    expect(canonicalUrl('/')).toBe('https://www.evolucionantoniana.com/');
    expect(canonicalUrl('/beneficios')).toBe(
      'https://www.evolucionantoniana.com/beneficios',
    );
    expect(canonicalUrl('alianzas/ejemplo/')).toBe(
      'https://www.evolucionantoniana.com/alianzas/ejemplo',
    );
  });

  it('publica robots.txt real y anuncia el sitemap canónico', () => {
    const robots = read('public/robots.txt');
    expect(robots).toMatch(/^User-agent: \*/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).toContain(
      'Sitemap: https://www.evolucionantoniana.com/sitemap.xml',
    );
    expect(robots).not.toContain('<!doctype html>');
  });

  it('Vercel sirve sitemap.xml desde la función y robots desde public', () => {
    const vercel = JSON.parse(read('vercel.json'));
    expect(vercel.rewrites).toContainEqual({
      source: '/sitemap.xml',
      destination: '/api/sitemap',
    });
    expect(vercel.rewrites.some(({ source }) => source === '/robots.txt')).toBe(false);
  });

  it('las páginas públicas que tenían gaps declaran canonical', () => {
    const files = [
      'src/pages/BenefitsPage.jsx',
      'src/pages/BenefitDetailPage.jsx',
      'src/pages/PartnerDetailPage.jsx',
      'src/pages/ActivityDetailPage.jsx',
      'src/pages/ApplyPartnerPage.jsx',
      'src/pages/club/PostularComercioPage.jsx',
    ];
    for (const file of files) {
      expect(read(file), file).toContain('rel="canonical"');
    }
  });

  it('el panel general y el mostrador personal declaran noindex', () => {
    expect(read('src/pages/AdminPanel.jsx')).toContain(
      '<meta name="robots" content="noindex" />',
    );
    expect(read('src/pages/club/ClubPage.jsx')).toContain(
      '<meta name="robots" content="noindex, follow" />',
    );
  });
});
