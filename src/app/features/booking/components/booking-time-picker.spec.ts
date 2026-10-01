import { inputBinding, outputBinding, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BookingTimePicker } from './booking-time-picker';

type SlotSelection = { readonly time: string; readonly duration: number };

function hoursFrom(first: string, last: string): string[] {
  const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const times: string[] = [];
  for (let minutes = toMinutes(first); minutes <= toMinutes(last); minutes += 30) {
    times.push(
      `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`,
    );
  }
  return times;
}

async function renderPicker(initialDate: string) {
  const date = signal(initialDate);
  const selections: SlotSelection[] = [];
  const fixture = TestBed.createComponent(BookingTimePicker, {
    bindings: [
      inputBinding('date', date),
      outputBinding<SlotSelection>('slotSelected', (selection) => selections.push(selection)),
    ],
  });
  fixture.detectChanges();
  await fixture.whenStable();

  const host: HTMLElement = fixture.nativeElement;
  const slotButtons = () =>
    Array.from(host.querySelectorAll<HTMLButtonElement>('button')).filter(
      (button) => !button.closest('fieldset'),
    );
  const durationButton = (label: string) =>
    Array.from(host.querySelectorAll<HTMLButtonElement>('fieldset button')).find(
      (button) => button.textContent?.trim() === label,
    );
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  return {
    date,
    selections,
    host,
    settle,
    durationButton,
    durationLabels: () =>
      Array.from(host.querySelectorAll('fieldset button')).map((b) => b.textContent?.trim()),
    slotTimes: () => slotButtons().map((button) => button.textContent?.trim()),
    slotButtons,
  };
}

describe('BookingTimePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T08:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('propose les durées 30 min et 1h', async () => {
    const picker = await renderPicker('2026-10-05');

    expect(picker.durationLabels()).toEqual(['30 min', '1h']);
  });

  it('propose tous les créneaux d’une journée à plus de 24 h', async () => {
    const picker = await renderPicker('2026-10-05');

    expect(picker.slotTimes()).toEqual(hoursFrom('09:00', '17:00'));
  });

  it('masque les créneaux du lendemain qui commencent à moins de 24 h', async () => {
    const picker = await renderPicker('2026-10-02');

    expect(picker.slotTimes()).toEqual(hoursFrom('10:00', '17:00'));
  });

  it('masque les créneaux à moins de 24 h aussi en 30 min', async () => {
    const picker = await renderPicker('2026-10-02');

    picker.durationButton('30 min')!.click();
    await picker.settle();

    expect(picker.slotTimes()).toEqual(hoursFrom('10:00', '17:30'));
  });

  it('recalcule les créneaux masqués quand la date change', async () => {
    const picker = await renderPicker('2026-10-05');

    picker.date.set('2026-10-02');
    await picker.settle();

    expect(picker.slotTimes()).toEqual(hoursFrom('10:00', '17:00'));
  });

  it('n’affiche aucun créneau pour aujourd’hui', async () => {
    const picker = await renderPicker('2026-10-01');

    expect(picker.slotTimes()).toEqual([]);
    expect(picker.host.textContent).toContain('Aucun créneau disponible pour cette date.');
  });

  it('émet le premier créneau réservable du lendemain avec sa durée', async () => {
    const picker = await renderPicker('2026-10-02');

    picker.slotButtons()[0]!.click();
    await picker.settle();

    expect(picker.selections).toEqual([{ time: '10:00', duration: 60 }]);
  });
});
