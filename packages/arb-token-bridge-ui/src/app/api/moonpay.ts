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
  const { method } = req

  const url = req.body.url

  if (method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  if (!url) {
    res.status(400).json({ message: 'URL is required' })
    return
  }

  if (typeof url !== 'string') {
    res.status(400).json({ message: 'URL must be a string' })
    return
  }

  const signedUrl = moonPay.url.generateSignature(url, { returnFullUrl: true })

  console.log('url:', url)
  console.log('Generated signedUrl:', signedUrl)

  if (!signedUrl) {
    res.status(400).json({ message: 'Signature is null' })
    return
  }

  const isSignatureValid = moonPay.url.isSignatureValid(signedUrl)

  if (!isSignatureValid) {
    res.status(400).json({ message: 'Invalid signature' })
    return
  }

  const signatureFromSignedUrl = signedUrl.split('signature=')[1]

  if (!signatureFromSignedUrl) {
    res.status(400).json({ message: 'Signature is undefined' })
    return
  }

  const signature = decodeURIComponent(signatureFromSignedUrl)

  res.status(200).json({ signature })
}
