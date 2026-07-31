import { useState } from 'react'
import { Link } from 'react-router'
import { PLATFORMS, detectBrowser, detectPlatform } from '../utils/pwaEnvironment'
import './HowToInstallPage.css'

const PLATFORM_LABELS = {
  desktop: 'Desktop',
  android: 'Android',
  ios: 'iOS (iPhone / iPad)',
}

const BROWSER_LABELS = {
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
  brave: 'Brave',
  firefox: 'Mozilla Firefox',
  opera: 'Opera',
  safari: 'Safari',
  samsung: 'Samsung Internet',
  ladybird: 'Ladybird',
}

const BROWSERS_BY_PLATFORM = {
  desktop: ['chrome', 'edge', 'brave', 'firefox', 'opera', 'safari', 'ladybird'],
  android: ['chrome', 'edge', 'brave', 'firefox', 'opera', 'samsung'],
  ios: ['safari', 'chrome', 'edge', 'brave', 'firefox', 'opera'],
}

const GUIDES = {
  'desktop:chrome': {
    supported: true,
    steps: [
      'Open the app in Chrome.',
      'Click the install icon (a monitor with a down arrow) at the right edge of the address bar. If you don’t see it, open the ⋮ menu instead.',
      'Select "Install Split Even Wiser…" and confirm with "Install".',
      'The app opens in its own window, and a shortcut is added to your desktop / Start menu.',
    ],
  },
  'desktop:edge': {
    supported: true,
    steps: [
      'Open the app in Edge.',
      'Click the install icon (a ⊕) in the address bar, or open the ••• menu.',
      'Choose "Apps" → "Install this site as an app".',
      'Confirm with "Install" - Edge adds it to your Start menu and taskbar and opens it in its own window.',
    ],
  },
  'desktop:brave': {
    supported: true,
    steps: [
      'Open the app in Brave.',
      'Click the install icon in the address bar, or open the ☰ menu.',
      'Select "Install Split Even Wiser…" and confirm.',
      'Brave opens the app in its own window and adds a desktop shortcut.',
    ],
  },
  'desktop:firefox': {
    supported: false,
    note: 'Firefox for desktop removed built-in support for installing web apps as standalone windows.',
    alternatives: ['chrome', 'edge', 'brave', 'opera'],
  },
  'desktop:opera': {
    supported: true,
    steps: [
      'Open the app in Opera.',
      'Click the install icon in the address bar, or open the Opera menu.',
      'Choose "Install Split Even Wiser…" and confirm.',
      'Opera adds a shortcut to your desktop and taskbar.',
    ],
  },
  'desktop:safari': {
    supported: true,
    note: 'Requires macOS 14 (Sonoma) or later. On older macOS versions, use Chrome, Edge, Brave, or Opera instead.',
    steps: [
      'Open the app in Safari.',
      'Click the Share icon in the toolbar (or use the File menu).',
      'Select "Add to Dock…".',
      'Confirm the name and click "Add" - the app now launches like a native app from the Dock.',
    ],
  },
  'desktop:ladybird': {
    supported: false,
    note: 'Ladybird is still an early-stage browser and does not yet support installing web apps or home-screen shortcuts.',
    alternatives: ['chrome', 'edge', 'brave', 'opera'],
  },
  'android:chrome': {
    supported: true,
    steps: [
      'Open the app in Chrome.',
      'Tap the ⋮ menu in the top right.',
      'Tap "Install app" (may show as "Add to Home screen").',
      'Confirm with "Install" - an icon appears on your home screen and app drawer.',
    ],
  },
  'android:edge': {
    supported: true,
    steps: [
      'Open the app in Edge.',
      'Tap the ••• menu.',
      'Tap "Add to phone" and choose "Install".',
      'Confirm - the app appears on your home screen.',
    ],
  },
  'android:brave': {
    supported: true,
    steps: [
      'Open the app in Brave.',
      'Tap the ⋮ menu.',
      'Tap "Install app" (may show as "Add to Home screen").',
      'Confirm - the icon is added to your home screen.',
    ],
  },
  'android:firefox': {
    supported: true,
    steps: [
      'Open the app in Firefox.',
      'Tap the ⋮ menu.',
      'Tap "Install".',
      'Confirm - Firefox adds an app icon to your home screen that opens without browser controls.',
    ],
  },
  'android:opera': {
    supported: true,
    steps: [
      'Open the app in Opera.',
      'Tap the Opera menu.',
      'Tap "Home screen" → "Add to Home screen" (may show as "Install app").',
      'Confirm - the icon appears on your home screen.',
    ],
  },
  'android:samsung': {
    supported: true,
    steps: [
      'Open the app in Samsung Internet.',
      'Tap the ☰ menu at the bottom of the screen.',
      'Tap "Add page to" → "Home screen" (may show as "Install app").',
      'Confirm - the app icon is added to your home screen.',
    ],
  },
  'ios:safari': {
    supported: true,
    steps: [
      'Open the app in Safari.',
      'Tap the Share icon (a square with an arrow pointing up).',
      'Scroll down and tap "Add to Home Screen".',
      'Confirm the name and tap "Add" - the app now launches full-screen from your home screen.',
    ],
  },
  'ios:chrome': {
    supported: false,
    note: 'Apple requires every iOS browser to use its WebKit engine, and only Safari is allowed to install web apps to the home screen.',
    alternatives: ['safari'],
  },
  'ios:edge': {
    supported: false,
    note: 'Apple requires every iOS browser to use its WebKit engine, and only Safari is allowed to install web apps to the home screen.',
    alternatives: ['safari'],
  },
  'ios:brave': {
    supported: false,
    note: 'Apple requires every iOS browser to use its WebKit engine, and only Safari is allowed to install web apps to the home screen.',
    alternatives: ['safari'],
  },
  'ios:firefox': {
    supported: false,
    note: 'Apple requires every iOS browser to use its WebKit engine, and only Safari is allowed to install web apps to the home screen.',
    alternatives: ['safari'],
  },
  'ios:opera': {
    supported: false,
    note: 'Apple requires every iOS browser to use its WebKit engine, and only Safari is allowed to install web apps to the home screen.',
    alternatives: ['safari'],
  },
}

