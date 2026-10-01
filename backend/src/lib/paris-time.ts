type ParisDateTime = { readonly date: string; readonly minutes: number };

const parisFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Paris',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function toParisDateTime(instant: Date): ParisDateTime {
  const parts = Object.fromEntries(
    parisFormatter.formatToParts(instant).map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts['year']}-${parts['month']}-${parts['day']}`,
    minutes: Number(parts['hour']) * 60 + Number(parts['minute']),
  };
}
