export function getDateKeyInTz(timeZone, date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getZonedParts(timeZone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  return parts
}

export function shiftDateKey(dateKey, deltaDays) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const dt = new Date(Date.UTC(year, month - 1, day))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}

export function getYesterdayDateKey(timeZone, date = new Date()) {
  return shiftDateKey(getDateKeyInTz(timeZone, date), -1)
}

export function monthPrefix(dateKey) {
  return dateKey.slice(0, 7)
}

export function yearPrefix(dateKey) {
  return dateKey.slice(0, 4)
}

const MONTH_NAMES = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

export function formatRussianDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return `${day} ${MONTH_NAMES[month - 1]} ${year}`
}
