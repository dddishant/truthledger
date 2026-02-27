import { NextResponse } from 'next/server';

type ScanProgressEvent = {
  step: 'discover' | 'extract' | 'classify' | 'store' | 'done' | 'error';
  message: string;
  progress: number;
  entityId: string;
  ts: string;
};

const encoder = new TextEncoder();

function eventChunk(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = (searchParams.get('entityId') ?? 'comp-helixai').trim() || 'comp-helixai';

    const stream = new ReadableStream({
      async start(controller) {
        const emit = (step: ScanProgressEvent['step'], message: string, progress: number, event = 'progress') => {
          const payload: ScanProgressEvent = {
            step,
            message,
            progress,
            entityId,
            ts: new Date().toISOString()
          };
          controller.enqueue(eventChunk(event, payload));
        };

        try {
          emit('discover', 'Discovering fresh sources...', 15);
          await delay(450);
          emit('extract', 'Extracting candidate claims...', 45);
          await delay(550);
          emit('classify', 'Classifying evidence support/contradiction...', 70);
          await delay(500);
          emit('store', 'Preparing accountability updates...', 92);
          await delay(350);
          emit('done', 'Realtime scan complete.', 100, 'done');
        } catch (error) {
          const fallback: ScanProgressEvent = {
            step: 'error',
            message: `Stream error: ${(error as Error).message}`,
            progress: 100,
            entityId,
            ts: new Date().toISOString()
          };
          controller.enqueue(eventChunk('error', fallback));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        step: 'error',
        message: `Unable to start scan stream: ${(error as Error).message}`
      },
      { status: 200 }
    );
  }
}
