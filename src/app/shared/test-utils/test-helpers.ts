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
 * Cherche un élément par son `data-testid` (jamais par id/classe/texte).
 */
export function getByTestId(root: HTMLElement, testId: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
}

/**
 * Tous les éléments portant ce `data-testid` (listes, lignes répétées).
 */
export function getAllByTestId(root: HTMLElement, testId: string): readonly HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-testid="${testId}"]`));
}
