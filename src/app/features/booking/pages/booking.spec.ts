import { DeferBlockBehavior, DeferBlockState, TestBed } from '@angular/core/testing';
import { Booking } from './booking';
import { AppointmentGateway } from '../domain/gateways/appointment.gateway';
import type { Appointment } from '../domain/models/appointment.model';
import { AppointmentBuilder } from '../test-utils/appointment.builder';

const SLOT_TAKEN_MESSAGE = "Ce créneau vient d'être réservé, choisissez-en un autre.";
const SUCCESS_MESSAGE = 'Votre rendez-vous a été réservé avec succès !';

function stubGateway() {
  let booked: readonly Appointment[] = [];
  return {
    setBooked: (appointments: readonly Appointment[]) => {
      booked = appointments;
    },
    getBookedSlots: vi.fn(async (month: string) =>
      booked.filter((appointment) => appointment.appointmentDate.startsWith(month)),
    ),
    getDisabledDates: vi.fn(async () => []),
    submitAppointment: vi.fn(),
  };
}

async function renderBooking() {
  const gateway = stubGateway();
  TestBed.configureTestingModule({
    providers: [{ provide: AppointmentGateway, useValue: gateway }],
    deferBlockBehavior: DeferBlockBehavior.Manual,
  });
  const fixture = TestBed.createComponent(Booking);
  fixture.detectChanges();
  await fixture.whenStable();
  const [deferBlock] = await fixture.getDeferBlocks();
  await deferBlock!.render(DeferBlockState.Complete);

  const host: HTMLElement = fixture.nativeElement;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const buttonNamed = (name: string) =>
    Array.from(host.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => (button.getAttribute('aria-label') ?? button.textContent?.trim()) === name,
    ) ?? null;
  const fieldLabelled = (label: string) => {
    const labelElement = Array.from(host.querySelectorAll('label')).find((candidate) =>
      candidate.textContent?.trim().startsWith(label),
    );
    return host.querySelector<HTMLInputElement>(`#${labelElement!.htmlFor}`)!;
  };
  const fill = (label: string, value: string, eventName = 'input') => {
    const field = fieldLabelled(label);
    field.value = value;
    field.dispatchEvent(new Event(eventName));
  };
  const textBlocks = () =>
    Array.from(host.querySelectorAll('div')).map((element) => element.textContent?.trim());

  const bookSlot = async (dayLabel: string, slotLabel: string) => {
    buttonNamed(dayLabel)!.click();
    await settle();
    buttonNamed(slotLabel)!.click();
    await settle();
    fill('Nom complet', 'Marie Dupont');
    fill('Email', 'marie.dupont@email.fr');
    fill('Téléphone', '0612345678');
    fill('Type de coaching', 'life-coaching', 'change');
    fill('Message', 'Je souhaite travailler sur ma confiance en soi.');
    await settle();
  };
  const confirm = async () => {
    buttonNamed('Confirmer la réservation')!.click();
    await settle();
  };

  return { gateway, host, settle, buttonNamed, textBlocks, bookSlot, confirm };
}

describe('Booking', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-01T08:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('confirme la réservation et remet la sélection à zéro en cas de succès', async () => {
    const page = await renderBooking();
    page.gateway.submitAppointment.mockResolvedValue({ success: true, message: SUCCESS_MESSAGE });
    await page.bookSlot('lundi 5 octobre 2026, disponible', '10:00, disponible');

    await page.confirm();

    expect(page.textBlocks()).toContain(SUCCESS_MESSAGE);
    expect(page.buttonNamed('Confirmer la réservation')).toBeNull();
    expect(page.buttonNamed('10:00, disponible')).toBeNull();
    expect(page.host.textContent).toContain('Sélectionnez un créneau');
  });

  it('affiche le message dédié et retire le formulaire quand le créneau vient d’être pris', async () => {
    const page = await renderBooking();
    page.gateway.submitAppointment.mockResolvedValue({
      success: false,
      reason: 'slot-taken',
      message: SLOT_TAKEN_MESSAGE,
    });
    await page.bookSlot('lundi 5 octobre 2026, disponible', '10:00, disponible');

    await page.confirm();

    expect(page.textBlocks()).toContain(SLOT_TAKEN_MESSAGE);
    expect(page.buttonNamed('Confirmer la réservation')).toBeNull();
  });

  it('garde la date et affiche le créneau pris comme réservé après rechargement', async () => {
    const page = await renderBooking();
    page.gateway.submitAppointment.mockImplementation(async () => {
      page.gateway.setBooked([
        AppointmentBuilder.default()
          .with('appointmentDate', '2026-10-05')
          .with('appointmentTime', '10:00')
          .with('duration', 60)
          .build(),
      ]);
      return { success: false, reason: 'slot-taken', message: SLOT_TAKEN_MESSAGE };
    });
    await page.bookSlot('lundi 5 octobre 2026, disponible', '10:00, disponible');

    await page.confirm();

    expect(page.buttonNamed('10:00, créneau réservé')?.disabled).toBe(true);
    expect(page.buttonNamed('11:00, disponible')).not.toBeNull();
  });

  it('recharge les créneaux du mois de la date choisie même si le calendrier a changé de mois', async () => {
    const page = await renderBooking();
    page.gateway.submitAppointment.mockResolvedValue({
      success: false,
      reason: 'slot-taken',
      message: SLOT_TAKEN_MESSAGE,
    });
    await page.bookSlot('lundi 5 octobre 2026, disponible', '10:00, disponible');
    page.buttonNamed('Mois suivant')!.click();
    await page.settle();
    page.gateway.getBookedSlots.mockClear();

    await page.confirm();

    expect(page.gateway.getBookedSlots.mock.calls).toEqual([['2026-10']]);
  });

  it('laisse le formulaire en place quand la demande est refusée pour une autre raison', async () => {
    const page = await renderBooking();
    page.gateway.submitAppointment.mockResolvedValue({
      success: false,
      reason: 'rejected',
      message: "Cet horaire n'est pas proposé.",
    });
    await page.bookSlot('lundi 5 octobre 2026, disponible', '10:00, disponible');

    await page.confirm();

    expect(page.textBlocks()).toContain("Cet horaire n'est pas proposé.");
    expect(page.buttonNamed('Confirmer la réservation')).not.toBeNull();
  });
});