function defaultBrowserFor(platform) {
  const detected = detectBrowser()
  const available = BROWSERS_BY_PLATFORM[platform]
  return available.includes(detected) ? detected : available[0]
}

export default function HowToInstallPage() {
  const [platform, setPlatform] = useState(() => detectPlatform())
  const [browser, setBrowser] = useState(() => defaultBrowserFor(detectPlatform()))

  const availableBrowsers = BROWSERS_BY_PLATFORM[platform]
  const guide = GUIDES[`${platform}:${browser}`]

  function handlePlatformChange(event) {
    const nextPlatform = event.target.value
    setPlatform(nextPlatform)
    if (!BROWSERS_BY_PLATFORM[nextPlatform].includes(browser)) {
      setBrowser(BROWSERS_BY_PLATFORM[nextPlatform][0])
    }
  }

  return (
    <div className="install-screen">
      <div className="install-card">
        <p className="install-eyebrow">Split Even Wiser</p>
        <h1 className="install-title">How to Install</h1>
        <p className="install-intro">
          Installing the app gives you a home-screen icon, a full-screen window without browser
          controls, and offline access. Pick your device and browser for exact steps.
        </p>

        <div className="install-selects">
          <label className="install-select-label">
            Platform
            <select className="install-select" value={platform} onChange={handlePlatformChange}>
              {PLATFORMS.map((value) => (
                <option key={value} value={value}>{PLATFORM_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="install-select-label">
            Browser
            <select
              className="install-select"
              value={browser}
              onChange={(event) => setBrowser(event.target.value)}
            >
              {availableBrowsers.map((value) => (
                <option key={value} value={value}>{BROWSER_LABELS[value]}</option>
              ))}
            </select>
          </label>
        </div>

        {guide.supported ? (
          <>
            <ol className="install-steps">
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {guide.note && <p className="install-note">{guide.note}</p>}
          </>
        ) : (
          <div className="install-unsupported">
            <p className="install-unsupported__title">
              {BROWSER_LABELS[browser]} on {PLATFORM_LABELS[platform]} can’t install apps to your device.
            </p>
            <p className="install-unsupported__reason">{guide.note}</p>
            <p className="install-unsupported__alt">
              {guide.alternatives.length === 1 ? "Use this instead: " : "Use one of these instead: "}
              {guide.alternatives.map((alt, index) => (
                <span key={alt}>
                  <button type="button" className="install-alt-btn" onClick={() => setBrowser(alt)}>
                    {BROWSER_LABELS[alt]}
                  </button>
                  {index < guide.alternatives.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
        )}

        <Link to="/" className="install-back-link">← Back</Link>
      </div>
    </div>
  )
}
