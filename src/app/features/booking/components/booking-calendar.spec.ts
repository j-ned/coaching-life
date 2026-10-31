import { inputBinding, outputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BookingCalendar } from './booking-calendar';
import type { DisabledDate } from '../domain/models/appointment.model';
import { DisabledDateBuilder } from '../test-utils/appointment.builder';

async function renderCalendar(now: string, disabledDates: readonly DisabledDate[] = []) {
  vi.setSystemTime(new Date(now));
  const selectedDates: string[] = [];
  const fixture = TestBed.createComponent(BookingCalendar, {
    bindings: [
      inputBinding('disabledDates', signal(disabledDates)),
      outputBinding<string>('selectedDateChange', (date) => selectedDates.push(date)),
    ],
  });
  fixture.detectChanges();
  await fixture.whenStable();

  const host: HTMLElement = fixture.nativeElement;
  const day = (dayNumber: number) => {
    const button = Array.from(
      host.querySelectorAll<HTMLButtonElement>('[role="grid"] button'),
    ).find((candidate) => candidate.textContent?.trim() === String(dayNumber));
    if (!button) throw new Error(`Jour ${dayNumber} absent du calendrier`);
    return button;
  };
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  return { day, selectedDates, settle };
}

describe('BookingCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rend indisponible aujourd’hui pour délai de prévenance', async () => {
    const calendar = await renderCalendar('2026-10-01T08:00:00Z');

    expect(calendar.day(1).disabled).toBe(true);
    expect(calendar.day(1).getAttribute('aria-label')).toBe(
      'jeudi 1 octobre 2026, indisponible : Délai de prévenance de 24 h',
    );
  });

  it('ne sélectionne pas aujourd’hui au clic', async () => {
    const calendar = await renderCalendar('2026-10-01T08:00:00Z');

    calendar.day(1).click();
    await calendar.settle();

    expect(calendar.selectedDates).toEqual([]);
  });

  it('laisse le lendemain réservable tant que son dernier créneau est à plus de 24 h', async () => {
    const calendar = await renderCalendar('2026-10-01T08:00:00Z');

    expect(calendar.day(2).disabled).toBe(false);
    expect(calendar.day(2).getAttribute('aria-label')).toBe('vendredi 2 octobre 2026, disponible');

    calendar.day(2).click();
    await calendar.settle();

    expect(calendar.selectedDates).toEqual(['2026-10-02']);
  });

  it('laisse le lendemain réservable quand son dernier créneau est à exactement 24 h', async () => {
    const calendar = await renderCalendar('2026-10-01T15:30:00Z');

    expect(calendar.day(2).disabled).toBe(false);
  });

  it('rend le lendemain indisponible une fois son dernier créneau passé sous les 24 h', async () => {
    const calendar = await renderCalendar('2026-10-01T15:31:00Z');

    expect(calendar.day(2).disabled).toBe(true);
    expect(calendar.day(2).getAttribute('aria-label')).toBe(
      'vendredi 2 octobre 2026, indisponible : Délai de prévenance de 24 h',
    );
  });

  it('affiche la raison de l’admin plutôt que le délai de prévenance', async () => {
    const calendar = await renderCalendar('2026-10-01T08:00:00Z', [
      DisabledDateBuilder.default().with('date', '2026-10-01').with('reason', 'Formation').build(),
    ]);

    expect(calendar.day(1).getAttribute('aria-label')).toBe(
      'jeudi 1 octobre 2026, indisponible : Formation',
    );
  });

  it('affiche le week-end plutôt que le délai de prévenance', async () => {
    const calendar = await renderCalendar('2026-10-02T15:31:00Z');

    expect(calendar.day(3).getAttribute('aria-label')).toBe(
      'samedi 3 octobre 2026, indisponible : Weekend',
    );
  });
});
