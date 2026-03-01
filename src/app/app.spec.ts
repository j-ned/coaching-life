import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('App', () => {
  it('should create the app', () => {
    // Given
    const fixture = TestBed.overrideComponent(App, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    }).createComponent(App);

    // Then
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should have the correct title', () => {
    // Given
    const fixture = TestBed.overrideComponent(App, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    }).createComponent(App);

    // Then
    expect(fixture.componentInstance['title']()).toBe('coaching-life');
  });
});
