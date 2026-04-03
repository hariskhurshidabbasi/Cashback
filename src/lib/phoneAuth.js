export function normalizePakistanPhone(raw) {
  if (!raw) return null
  let s = String(raw).trim().replace(/\s+/g, '')

  // Accept numbers like 923001234567 or +923001234567
  if (s.startsWith('00')) s = '+' + s.slice(2)

  if (!s.startsWith('+92')) return null

  const digits = s.replace(/\D/g, '') // e.g. 923001234567
  // Pakistan phone format (+92 + 10 digits) => 12 digits total including country code
  if (digits.length !== 12) return null

  return '+92' + digits.slice(2) // +92xxxxxxxxxx
}

export function phoneToEmail(phoneE164) {
  // Firebase Auth needs an email. We convert the phone number to a stable email.
  const digits = phoneE164.replace(/\D/g, '') // 9230xxxxxxx
  return `${digits}@cashbackshop.com`
}

export function phoneDigitsForQuery(phoneE164) {
  // For building referral link, remove the '+' sign.
  return phoneE164.replace(/\D/g, '')
}

