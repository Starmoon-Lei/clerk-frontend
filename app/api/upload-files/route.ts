/**
 * Simplified File Upload & Processing Route - 10-Year Engineer Approach
 * Philosophy: "For 100 docs/day, simple beats complex"
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from "../../../auth";
import { processFiles } from "../../../lib/services/documentService";
import { checkRateLimit, RATE_LIMITS, getRateLimitIdentifier } from "../../../lib/services/rateLimitService";
import { getApiTimeoutSeconds } from "../../../lib/config/timeouts";
import { validateSessionDuringOperation } from "../../../lib/services/sessionService";

export const maxDuration = getApiTimeoutSeconds('UPLOAD');

export async function POST(request: NextRequest) {
  const requestId = `upload_${Date.now()}`;
  const startTime = Date.now();

  try {
    /* ------ Authentication Validation ------ */
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized. Please sign in to upload files.'
      }, { status: 401 });
    }
    /* ------ Authentication Validation ------ */

    /* --------- Session Validation ---------- */
    const { valid: sessionValid, session: refreshedSession } = await validateSessionDuringOperation(
      session,
      'file upload processing'
    );

    if (!sessionValid || !refreshedSession) {
      return NextResponse.json({
        success: false,
        error: 'Session expired. Please sign in again.'
      }, { status: 401 });
    }

    // Additional safety check for user ID
    if (!refreshedSession.user?.id) {
      console.error('🔒 Critical: Session exists but user ID is missing - data isolation breach risk');
      return NextResponse.json({
        success: false,
        error: 'Authentication error: User session is incomplete. Please sign in again.'
      }, { status: 401 });
    }
    /* --------- Session Validation ---------- */

    /* ------------ Rate Limiting ------------ */
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
    /* ------------ Rate Limiting ------------ */

    /* ---------- Input Validation ----------- */
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    console.log(`📁 Processing ${files.length} files for user ${session.user.id} (${requestId})`);

    // 3. Basic file size check (no complex validation for business docs)
    for (const file of files) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        return NextResponse.json({
          success: false,
          error: `File ${file.name} too large (${Math.round(file.size / 1024 / 1024)}MB > 50MB)`,
          requestId
        }, { status: 400 });
      }
    }
    /* ---------- Input Validation ----------- */

    /* ----------- Type Processing ----------- */
    const results = await processFiles(files);

    const totalTime = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    console.log(`🎯 Batch complete: ${successful}/${results.length} successful in ${totalTime}ms`);
    /* ----------- Type Processing ----------- */

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