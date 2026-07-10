import { upload } from '@vercel/blob/client'

// Upload a file straight to Vercel Blob via the /api/upload handshake.
// Returns lightweight metadata (only the URL is stored on the record).
export async function uploadFile(file) {
  const blob = await upload(file.name, file, { access: 'public', handleUploadUrl: '/api/upload' })
  return { name: file.name, type: file.type || '', size: file.size, url: blob.url }
}
