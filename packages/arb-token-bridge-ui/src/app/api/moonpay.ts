import { MoonPay } from '@moonpay/moonpay-node'
import { NextApiRequest, NextApiResponse } from 'next/types'

const moonPayApiKey = process.env.MOONPAY_SK

if (typeof moonPayApiKey === 'undefined') {
  throw new Error('MOONPAY_SK variable missing.')
}
const moonPay = new MoonPay(moonPayApiKey)

export default async function handler(
  req: NextApiRequest & { query: { chainId: string } },
  res: NextApiResponse<{ signature: string } | { message: string }>
) {
  try {
    const { method } = req

    if (method !== 'POST') {
      res.status(405).json({ message: 'Method not allowed' })
      return
    }

    if (!req.body) {
      res.status(400).json({ message: 'Request body is required' })
      return
    }

    const url = req.body.url

    if (!url) {
      res.status(400).json({ message: 'URL is required' })
      return
    }

    if (typeof url !== 'string') {
      res.status(400).json({ message: 'URL must be a string' })
      return
    }

    if (url.length > 2000) {
      res.status(400).json({ message: 'URL is too long' })
      return
    }

    try {
      new URL(url)
    } catch {
      res.status(400).json({ message: 'Invalid URL format' })
      return
    }

    const signedUrl = moonPay.url.generateSignature(url, { returnFullUrl: true })

    if (!signedUrl) {
      res.status(500).json({ message: 'Failed to generate signature' })
      return
    }

    const isSignatureValid = moonPay.url.isSignatureValid(signedUrl)

    if (!isSignatureValid) {
      res.status(500).json({ message: 'Generated signature is invalid' })
      return
    }

    const signatureFromSignedUrl = signedUrl.split('signature=')[1]

    if (!signatureFromSignedUrl) {
      res.status(500).json({ message: 'Failed to extract signature from URL' })
      return
    }

    const signature = decodeURIComponent(signatureFromSignedUrl)

    if (!signature) {
      res.status(500).json({ message: 'Failed to decode signature' })
      return
    }

    res.status(200).json({ signature })
  } catch (error) {
    console.error('MoonPay API error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
