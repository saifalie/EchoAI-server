
export function bufferToBase64(file) {
    const mime = file.mimetype;
    const b64  = file.buffer.toString('base64');
    return `data:${mime};base64,${b64}`;
  }