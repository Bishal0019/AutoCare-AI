const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

/** UTC instant for midnight at the start of today in the service centre's timezone. */
export function startOfBusinessDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) - (5.5 * 60 * 60 * 1000));
}

/** Formats a stored instant as the service date used by the business. */
export function formatBusinessDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
}
