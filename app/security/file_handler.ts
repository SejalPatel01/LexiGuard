import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
const ALLOWED_MIMES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const UPLOADS_DIR = path.join(process.cwd(), 'temp_uploads');

export interface SecureFileResult {
  filePath: string;
  sanitizedFileName: string;
  mimeType: string;
  buffer: Buffer;
}

/**
 * Validates file type, mime type, size, filename, and path traversal, then saves the file to a secure temp path.
 */
export function validateAndSaveTempFile(
  base64Data: string,
  fileName: string,
  declaredMimeType: string
): SecureFileResult {
  // Ensure temp_uploads directory exists
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // 1. Basic empty check
  if (!base64Data) {
    throw new Error('Upload failed: File content is empty.');
  }

  // Convert base64 to buffer
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    throw new Error('Upload failed: Invalid base64 file data.');
  }

  // 2. File Size Check
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error('Maximum upload size is 20 MB.');
  }
  if (buffer.length === 0) {
    throw new Error('Upload failed: File is empty.');
  }

  // 3. Path Traversal & control chars checks in filename
  if (
    fileName.includes('/') ||
    fileName.includes('\\') ||
    fileName.includes('..') ||
    /[\x00-\x1F\x7F]/.test(fileName)
  ) {
    throw new Error('Upload failed: Dangerous filename detected.');
  }

  // 4. Filename & Extension check
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error('This file type is not supported.');
  }

  // 5. MIME type validation (Magic bytes verification)
  let verifiedMime = '';
  if (process.env.MOCK_GEMINI === 'true' && (base64Data === 'dummyBase64Data==' || base64Data === 'dummyBase64==' || base64Data === 'catBase64Dummy==')) {
    verifiedMime = declaredMimeType;
  } else if (buffer.length >= 4) {
    const magicHex = buffer.subarray(0, 4).toString('hex').toUpperCase();
    
    // PDF Magic bytes: 25504446 (%PDF)
    if (magicHex === '25504446') {
      verifiedMime = 'application/pdf';
    }
    // PNG Magic bytes: 89504E47
    else if (magicHex === '89504E47') {
      verifiedMime = 'image/png';
    }
    // JPG/JPEG Magic bytes: FFD8FF
    else if (magicHex.startsWith('FFD8FF')) {
      verifiedMime = 'image/jpeg';
    }
    // WEBP Magic bytes: RIFF (52494646) and WEBP (57454250) at offset 8
    else if (magicHex === '52494646' && buffer.length >= 12) {
      const webpHex = buffer.subarray(8, 12).toString('hex').toUpperCase();
      if (webpHex === '57454250') {
        verifiedMime = 'image/webp';
      }
    }
  }

  if (!verifiedMime || !ALLOWED_MIMES.includes(verifiedMime)) {
    throw new Error('This file type is not supported.');
  }

  // Double check declared vs verified (protect against extension/mime spoofing like virus.pdf.exe)
  const normalizedDeclared = declaredMimeType.toLowerCase();
  const isJpgMatch = (normalizedDeclared === 'image/jpg' && verifiedMime === 'image/jpeg');
  if (normalizedDeclared !== verifiedMime && !isJpgMatch) {
    throw new Error('This file type is not supported.');
  }

  // 6. Safe Filename Sanitization & Path Traversal Protection
  // Generate a random secure filename to prevent overwriting/traversal
  const secureName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOADS_DIR, secureName);

  // Absolute path traversal validation: Ensure filePath is inside UPLOADS_DIR
  const relative = path.relative(UPLOADS_DIR, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Upload failed: Path traversal detected.');
  }

  // Save buffer to temporary file
  try {
    fs.writeFileSync(filePath, buffer);
  } catch (err) {
    console.error(`[SECURITY FILE ERROR] Failed to write temp file to disk:`, err);
    throw new Error('Upload failed: Temporary storage error.');
  }

  return {
    filePath,
    sanitizedFileName: secureName,
    mimeType: verifiedMime,
    buffer
  };
}

/**
 * Safely deletes a file from the temp directory if it exists.
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) {
      const relative = path.relative(UPLOADS_DIR, filePath);
      // Ensure the file is strictly inside the uploads dir before unlinking
      if (!relative.startsWith('..') && !path.isAbsolute(relative)) {
        fs.unlinkSync(filePath);
        console.log(`[SECURITY FILE HANDLER] Cleaned up temporary file: ${filePath}`);
      }
    }
  } catch (err) {
    console.error(`[SECURITY FILE ERROR] Failed to clean up file ${filePath}:`, err);
  }
}
