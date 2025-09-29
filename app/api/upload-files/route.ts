/**
 * Simplified File Upload & Processing Route - 10-Year Engineer Approach
 * Philosophy: "For 100 docs/day, simple beats complex"
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../auth";
import { createSimpleProcessor } from "../../../lib/processing/actually-simple-processor";
import { checkRateLimit, RATE_LIMITS, getRateLimitIdentifier } from "../../../lib/simple-rate-limit";
import { validateSessionDuringOperation } from "../../../lib/session/session-refresh";
import { processFilesWithLimits } from "../../../lib/processing/simple-concurrent";
import { env } from "../../../lib/config/env";
import { getApiTimeoutSeconds } from "../../../lib/config/timeouts";
import { validateFilesSecurely } from "../../../lib/security/file-validator";

export const maxDuration = getApiTimeoutSeconds('UPLOAD');

export async function POST(request: NextRequest) {
  const requestId = `upload_${Date.now()}`;
  const startTime = Date.now();

  try {
    // 1. Authentication (keep this - essential)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Please sign in to upload files.'
      }, { status: 401 });
    }

    // Simple rate limiting
    const identifier = getRateLimitIdentifier(request, session.user.id);
    const rateLimit = checkRateLimit(identifier, RATE_LIMITS.UPLOAD.limit, RATE_LIMITS.UPLOAD.windowMs);

    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for ${identifier}`);
      return NextResponse.json({
        success: false,
        error: `Rate limit exceeded. You can upload ${RATE_LIMITS.UPLOAD.limit} batches per minute. Please wait ${rateLimit.retryAfter} seconds.`,
        retryAfter: rateLimit.retryAfter
      }, { status: 429 });
    }

    // 2. Get files from form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`📁 Processing ${files.length} files for user ${session.user.id} (${requestId})`);

    // 3. Secure file validation (Fix 6: Path traversal prevention)
    const validation = validateFilesSecurely(files);
    if (!validation.isValid) {
      const allErrors = validation.results
        .filter(r => !r.isValid)
        .flatMap(r => r.errors);

      return NextResponse.json({
        success: false,
        error: 'File validation failed',
        details: allErrors,
        requestId
      }, { status: 400 });
    }

    // Log security warnings if any
    if (validation.summary.warnings > 0) {
      console.warn(`⚠️ File validation warnings for ${requestId}:`, validation.summary);
    }

    // 4. Validate session before starting processing (Fix 6: Session refresh)
    const { valid: sessionValid, session: refreshedSession } = await validateSessionDuringOperation(
      session,
      'file upload processing'
    );

    if (!sessionValid || !refreshedSession) {
      return NextResponse.json({
        success: false,
        error: 'Session expired during processing. Please sign in again.',
        requestId
      }, { status: 401 });
    }

    // 5. Process files with actually simple processor
    const processor = createSimpleProcessor();
    const maxConcurrency = Math.min(env.maxConcurrentFiles, files.length); // Environment-based limit

    const results = await processFilesWithLimits(
      files,
      async (file: File, index: number) => {
        try {
          // Validate session for every 3rd file in large batches to prevent session expiry
          if (files.length > 3 && index > 0 && index % 3 === 0) {
            const { valid } = await validateSessionDuringOperation(
              refreshedSession,
              `file processing (${index + 1}/${files.length})`
            );

            if (!valid) {
              throw new Error('Session expired during batch processing');
            }
          }

          // Direct processing - no job create/update dance
          const result = await processor.processDocument(file);

          // SECURITY FIX: Remove openaiFileId from client response to prevent file access leaks
          return {
            fileName: file.name,
            fileSize: file.size,
            success: result.success,
            documentType: result.documentType,
            confidence: result.confidence,
            extractedData: result.extractedData,
            processingTimeMs: result.processingTimeMs,
            error: result.error
            // openaiFileId intentionally removed for security
          };
        } catch (error) {
          console.error(`❌ Failed to process ${file.name}:`, error);
          return {
            fileName: file.name,
            fileSize: file.size,
            success: false,
            documentType: 'other',
            confidence: 0,
            extractedData: {},
            processingTimeMs: 0, // Failed before timing could be measured
            error: error instanceof Error ? error.message : 'Processing failed'
            // openaiFileId intentionally omitted for security
          };
        }
      },
      maxConcurrency,
      (completed, total) => {
        // Progress callback for monitoring
        console.log(`📊 Processing progress: ${completed}/${total} files completed`);
      }
    );

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;

    console.log(`🎯 Batch complete: ${successful}/${results.length} successful in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalFiles: files.length,
        successful,
        failed: files.length - successful,
        processingTimeMs: totalTime
      },
      requestId
    });

  } catch (error) {
    console.error(`❌ Upload request ${requestId} failed:`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
      requestId
    }, { status: 500 });
  }
}

// OLD validateFiles function removed - replaced with secure validateFilesSecurely
// to prevent path traversal vulnerabilities (Fix 6)