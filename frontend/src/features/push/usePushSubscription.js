import { useEffect, useState } from 'react'
import { useLazyGetVapidPublicKeyQuery, useSubscribeToPushMutation } from '../../api/pushApi'
import { urlBase64ToUint8Array } from './vapid'

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export function usePushSubscription() {
  const [status, setStatus] = useState('checking') // checking | idle | subscribing | subscribed | denied | error
  const [fetchVapidKey] = useLazyGetVapidPublicKeyQuery()
  const [subscribeToPush] = useSubscribeToPushMutation()

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus('error')
      return
    }

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    let cancelled = false

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setStatus(subscription ? 'subscribed' : 'idle')
      })
      .catch(() => {
        if (!cancelled) setStatus('idle')
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function enable() {
    if (!isPushSupported()) {
      setStatus('error')
      return
    }

    setStatus('subscribing')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const { public_key: vapidPublicKey } = await fetchVapidKey().unwrap()

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const json = subscription.toJSON()
      await subscribeToPush({
        endpoint: json.endpoint,
        keys: json.keys,
      }).unwrap()

      setStatus('subscribed')
    } catch {
      setStatus('error')
    }
  }

  return { status, enable }
}
