import { UAParser } from 'ua-parser-js'

export const PLATFORMS = ['desktop', 'android', 'ios']

// ua-parser-js reports mobile variants with distinct names (e.g. "Mobile Chrome",
// "Mobile Safari", "Opera Touch"/"Opera Mini") - normalize them to our internal keys.
const BROWSER_NAME_PATTERNS = [
  [/edge/i, 'edge'],
  [/brave/i, 'brave'],
  [/samsung internet/i, 'samsung'],
  [/ladybird/i, 'ladybird'],
  [/opera/i, 'opera'],
  [/firefox/i, 'firefox'],
  [/chrome/i, 'chrome'],
  [/safari/i, 'safari'],
]

export function detectPlatform() {
  const { os, device } = new UAParser().getResult()
  // iPadOS 13+ identifies itself as "Mac OS" but ua-parser-js still flags the device as an iPad.
  if (os.name === 'iOS' || device.model === 'iPad') return 'ios'
  if (os.name === 'Android') return 'android'
  return 'desktop'
}

export function detectBrowser() {
  const { browser } = new UAParser().getResult()
  const match = BROWSER_NAME_PATTERNS.find(([pattern]) => pattern.test(browser.name ?? ''))
  return match ? match[1] : 'chrome'
}
