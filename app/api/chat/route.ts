import { auth } from "../../../auth";
import { NextResponse } from "next/server";
import { businessChat } from "../../../lib/services/documentService";
import { handleApiRouteError } from "../../../lib/error/simple-error-handler";
import { Session } from "next-auth";
import { chatRequestSchema, toolApprovalSchema } from "../../../lib/validation/schemas";
import { z } from 'zod';
import { checkRateLimit, RATE_LIMITS, getRateLimitIdentifier } from "../../../lib/services/rateLimitService";
import { getApiTimeoutSeconds } from "../../../lib/config/timeouts";
import { validateSessionDuringOperation } from "../../../lib/services/sessionService";

export const maxDuration = getApiTimeoutSeconds('CHAT');

export async function POST(req: Request) {
  let session: Session | null = null;

  try {
    /* ------ Authentication Validation ------ */
    session = await auth();

    if (!session?.user?.id) {
      console.warn('Unauthorized chat request');
      return NextResponse.json({
        error: 'Unauthorized. Please sign in to access this resource.'
      }, { status: 401 });
    }
    /* ------ Authentication Validation ------ */

    /* --------- Session Validation ---------- */
    const { valid: sessionValid, session: refreshedSession } = await validateSessionDuringOperation(
      session,
      'chat message processing'
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
    const identifier = getRateLimitIdentifier(req, session.user.id);
    const rateLimit = checkRateLimit(identifier, RATE_LIMITS.CHAT.limit, RATE_LIMITS.CHAT.windowMs);

    if (!rateLimit.allowed) {
      console.warn(`Chat rate limit exceeded for ${identifier}`);
      return NextResponse.json({
        success: false,
        error: `Rate limit exceeded. You can send ${RATE_LIMITS.CHAT.limit} messages per minute. Please wait ${rateLimit.retryAfter} seconds.`,
        retryAfter: rateLimit.retryAfter
      }, { status: 429 });
    }
    /* ------------ Rate Limiting ------------ */

    /* ---------- Input Validation ----------- */
    const body = await req.json();

    let messages;
    try {
      const validated = chatRequestSchema.parse(body);
      ({ messages } = validated);
      console.log("Validated messages:", messages);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.warn('Invalid chat request:', error.errors);
        return NextResponse.json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        }, { status: 400 });
      }
      throw error;
    }
    /* ---------- Input Validation ----------- */

    /* ------------ Message Handle ----------- */
    const chatMessages = messages.map((msg: { role: string; content: string | unknown[] }) => ({
      role: msg.role,
      content: Array.isArray(msg.content)
        ? msg.content.join(' ')
        : String(msg.content || (msg as { text?: string }).text || '')
    }));

    const result = await businessChat(chatMessages);
    /* ------------ Message Handle ----------- */

    return NextResponse.json({ content: result.content });

  } catch (error) {
    console.error('Chat API Error:', error);
    return handleApiRouteError(error, '/api/chat', session?.user?.id, `chat_${Date.now()}`);
  }
}

// export async function PUT(req: Request) {
//   let session: Session | null = null;

//   try {
//     session = await auth();

//     if (!session?.user?.id) {
//       console.warn('Unauthorized tool approval request');
//       return new Response(
//         JSON.stringify({
//           success: false,
//           error: 'Unauthorized. Please sign in to access this resource.'
//         }),
//         {
//           status: 401,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }

//     // Validate input with Zod schemas
//     const body = await req.json();

//     let approved, responseId, toolCallId;
//     try {
//       const validated = toolApprovalSchema.parse(body);
//       ({ approved, responseId, toolCallId } = validated);
//     } catch (error) {
//       if (error instanceof z.ZodError) {
//         console.warn('Invalid tool approval request:', error.errors);
//         return new Response(
//           JSON.stringify({
//             success: false,
//             error: 'Invalid tool approval data',
//             details: error.errors
//           }),
//           {
//             status: 400,
//             headers: { 'Content-Type': 'application/json' }
//           }
//         );
//       }
//       throw error;
//     }

//     // HONEST IMPLEMENTATION: Tool approval feature not yet available
//     console.log(`🔧 Tool approval request from user ${session.user.id}:`, {
//       approved,
//       responseId,
//       toolCallId,
//       timestamp: new Date().toISOString()
//     });

//     // Return proper not-implemented response instead of fake success
//     return new Response(
//       JSON.stringify({
//         success: false,
//         error: 'Tool approval feature not yet implemented',
//         message: 'This feature is planned but not currently available. Your request has been logged.',
//         requestId: `approval_${Date.now()}`,
//         details: {
//           approved,
//           responseId,
//           toolCallId
//         }
//       }),
//       {
//         status: 501, // Not Implemented
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   } catch (error) {
//     console.error('Tool approval error:', error);
//     return new Response(
//       JSON.stringify({
//         error: error instanceof Error ? error.message : 'Unknown error'
//       }),
//       {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   }
// }