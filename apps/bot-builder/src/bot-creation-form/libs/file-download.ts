import JSZip from 'jszip';
import { hashBase64, stringToIPFSHash } from './utils';

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function generateZipFile(jsonData: object, images: string[]): Promise<Blob> {
  const zip = new JSZip();
  const _jsonString = JSON.stringify(jsonData, null, 2);
  const jsonName = await stringToIPFSHash(_jsonString);

  zip.file(jsonName, _jsonString, { comment: 'Card' });

  const imagesFolder = zip.folder('images');
  await Promise.all(images.map(async (imageBase64) => {
    const imageBase64Content = imageBase64.split(',')[1];
    const imageHash = await hashBase64(imageBase64Content);
    imagesFolder?.file(`${imageHash}`, imageBase64Content, { base64: true });
  }));

  // Generate the zip file as a Blob
  return await zip.generateAsync({ type: 'blob' });
}