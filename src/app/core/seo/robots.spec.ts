import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INDEX_HTML = readFileSync(resolve(process.cwd(), 'src/index.html'), 'utf-8');

describe('robots directive of the demo site', () => {
  it('should ask search engines not to index any page', () => {
    // Given
    const document = new DOMParser().parseFromString(INDEX_HTML, 'text/html');

    // When
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute('content');

    // Then
    expect(robots).toBe('noindex');
  });
});
