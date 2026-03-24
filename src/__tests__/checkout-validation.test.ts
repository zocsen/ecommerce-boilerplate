import { describe, it, expect } from 'vitest'
import {
  checkoutSchema,
  contactSchema,
  addressSchema,
  homeDeliverySchema,
  pickupPointSchema,
} from '@/lib/validators/checkout'

/* ------------------------------------------------------------------ */
/*  Zod schema validation tests for checkout                           */
/*                                                                     */
/*  Tests contactSchema, addressSchema, homeDeliverySchema,            */
/*  pickupPointSchema, and the full checkoutSchema.                    */
/* ------------------------------------------------------------------ */

// ── Helpers ────────────────────────────────────────────────────────

function validAddress() {
  return {
    name: 'Teszt Elek',
    street: 'Váci utca 1.',
    city: 'Budapest',
    zip: '1052',
    country: 'HU',
  }
}

function validContact() {
  return {
    email: 'teszt@example.hu',
    phone: '+36 30 123 4567',
  }
}

function validHomeDelivery() {
  return {
    carrier: 'GLS',
    address: validAddress(),
    phone: '+36 30 123 4567',
  }
}

function validPickupPoint() {
  return {
    provider: 'Foxpost',
    pointId: 'BP-1234',
    pointLabel: 'Foxpost - Westend',
    phone: '+36 30 123 4567',
  }
}

function validCheckoutData() {
  return {
    contact: validContact(),
    shippingMethod: 'home',
    homeDelivery: validHomeDelivery(),
    billingAddress: validAddress(),
    sameAsBilling: true,
    notes: '',
    couponCode: '',
  }
}

// ── contactSchema ──────────────────────────────────────────────────

