import { NextRequest, NextResponse } from 'next/server';

const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '0mb',
    },
  },
};

export async function POST(request: NextRequest) {
  if (!VIMEO_ACCESS_TOKEN) {
    return NextResponse.json(
      { error: 'Vimeo credentials are missing' },
      { status: 500 },
    );
  }

  const fileBuffer = await request.arrayBuffer();
  if (!fileBuffer || fileBuffer.byteLength === 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const fileName = request.headers.get('x-file-name')
    ? decodeURIComponent(request.headers.get('x-file-name')!
      .slice(0, 255))
    : 'video-upload';
  const contentTypeHeader = request.headers.get('content-type');
  const contentType = contentTypeHeader || 'application/octet-stream';

  try {
    const createResponse = await fetch('https://api.vimeo.com/me/videos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VIMEO_ACCESS_TOKEN}`,
        Accept: 'application/vnd.vimeo.*+json;version=3.4',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: fileName,
        privacy: {
          view: 'unlisted',
          embed: 'public',
        },
        upload: {
          approach: 'tus',
          size: fileBuffer.byteLength,
        },
      }),
    });

    if (!createResponse.ok) {
      const errorBody = await createResponse.text();
      console.error('Vimeo create upload failed:', errorBody);
      return NextResponse.json(
        { error: 'Failed to upload video to Vimeo' },
        { status: createResponse.status },
      );
    }

    const createData = await createResponse.json();
    const uploadLink = createData?.upload?.upload_link as string | undefined;
    const uri = createData?.uri as string | undefined;

    if (!uploadLink || !uri) {
      console.error('Vimeo response missing upload link or uri:', createData);
      return NextResponse.json(
        { error: 'Vimeo upload link missing' },
        { status: 502 },
      );
    }

    const tusResponse = await fetch(uploadLink, {
      method: 'PATCH',
      headers: {
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': '0',
        'Content-Type': 'application/offset+octet-stream',
        'Content-Length': String(fileBuffer.byteLength),
      },
      body: Buffer.from(fileBuffer),
    });

    if (!tusResponse.ok) {
      const errorBody = await tusResponse.text();
      console.error('Vimeo TUS upload failed:', errorBody);
      return NextResponse.json(
        { error: 'Failed to upload video to Vimeo' },
        { status: tusResponse.status },
      );
    }

    const data = {
      uri,
      link: typeof createData?.link === 'string' ? createData.link : undefined,
      player_embed_url:
        typeof createData?.player_embed_url === 'string'
          ? createData.player_embed_url
          : undefined,
    };
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error during Vimeo upload:', error);
    return NextResponse.json(
      { error: 'Unexpected error during Vimeo upload' },
      { status: 500 },
    );
  }
}
