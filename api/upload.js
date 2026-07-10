// POST /api/upload — Vercel Blob client-upload handshake.
// The browser uploads directly to Blob; this endpoint issues the short-lived
// client token (auth-gated) and receives the upload-completed callback.
// Dormant until a Blob store is created (BLOB_READ_WRITE_TOKEN).
import { handleUpload } from '@vercel/blob/client'
import { getSession, authConfigured } from '../server/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => {
        // Only signed-in users may request an upload token (when auth is on).
        if (authConfigured() && !getSession(req)) throw new Error('Authentication required')
        return {
          allowedContentTypes: [
            'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/heic',
            'application/pdf', 'text/csv',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
          maximumSizeInBytes: 20 * 1024 * 1024, // 20 MB
          addRandomSuffix: true,
        }
      },
      onUploadCompleted: async () => { /* no-op; the URL is returned to the client */ },
    })
    return res.status(200).json(jsonResponse)
  } catch (err) {
    return res.status(400).json({ error: String(err.message || err) })
  }
}
