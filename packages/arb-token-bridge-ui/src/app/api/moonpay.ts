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

  const signature = moonPay.url.generateSignature(url)

  const isSignatureValid = moonPay.url.isSignatureValid(
    `${url}&signature=${signature}`
  )

  if (!isSignatureValid || !signature) {
    res.status(400).json({ message: 'Invalid signature' })
    return
  }

  res.status(200).json({ signature })
}
