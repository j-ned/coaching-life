import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Provider, Type } from '@angular/core';

/**
 * Crée une fixture avec providers overridés sur le composant.
 */
export function setupTestBed<T>(component: Type<T>, providers: Provider[]): ComponentFixture<T> {
  return TestBed.overrideComponent(component, {
    set: {
      providers: [...providers],
    },
  }).createComponent(component);
}

/**
 * Cherche un élément HTML par son contenu textuel.
 */
export function getByText(root: HTMLElement, text: string, selector?: string): HTMLElement | null {
  const candidates = selector
    ? Array.from(root.querySelectorAll(selector))
    : Array.from([root, ...root.querySelectorAll('*')]);

  for (const el of candidates) {
    if (el.textContent?.trim().includes(text)) {
      return el as HTMLElement;
    }
  }
  return null;
}
