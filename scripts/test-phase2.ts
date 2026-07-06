import { validateAndSaveTempFile, cleanupTempFile } from '../app/security/file_handler';
import { analyzeUploadedFileAction } from '../app/actions/orchestrate';

async function runPhase2Tests() {
  console.log('=== STARTING PHASE 2 FILE SECURITY TESTS ===\n');
  let passedCount = 0;
  let totalTests = 0;

  function assertThrows(fn: () => void, expectedErrorMsg: string, testName: string) {
    totalTests++;
    try {
      fn();
      console.log(`[TEST FAIL] ${testName}: Expected exception but did not throw.`);
    } catch (error: any) {
      if (error.message.includes(expectedErrorMsg)) {
        console.log(`[TEST PASS] ${testName} (Threw expected error: "${error.message}")`);
        passedCount++;
      } else {
        console.log(`[TEST FAIL] ${testName}: Threw "${error.message}" but expected to contain "${expectedErrorMsg}"`);
      }
    }
  }

  function assertSuccess(fn: () => any, testName: string) {
    totalTests++;
    try {
      const res = fn();
      console.log(`[TEST PASS] ${testName}`);
      passedCount++;
      return res;
    } catch (error: any) {
      console.log(`[TEST FAIL] ${testName}: Threw unexpected error: "${error.message}"`);
    }
  }

  // Set up mock env
  process.env.MOCK_GEMINI = 'true';

  // 1. Valid PDF base64
  // PDF Magic Bytes: 25504446 (%PDF)
  const validPdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF').toString('base64');
  const pdfFile = assertSuccess(() => {
    return validateAndSaveTempFile(validPdfBase64, 'my_agreement.pdf', 'application/pdf');
  }, 'Valid PDF verification');
  if (pdfFile?.filePath) {
    cleanupTempFile(pdfFile.filePath);
  }

  // 2. Valid PNG base64
  // PNG Magic Bytes: 89504E47
  const validPngBase64 = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).toString('base64');
  const pngFile = assertSuccess(() => {
    return validateAndSaveTempFile(validPngBase64, 'screenshot.png', 'image/png');
  }, 'Valid PNG verification');
  if (pngFile?.filePath) {
    cleanupTempFile(pngFile.filePath);
  }

  // 3. EXE rejected (MIME spoofing attempt or executable code)
  // EXE Magic bytes: 4D 5A (MZ)
  const exeBase64 = Buffer.from([0x4D, 0x5A, 0x00, 0x00, 0x01, 0x02]).toString('base64');
  assertThrows(() => {
    validateAndSaveTempFile(exeBase64, 'game.exe', 'application/octet-stream');
  }, 'This file type is not supported', 'Executable (.exe) file rejection');

  // 4. Fake PDF (spoofed name but actually EXE)
  assertThrows(() => {
    validateAndSaveTempFile(exeBase64, 'virus.pdf', 'application/pdf');
  }, 'This file type is not supported', 'Spoofed extension (fake PDF) rejection');

  // 5. Oversized file rejected (> 20 MB)
  const largeBuffer = Buffer.alloc(21 * 1024 * 1024); // 21 MB
  const oversizedBase64 = largeBuffer.toString('base64');
  assertThrows(() => {
    validateAndSaveTempFile(oversizedBase64, 'huge.pdf', 'application/pdf');
  }, 'Maximum upload size is 20 MB', 'Oversized file rejection (> 20MB)');

  // 6. Path Traversal payload in filename
  assertThrows(() => {
    validateAndSaveTempFile(validPdfBase64, '../../etc/passwd', 'application/pdf');
  }, 'Dangerous filename detected', 'Path traversal filename rejection');

  // 7. Server Action Failure and Cleanup Verification
  console.log('\n--- Running Server Action Safe Fail Verification ---');
  totalTests++;
  const failResponse = await analyzeUploadedFileAction(exeBase64, 'exploit.exe', 'application/octet-stream');
  if ('error' in failResponse) {
    console.log(`[TEST PASS] Server Action handled failure safely: "${failResponse.error}"`);
    passedCount++;
  } else {
    console.log('[TEST FAIL] Server Action did not return error response for dangerous file upload.');
  }

  console.log(`\n=== FILE SECURITY SUMMARY: ${passedCount}/${totalTests} PASSED ===`);
  if (passedCount === totalTests) {
    console.log('✅ ALL FILE SECURITY TESTS PASSED SUCCESSFULLY.');
  } else {
    console.log('❌ SOME TESTS FAILED.');
    process.exit(1);
  }
}

runPhase2Tests().catch((err) => {
  console.error(err);
  process.exit(1);
});
