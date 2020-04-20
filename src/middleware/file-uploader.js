import parse from 'co-busboy';

export default async function fileUploader(ctx, next) {
  if (ctx.method !== 'POST') {
    return next();
  }
  const parts = parse(ctx);
  const files = [];

  let part;
  // eslint-disable-next-line no-cond-assign
  while (part = await parts()) {
    if (!part.length) {
      files.push(await fromStream(part, part.filename, part.mimeType));
    }
  }
  ctx.files = files;
  return next();

  function fromStream(fileStream, filename, mimeType = 'application/octet-stream') {
    return new Promise((resolve, reject) => {
      let chunks = [];
      chunks.filename = filename;
      chunks.mimeType = mimeType;

      fileStream.on('error', reject);
      fileStream
        .on('data', function (chunk) {
          chunks.push(chunk);
        })
        .on('end', function () {
          resolve(chunks);
        });
    });
  }
}