describe('contactSchema', () => {
  it('accepts valid email and Hungarian phone', () => {
    const result = contactSchema.safeParse(validContact())
    expect(result.success).toBe(true)
  })

  it('rejects missing email', () => {
    const result = contactSchema.safeParse({
      phone: '+36 30 123 4567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = contactSchema.safeParse({
      email: 'not-an-email',
      phone: '+36 30 123 4567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-Hungarian phone number', () => {
    const result = contactSchema.safeParse({
      email: 'teszt@example.hu',
      phone: '+1 555 123 4567',
    })
    expect(result.success).toBe(false)
  })

  it('rejects phone without +36 prefix', () => {
    const result = contactSchema.safeParse({
      email: 'teszt@example.hu',
      phone: '06 30 123 4567',
    })
    expect(result.success).toBe(false)
  })

  it('accepts compact +36 phone format', () => {
    const result = contactSchema.safeParse({
      email: 'teszt@example.hu',
      phone: '+36301234567',
    })
    expect(result.success).toBe(true)
  })
})

// ── addressSchema ──────────────────────────────────────────────────

describe('addressSchema', () => {
  it('accepts valid Hungarian address', () => {
    const result = addressSchema.safeParse(validAddress())
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const addr = { ...validAddress(), name: '' }
    const result = addressSchema.safeParse(addr)
    expect(result.success).toBe(false)
  })

  it('rejects missing street', () => {
    const addr = { ...validAddress(), street: '' }
    const result = addressSchema.safeParse(addr)
    expect(result.success).toBe(false)
  })

  it('rejects missing city', () => {
    const addr = { ...validAddress(), city: '' }
    const result = addressSchema.safeParse(addr)
    expect(result.success).toBe(false)
  })

  it('rejects invalid zip (not 4 digits)', () => {
    const addr = { ...validAddress(), zip: '123' }
    const result = addressSchema.safeParse(addr)
    expect(result.success).toBe(false)
  })

  it('rejects zip with letters', () => {
    const addr = { ...validAddress(), zip: 'ABCD' }
    const result = addressSchema.safeParse(addr)
    expect(result.success).toBe(false)
  })

  it('accepts valid 4-digit zip', () => {
    const addr = { ...validAddress(), zip: '6720' }
    const result = addressSchema.safeParse(addr)
    expect(result.success).toBe(true)
  })

  it('defaults country to HU when omitted', () => {
    const { country: _, ...addrWithoutCountry } = validAddress()
    const result = addressSchema.safeParse(addrWithoutCountry)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.country).toBe('HU')
    }
  })
})

// ── homeDeliverySchema ─────────────────────────────────────────────

describe('homeDeliverySchema', () => {
  it('accepts valid home delivery with GLS', () => {
    const result = homeDeliverySchema.safeParse(validHomeDelivery())
    expect(result.success).toBe(true)
  })

  it('accepts MPL carrier', () => {
    const data = { ...validHomeDelivery(), carrier: 'MPL' }
    const result = homeDeliverySchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('accepts Express One carrier', () => {
    const data = { ...validHomeDelivery(), carrier: 'Express One' }
    const result = homeDeliverySchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('rejects invalid carrier', () => {
    const data = { ...validHomeDelivery(), carrier: 'DHL' }
    const result = homeDeliverySchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects invalid phone on home delivery', () => {
    const data = { ...validHomeDelivery(), phone: 'not-a-phone' }
    const result = homeDeliverySchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

// ── pickupPointSchema ──────────────────────────────────────────────

describe('pickupPointSchema', () => {
  it('accepts valid Foxpost pickup', () => {
    const result = pickupPointSchema.safeParse(validPickupPoint())
    expect(result.success).toBe(true)
  })

  it('accepts all valid providers', () => {
    const providers = ['Foxpost', 'GLS Automata', 'Packeta', 'MPL Automata', 'Easybox']
    for (const provider of providers) {
      const data = { ...validPickupPoint(), provider }
      const result = pickupPointSchema.safeParse(data)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid provider', () => {
    const data = { ...validPickupPoint(), provider: 'PostaPont' }
    const result = pickupPointSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects empty pointId', () => {
    const data = { ...validPickupPoint(), pointId: '' }
    const result = pickupPointSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects empty pointLabel', () => {
    const data = { ...validPickupPoint(), pointLabel: '' }
    const result = pickupPointSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})

// ── Full checkoutSchema ────────────────────────────────────────────

describe('checkoutSchema: valid inputs', () => {
  it('accepts valid complete checkout with home delivery', () => {
    const result = checkoutSchema.safeParse(validCheckoutData())
    expect(result.success).toBe(true)
  })

  it('accepts valid checkout with pickup point (no home address)', () => {
    const data = {
      contact: validContact(),
      shippingMethod: 'pickup',
      pickupPoint: validPickupPoint(),
      billingAddress: validAddress(), // always required for invoicing
      sameAsBilling: false,
    }

    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('accepts checkout with optional notes and coupon', () => {
    const data = {
      ...validCheckoutData(),
      notes: 'Kérjük délután kiszállítani',
      couponCode: 'NYARI20',
    }

    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('accepts checkout without optional homeDelivery/pickupPoint fields', () => {
    const data = {
      contact: validContact(),
      shippingMethod: 'home',
      billingAddress: validAddress(),
      sameAsBilling: true,
    }

    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(true)
  })
})

describe('checkoutSchema: invalid inputs', () => {
  it('rejects missing contact', () => {
    const { contact: _, ...data } = validCheckoutData()
    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects missing email in contact', () => {
    const data = {
      ...validCheckoutData(),
      contact: { phone: '+36 30 123 4567' },
    }
    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects invalid Hungarian phone in contact', () => {
    const data = {
      ...validCheckoutData(),
      contact: { email: 'teszt@example.hu', phone: '+44 7911 123456' },
    }
    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects missing billingAddress', () => {
    const { billingAddress: _, ...data } = validCheckoutData()
    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects invalid billing address (missing fields)', () => {
    const data = {
      ...validCheckoutData(),
      billingAddress: { name: 'Teszt' }, // missing street, city, zip
    }
    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects invalid shippingMethod', () => {
    const data = {
      ...validCheckoutData(),
      shippingMethod: 'drone',
    }
    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects missing shippingMethod', () => {
    const { shippingMethod: _, ...data } = validCheckoutData()
    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(false)
  })

  it('rejects missing sameAsBilling', () => {
    const { sameAsBilling: _, ...data } = validCheckoutData()
    const result = checkoutSchema.safeParse(data)
    expect(result.success).toBe(false)
  })
})
