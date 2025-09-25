import { z } from 'zod'
import { randomUUID } from 'crypto'

// YooKassa API configuration
const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'

// Validate credentials at runtime
const validateCredentials = () => {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  
  if (!shopId || !secretKey) {
    throw new Error('YooKassa credentials not configured. Please set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY environment variables.')
  }
  
  return { shopId, secretKey }
}

// Basic auth header for YooKassa API
const getAuthHeaders = (idempotenceKey?: string) => {
  const { shopId, secretKey } = validateCredentials()
  return {
    'Authorization': `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
    'Content-Type': 'application/json',
    ...(idempotenceKey && { 'Idempotence-Key': idempotenceKey }),
  }
}

// Generate deterministic idempotence key for payments
export function generateIdempotenceKey(invoiceId: string, attempt: number = 1): string {
  return `invoice_${invoiceId}_attempt_${attempt}`
}

// YooKassa API response types
export interface YooKassaPayment {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  amount: {
    value: string
    currency: 'RUB'
  }
  confirmation?: {
    type: 'redirect'
    confirmation_url: string
  }
  created_at: string
  description?: string
  receipt?: YooKassaReceipt
  metadata?: Record<string, string>
}

// Receipt structure for 54-FZ compliance
export interface YooKassaReceipt {
  customer?: {
    full_name?: string
    email?: string
    phone?: string
    inn?: string
  }
  items: YooKassaReceiptItem[]
  tax_system_code?: 1 | 2 | 3 | 4 | 5 | 6  // Taxation systems
  phone?: string
  email?: string
  send?: boolean
}

export interface YooKassaReceiptItem {
  description: string
  amount: {
    value: string
    currency: 'RUB'
  }
  vat_code: 1 | 2 | 3 | 4 | 5 | 6  // VAT codes: 1=без НДС, 2=0%, 3=10%, 4=20%, 5=10/110, 6=20/120
  quantity: string
  measure?: string
  payment_mode: 'full_prepayment' | 'full_payment' | 'advance' | 'partial_prepayment' | 'partial_payment' | 'credit' | 'credit_payment'
  payment_subject: 'commodity' | 'excise' | 'job' | 'service' | 'gambling_bet' | 'gambling_prize' | 'lottery' | 'lottery_prize' | 'intellectual_activity' | 'payment' | 'agent_commission' | 'composite' | 'another'
  country_of_origin_code?: string
  customs_declaration_number?: string
  excise?: string
  product_code?: string  // For marked goods (DataMatrix code)
  mark_code_info?: {
    mark_code_raw: string
  }
}

// Schemas for validation
export const createPaymentSchema = z.object({
  amount: z.object({
    value: z.string().regex(/^\d+\.\d{2}$/), // Format: "100.00"
    currency: z.literal('RUB')
  }),
  description: z.string().optional(),
  receipt: z.object({
    customer: z.object({
      full_name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      inn: z.string().optional(),
    }).optional(),
    items: z.array(z.object({
      description: z.string().min(1).max(128),
      amount: z.object({
        value: z.string().regex(/^\d+\.\d{2}$/),
        currency: z.literal('RUB')
      }),
      vat_code: z.number().int().min(1).max(6),
      quantity: z.string().regex(/^\d+(\.\d+)?$/),
      payment_mode: z.enum(['full_prepayment', 'full_payment', 'advance', 'partial_prepayment', 'partial_payment', 'credit', 'credit_payment']),
      payment_subject: z.enum(['commodity', 'excise', 'job', 'service', 'gambling_bet', 'gambling_prize', 'lottery', 'lottery_prize', 'intellectual_activity', 'payment', 'agent_commission', 'composite', 'another']),
      product_code: z.string().optional(),
      mark_code_info: z.object({
        mark_code_raw: z.string()
      }).optional()
    })),
    tax_system_code: z.number().int().min(1).max(6).optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    send: z.boolean().default(true)
  }),
  confirmation: z.object({
    type: z.literal('redirect'),
    return_url: z.string().url()
  }).optional(),
  capture: z.boolean().default(true),
  metadata: z.record(z.string()).optional()
})

export type CreatePaymentRequest = z.infer<typeof createPaymentSchema>

/**
 * Create a payment with fiscal receipt in YooKassa
 */
export async function createPayment(
  paymentData: CreatePaymentRequest, 
  idempotenceKey?: string
): Promise<YooKassaPayment> {
  try {
    const validatedData = createPaymentSchema.parse(paymentData)
    
    const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
      method: 'POST',
      headers: getAuthHeaders(idempotenceKey),
      body: JSON.stringify(validatedData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`YooKassa API error: ${error.description || response.statusText}`)
    }

    const payment: YooKassaPayment = await response.json()
    return payment
  } catch (error) {
    console.error('Error creating YooKassa payment:', error)
    throw error
  }
}

/**
 * Get payment information by ID
 */
export async function getPayment(paymentId: string): Promise<YooKassaPayment> {
  try {
    const { shopId, secretKey } = validateCredentials()
    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`YooKassa API error: ${error.description || response.statusText}`)
    }

    const payment: YooKassaPayment = await response.json()
    return payment
  } catch (error) {
    console.error('Error getting YooKassa payment:', error)
    throw error
  }
}

/**
 * Create a receipt (for existing payment or standalone)
 */
export async function createReceipt(
  receiptData: {
    type?: 'payment' | 'refund'
    payment_id?: string
    refund_id?: string
    receipt: YooKassaReceipt
  },
  idempotenceKey?: string
): Promise<any> {
  try {
    const response = await fetch(`${YOOKASSA_API_URL}/receipts`, {
      method: 'POST',
      headers: getAuthHeaders(idempotenceKey),
      body: JSON.stringify(receiptData)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`YooKassa Receipt API error: ${error.description || response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error creating YooKassa receipt:', error)
    throw error
  }
}

/**
 * Cancel a payment
 */
export async function cancelPayment(paymentId: string, reason?: string): Promise<YooKassaPayment> {
  try {
    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        ...(reason && { description: reason })
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`YooKassa API error: ${error.description || response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error canceling YooKassa payment:', error)
    throw error
  }
}

/**
 * Helper function to map payment mode for veterinary services
 */
export function getPaymentModeForItem(itemType: 'service' | 'product' | 'medication'): YooKassaReceiptItem['payment_mode'] {
  return 'full_payment' // Все типы - полная оплата
}

/**
 * Helper function to map payment subject for veterinary services
 */
export function getPaymentSubjectForItem(itemType: 'service' | 'product' | 'medication'): YooKassaReceiptItem['payment_subject'] {
  return itemType === 'service' ? 'service' : 'commodity' // product и medication - товары
}

/**
 * Helper function to determine VAT code (54-ФЗ compliant)
 * VAT codes: 1=без НДС, 2=0%, 3=10%, 4=20%, 5=10/110, 6=20/120
 */
export function getVatCodeForItem(vatRate?: string | number): YooKassaReceiptItem['vat_code'] {
  const rate = typeof vatRate === 'string' ? vatRate : String(vatRate);
  
  switch (rate) {
    case '0': return 2    // 0%
    case '10': return 3   // 10%
    case '20': return 4   // 20%
    case 'not_applicable': return 1 // без НДС
    default: return 1   // без НДС (по умолчанию для ветеринарных услуг)
  }
}

/**
 * Convert invoice data to YooKassa payment format with proper 54-ФЗ compliance
 */
export function convertInvoiceToPayment(invoiceData: {
  patientId: string
  patientName: string
  ownerName: string
  ownerEmail?: string
  ownerPhone?: string
  items: Array<{
    name: string
    type: 'service' | 'product' | 'medication'
    quantity: number
    price: number
    total: number
    vatRate?: string
    productCode?: string
    markingStatus?: string
  }>
  total: number
  vatTotal: number
  description?: string
}): CreatePaymentRequest {
  
  const receiptItems: YooKassaReceiptItem[] = invoiceData.items.map(item => ({
    description: item.name.substring(0, 128), // YooKassa limit
    amount: {
      value: item.total.toFixed(2),
      currency: 'RUB'
    },
    vat_code: getVatCodeForItem(item.vatRate || (item.type === 'service' ? 'not_applicable' : '20')),
    quantity: item.quantity.toString(),
    payment_mode: getPaymentModeForItem(item.type),
    payment_subject: getPaymentSubjectForItem(item.type),
    ...(item.productCode && {
      product_code: item.productCode,
      mark_code_info: { mark_code_raw: item.productCode }
    })
  }))

  return {
    amount: {
      value: invoiceData.total.toFixed(2),
      currency: 'RUB'
    },
    description: invoiceData.description || `Ветеринарные услуги для ${invoiceData.patientName}`,
    receipt: {
      customer: {
        full_name: invoiceData.ownerName,
        email: invoiceData.ownerEmail,
        phone: invoiceData.ownerPhone
      },
      items: receiptItems,
      tax_system_code: 2, // УСН доходы (код 2, наиболее распространенный для ветклиник)
      email: invoiceData.ownerEmail,
      phone: invoiceData.ownerPhone,
      send: true
    },
    confirmation: {
      type: 'redirect',
      return_url: `${process.env.REPL_URL || 'http://localhost:5000'}/finance`
    },
    capture: true,
    metadata: {
      patient_id: invoiceData.patientId,
      source: 'vetsystem'
    }
  }
}