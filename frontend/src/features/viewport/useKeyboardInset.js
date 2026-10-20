import { useEffect, useState } from 'react'

// Below this the visual viewport shrank because of browser chrome (e.g. a collapsing URL
// bar), not because an on-screen keyboard opened.
const KEYBOARD_THRESHOLD_PX = 100

// Tracks how much of the layout viewport the on-screen keyboard covers and exposes it as
// `--keyboard-inset` (plus a `keyboard-open` class) on <html>, so fixed elements can sit
// above the keyboard. Mobile browsers keep the layout viewport full-height while the
// keyboard is open - only the visual viewport reveals how much is hidden.
export default function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return undefined
    const root = document.documentElement

    function update() {
      const covered = Math.round(window.innerHeight - viewport.height - viewport.offsetTop)
      const next = covered > KEYBOARD_THRESHOLD_PX ? covered : 0
      root.style.setProperty('--keyboard-inset', `${next}px`)
      root.classList.toggle('keyboard-open', next > 0)
      setInset(next)
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      root.style.removeProperty('--keyboard-inset')
      root.classList.remove('keyboard-open')
    }
  }, [])

  return inset
}
