import { useState } from 'react'
import { useLazyGetVapidPublicKeyQuery, useSubscribeToPushMutation } from '../../api/pushApi'
import { urlBase64ToUint8Array } from './vapid'

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export function usePushSubscription() {
  const [status, setStatus] = useState('idle') // idle | subscribing | subscribed | denied | error
  const [fetchVapidKey] = useLazyGetVapidPublicKeyQuery()
  const [subscribeToPush] = useSubscribeToPushMutation()

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
