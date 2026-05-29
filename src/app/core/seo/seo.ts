import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SITE_NAME, SITE_URL } from '../config.js';
import type { PageSeo } from './route-seo.js';

/**
 * Met à jour titre, meta description, Open Graph, Twitter Card et canonical
 * par route. Exécuté en SSR (DOCUMENT/Title/Meta sont safe côté serveur),
 * les balises sont donc présentes dans le HTML pré-rendu pour les crawlers.
 */
@Injectable({ providedIn: 'root' })
export class Seo {
  private readonly _title = inject(Title);
  private readonly _meta = inject(Meta);
  private readonly _document = inject(DOCUMENT);

  update(page: PageSeo): void {
    const url = `${SITE_URL}${page.path}`;
    const fullTitle = `${page.title} · ${SITE_NAME}`;

    this._title.setTitle(fullTitle);
    this._meta.updateTag({ name: 'description', content: page.description });
    this._meta.updateTag({ property: 'og:title', content: fullTitle });
    this._meta.updateTag({ property: 'og:description', content: page.description });
    this._meta.updateTag({ property: 'og:url', content: url });
    this._meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this._meta.updateTag({ name: 'twitter:description', content: page.description });
    this._setCanonical(url);
  }

  private _setCanonical(url: string): void {
    const head = this._document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this._document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
