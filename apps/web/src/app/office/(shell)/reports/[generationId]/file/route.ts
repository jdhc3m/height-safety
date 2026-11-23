import {
  getDraftReportFile,
  OfficeApiFailure,
  openOfficeSession,
} from '../../../../../../lib/office-api';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ generationId: string }> },
): Promise<Response> {
  const { generationId } = await params;
  if (!generationId || generationId.length > 128) {
    return new Response('Draft report unavailable.', {
      status: 404,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  }

  try {
    const upstream = await getDraftReportFile(
      await openOfficeSession(),
      generationId,
    );
    const filenameId = generationId
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 128);

    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="prototype-draft-report-${filenameId}.pdf"`,
        'Content-Type': 'application/pdf',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const status =
      error instanceof OfficeApiFailure &&
      error.status !== undefined &&
      error.status >= 400 &&
      error.status <= 599
        ? error.status
        : 503;

    return new Response('Draft report unavailable.', {
      status,
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }
}
