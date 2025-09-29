/**
 * TypeScript interfaces for document data structures
 * Replaces `Record<string, any>` with proper type safety
 */

// Base document interface
export interface BaseDocumentData {
  document_type?: string;
  confidence_score?: number;
  processing_notes?: string;
  extraction_timestamp?: string;
}

// Invoice-specific data structure
export interface InvoiceData extends BaseDocumentData {
  invoice_number?: string;
  date?: string;
  due_date?: string;
  vendor_name?: string;
  vendor_address?: string;
  total_amount?: number;
  tax_amount?: number;
  line_items?: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

// Receipt-specific data structure
export interface ReceiptData extends BaseDocumentData {
  merchant_name?: string;
  date?: string;
  time?: string;
  total_amount?: number;
  tax_amount?: number;
  payment_method?: string;
  items?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

// Bank statement data structure
export interface BankStatementData extends BaseDocumentData {
  account_number?: string;
  statement_period_start?: string;
  statement_period_end?: string;
  opening_balance?: number;
  closing_balance?: number;
  bank_name?: string;
  account_holder?: string;
  transactions?: Array<{
    date: string;
    description: string;
    amount: number;
    balance: number;
    type: 'debit' | 'credit';
  }>;
}

// Credit card statement data structure
export interface CreditCardData extends BaseDocumentData {
  account_number?: string;
  statement_date?: string;
  payment_due_date?: string;
  minimum_payment?: number;
  current_balance?: number;
  credit_limit?: number;
  transactions?: Array<{
    date: string;
    merchant: string;
    amount: number;
    category?: string;
  }>;
}

// Tax form data structure
export interface TaxFormData extends BaseDocumentData {
  form_type?: string;
  tax_year?: number;
  taxpayer_name?: string;
  ssn?: string;
  income_amounts?: Record<string, number>;
  deductions?: Record<string, number>;
  tax_owed?: number;
  refund_amount?: number;
}

// Identity document data structure
export interface IdentityDocumentData extends BaseDocumentData {
  document_type?: 'drivers_license' | 'passport' | 'id_card' | 'other';
  name?: string;
  date_of_birth?: string;
  document_number?: string;
  expiration_date?: string;
  issuing_authority?: string;
  address?: string;
}

// Other/unknown document data structure
export interface OtherDocumentData extends BaseDocumentData {
  raw_content?: string;
  extracted_fields?: Record<string, string | number | boolean>;
  extraction_error?: string;
  parsing_error?: string;
}

// Union type for all document data types
export type DocumentData =
  | InvoiceData
  | ReceiptData
  | BankStatementData
  | CreditCardData
  | TaxFormData
  | IdentityDocumentData
  | OtherDocumentData;

// Type guard functions for runtime type checking
export function isInvoiceData(data: DocumentData): data is InvoiceData {
  return (data as InvoiceData).invoice_number !== undefined;
}

export function isReceiptData(data: DocumentData): data is ReceiptData {
  return (data as ReceiptData).merchant_name !== undefined;
}

export function isBankStatementData(data: DocumentData): data is BankStatementData {
  return (data as BankStatementData).account_number !== undefined &&
         (data as BankStatementData).transactions !== undefined;
}

export function isCreditCardData(data: DocumentData): data is CreditCardData {
  return (data as CreditCardData).credit_limit !== undefined;
}

export function isTaxFormData(data: DocumentData): data is TaxFormData {
  return (data as TaxFormData).tax_year !== undefined;
}

export function isIdentityDocumentData(data: DocumentData): data is IdentityDocumentData {
  return (data as IdentityDocumentData).document_number !== undefined &&
         (data as IdentityDocumentData).name !== undefined;
}

// Helper function to get document type from data
export function getDocumentTypeFromData(data: DocumentData): string {
  if (isInvoiceData(data)) return 'invoice';
  if (isReceiptData(data)) return 'receipt';
  if (isBankStatementData(data)) return 'bank_statement';
  if (isCreditCardData(data)) return 'credit_card_statement';
  if (isTaxFormData(data)) return 'tax_form';
  if (isIdentityDocumentData(data)) return 'identity_document';
  return 'other';
}

// Validation helper
export function validateDocumentData(data: unknown): data is DocumentData {
  return typeof data === 'object' && data !== null;
}