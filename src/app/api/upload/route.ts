import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../lib/supaBaseClient'

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', async () => {
      const buffer = Buffer.concat(chunks)

      // Filename with timestamp to avoid collisions
      const fileName = `pdf-${Date.now()}.pdf`

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('pdfs') // 👈 your bucket name
        .upload(fileName, buffer, {
          contentType: 'application/pdf',
        })

      if (error) return res.status(500).json({ error: error.message })

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(fileName)

      res.status(200).json({
        message: 'Upload successful',
        fileUrl: publicUrlData.publicUrl,
      })
    })
  } catch (err) {
    res.status(500).json({ error: 'File upload failed' })
  }
}
