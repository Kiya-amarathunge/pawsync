import crypto from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

export function validateUpload(
  value: FormDataEntryValue | null,
  allowedTypes: string[],
  maxSizeMb: number,
) {
  if (!(value instanceof File)) return 'A verification document is required';
  if (!allowedTypes.includes(value.type)) return 'Unsupported file type';
  if (value.size > maxSizeMb * 1024 * 1024) return `File must be no larger than ${maxSizeMb}MB`;
  return null;
}

export async function saveProviderCredential(file: File) {
  const extension = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, '');
  const storageKey = `${crypto.randomUUID()}${extension}`;
  const directory = path.join(process.cwd(), 'storage', 'provider-credentials');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, storageKey), Buffer.from(await file.arrayBuffer()));
  return { storageKey, originalName: file.name };
}

export function providerCredentialPath(storageKey: string) {
  return path.join(process.cwd(), 'storage', 'provider-credentials', storageKey);
}
