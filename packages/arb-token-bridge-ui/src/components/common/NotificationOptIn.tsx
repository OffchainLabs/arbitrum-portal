'use client'

import { useState, useEffect } from 'react'
import { Button } from './Button'

export const NotificationOptIn = () => {
  const [permission, setPermission] =
    useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  const handleRequestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      setPermission(perm)
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null
  }

  if (permission === 'granted') {
    return (
      <p className="text-sm text-green-400">
        Browser notifications are enabled for transaction updates.
      </p>
    )
  }

  if (permission === 'denied') {
    return (
      <p className="text-sm text-orange-400">
        Browser notifications are blocked. Please enable them in your browser
        settings to receive transaction updates.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-white/70">
        Enable browser notifications to get updates when your transactions are
        completed.
      </p>
      <Button variant="secondary" onClick={handleRequestPermission}>
        Enable Notifications
      </Button>
    </div>
  )
}
