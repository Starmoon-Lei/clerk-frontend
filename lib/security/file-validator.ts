/**
 * Secure file validation and sanitization
 * Prevents path traversal and other file-based attacks
 */

interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedName?: string;
}

/**
 * Validate file for security issues
 */
export function validateFileSecurely(file: File): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic file checks
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors, warnings };
  }

  if (file.size === 0) {
    errors.push(`File is empty: ${file.name}`);
  }

  // Size limit (40MB)
  const maxSize = 40 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(`File too large: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB). Max 40MB.`);
  }

  // Filename security validation
  const filenameValidation = validateFilename(file.name);
  if (!filenameValidation.isValid) {
    errors.push(...filenameValidation.errors);
  }
  if (filenameValidation.warnings.length > 0) {
    warnings.push(...filenameValidation.warnings);
  }

  // File type validation
  const typeValidation = validateFileType(file);
  if (!typeValidation.isValid) {
    errors.push(...typeValidation.errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedName: filenameValidation.sanitizedName
  };
}

/**
 * Validate filename for security issues
 */
function validateFilename(filename: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedName: string;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!filename || typeof filename !== 'string') {
    errors.push('Invalid filename');
    return { isValid: false, errors, warnings, sanitizedName: 'invalid' };
  }

  // Length check
  if (filename.length > 255) {
    errors.push(`Filename too long: ${filename} (max 255 characters)`);
  }

  // Path traversal detection
  const pathTraversalPatterns = [
    /\.\./,           // Parent directory
    /\/\.\./,         // Unix path traversal
    /\\\.\./,         // Windows path traversal
    /\.\.\\/,         // Windows path traversal
    /\.\.\//,         // Unix path traversal
    /^\./,            // Hidden files
    /\/$/,            // Ends with slash
    /\\$/,            // Ends with backslash
    /^\/+/,           // Starts with slashes
    /^\\+/,           // Starts with backslashes
  ];

  for (const pattern of pathTraversalPatterns) {
    if (pattern.test(filename)) {
      errors.push(`Potentially malicious filename pattern detected: ${filename}`);
      logSecurityEvent('path_traversal_attempt', { filename });
      break;
    }
  }

  // Reserved names (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  const nameWithoutExt = filename.split('.')[0].toUpperCase();
  if (reservedNames.includes(nameWithoutExt)) {
    errors.push(`Reserved filename not allowed: ${filename}`);
  }

  // Character validation - NO DOTS allowed to prevent path traversal
  const safeCharPattern = /^[a-zA-Z0-9\s_-]+\.[a-zA-Z0-9]+$/;
  if (!safeCharPattern.test(filename)) {
    errors.push(`Invalid characters in filename: ${filename}. Only letters, numbers, spaces, underscores, hyphens, and a single extension dot allowed.`);
  }

  // Multiple extensions check
  const dotCount = (filename.match(/\./g) || []).length;
  if (dotCount > 1) {
    warnings.push(`Multiple dots in filename: ${filename}`);
  }

  // Suspicious extensions
  const suspiciousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.jsp', '.sh', '.ps1', '.py', '.rb'
  ];

  const extension = filename.toLowerCase().split('.').pop();
  if (extension && suspiciousExtensions.includes(`.${extension}`)) {
    errors.push(`Potentially dangerous file extension: .${extension}`);
  }

  // Create sanitized version
  const sanitizedName = sanitizeFilename(filename);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedName
  };
}

/**
 * Sanitize filename to make it safe
 */
function sanitizeFilename(filename: string): string {
  if (!filename) return 'unnamed';

  // Remove path components and dangerous characters
  let sanitized = filename
    .replace(/[\\\/]/g, '') // Remove path separators
    .replace(/\.\./g, '')   // Remove parent directory references
    .replace(/[<>:"|?*]/g, '') // Remove dangerous characters
    .replace(/\s+/g, '_')   // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Collapse multiple underscores
    .replace(/^[._-]+/, '') // Remove leading dots/underscores/hyphens
    .replace(/[._-]+$/, ''); // Remove trailing dots/underscores/hyphens

  // Ensure single extension
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    // Keep only first part and last extension
    sanitized = `${parts[0]}.${parts[parts.length - 1]}`;
  }

  // Ensure reasonable length
  if (sanitized.length > 100) {
    const extension = sanitized.split('.').pop();
    const nameOnly = sanitized.split('.')[0];
    sanitized = `${nameOnly.substring(0, 90)}.${extension}`;
  }

  // Fallback if sanitization removed everything
  if (!sanitized || sanitized === '.') {
    sanitized = `file_${Date.now()}.txt`;
  }

  return sanitized;
}

/**
 * Validate file type for security
 */
function validateFileType(file: File): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Allowed MIME types
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/tiff',
    'image/bmp'
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`Unsupported file format: ${file.type}. Supported: PDF, JPEG, PNG, TIFF, BMP`);
  }

  // Check for MIME type spoofing (basic check)
  const extension = file.name.toLowerCase().split('.').pop();
  const expectedMimeTypes: Record<string, string[]> = {
    'pdf': ['application/pdf'],
    'jpg': ['image/jpeg', 'image/jpg'],
    'jpeg': ['image/jpeg', 'image/jpg'],
    'png': ['image/png'],
    'tiff': ['image/tiff'],
    'tif': ['image/tiff'],
    'bmp': ['image/bmp']
  };

  if (extension && expectedMimeTypes[extension]) {
    if (!expectedMimeTypes[extension].includes(file.type)) {
      errors.push(`File extension .${extension} doesn't match MIME type ${file.type}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Batch validate multiple files
 */
export function validateFilesSecurely(files: File[]): {
  isValid: boolean;
  results: FileValidationResult[];
  summary: { total: number; valid: number; invalid: number; warnings: number };
} {
  if (!files || files.length === 0) {
    throw new Error('No files provided');
  }

  if (files.length > 10) {
    throw new Error('Maximum 10 files allowed per upload batch');
  }

  const results = files.map(file => validateFileSecurely(file));

  const summary = {
    total: files.length,
    valid: results.filter(r => r.isValid).length,
    invalid: results.filter(r => !r.isValid).length,
    warnings: results.reduce((acc, r) => acc + r.warnings.length, 0)
  };

  const isValid = results.every(r => r.isValid);

  // Log security summary
  if (summary.invalid > 0 || summary.warnings > 0) {
    console.warn('🚨 File validation security summary:', summary);
  }

  return { isValid, results, summary };
}

/**
 * Log security events
 */
function logSecurityEvent(
  event: 'path_traversal_attempt' | 'suspicious_extension' | 'mime_spoofing',
  details: { filename?: string; extension?: string; mimeType?: string }
): void {
  console.warn('🚨 File Security Event:', {
    event,
    timestamp: new Date().toISOString(),
    filename: details.filename ? 'REDACTED' : undefined,
    extension: details.extension,
    mimeType: details.mimeType
  });
}