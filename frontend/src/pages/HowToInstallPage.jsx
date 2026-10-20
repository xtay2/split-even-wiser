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
      'The app opens in its own window and is listed with your other apps (Start menu / Launchpad).',
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
      'The app opens in its own window and is listed with your other apps.',
    ],
  },
  'desktop:firefox': {
    supported: false,
    note: 'Firefox for desktop doesn’t support installing web apps. Its "Add tab to taskbar" feature on Windows only pins the site as a browser window - that isn’t an installed app.',
    alternatives: ['chrome', 'edge', 'brave', 'opera'],
  },
  'desktop:opera': {
    supported: true,
    steps: [
      'Open the app in Opera.',
      'Click the install icon in the address bar, or open the Opera menu.',
      'Choose "Install Split Even Wiser…" and confirm.',
      'The app opens in its own window and is listed with your other apps.',
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
    note: 'Ladybird is still an early-stage browser and does not yet support installing web apps.',
    alternatives: ['chrome', 'edge', 'brave', 'opera'],
  },
  'android:chrome': {
    supported: true,
    steps: [
      'Open the app in Chrome.',
      'Tap the ⋮ menu in the top right.',
      'Tap "Install app". Don’t use "Add to Home screen" - it only creates a shortcut, not the app.',
      'Confirm with "Install" - the app appears on your home screen and in your app drawer.',
    ],
  },
  'android:edge': {
    supported: false,
    note: 'Edge for Android can only add a shortcut that opens the site inside the browser - that isn’t an installed app. On Android, only Chrome and Samsung Internet can install web apps.',
    alternatives: ['chrome', 'samsung'],
  },
  'android:brave': {
    supported: false,
    note: 'Brave for Android can only add a shortcut that opens the site inside the browser - that isn’t an installed app. On Android, only Chrome and Samsung Internet can install web apps.',
    alternatives: ['chrome', 'samsung'],
  },
  'android:firefox': {
    supported: false,
    note: 'Firefox for Android can only add a shortcut that opens the site inside the browser - that isn’t an installed app. On Android, only Chrome and Samsung Internet can install web apps.',
    alternatives: ['chrome', 'samsung'],
  },
  'android:opera': {
    supported: false,
    note: 'Opera for Android can only add a shortcut that opens the site inside the browser - that isn’t an installed app. On Android, only Chrome and Samsung Internet can install web apps.',
    alternatives: ['chrome', 'samsung'],
  },
  'android:samsung': {
    supported: true,
    note: 'Installing works on Samsung devices only. On other Android phones, use Chrome instead.',
    steps: [
      'Open the app in Samsung Internet.',
      'Tap the install icon (a down arrow) at the right edge of the address bar.',
      'Confirm with "Install" - the app appears on your home screen and in your app drawer.',
    ],
  },
  'ios:safari': {
    supported: true,
    steps: [
      'Open the app in Safari.',
      'Tap the Share icon (a square with an arrow pointing up).',
      'Scroll down and tap "Add to Home Screen".',
      'Make sure "Open as Web App" is turned on (if shown), then tap "Add" - the app now launches full-screen from your home screen.',
    ],
  },
  'ios:chrome': {
    supported: true,
    note: 'Requires iOS / iPadOS 16.4 or later. On older versions, use Safari instead.',
    steps: [
      'Open the app in Chrome.',
      'Tap the Share icon in the address bar (or open the ••• menu and tap "Share").',
      'Scroll down and tap "Add to Home Screen".',
      'Confirm the name and tap "Add" - the app now launches from your home screen.',
    ],
  },
  'ios:edge': {
    supported: true,
    note: 'Requires iOS / iPadOS 16.4 or later. On older versions, use Safari instead.',
    steps: [
      'Open the app in Edge.',
      'Tap the ••• menu and tap "Share".',
      'Scroll down and tap "Add to Home Screen".',
      'Confirm the name and tap "Add" - the app now launches from your home screen.',
    ],
  },
  'ios:brave': {
    supported: false,
    note: 'Since iOS 16.4, Apple lets third-party browsers add web apps to the home screen, but Brave for iOS doesn’t offer this option yet.',
    alternatives: ['safari', 'chrome', 'edge', 'firefox'],
  },
  'ios:firefox': {
    supported: true,
    note: 'Requires iOS / iPadOS 16.4 or later. On older versions, use Safari instead.',
    steps: [
      'Open the app in Firefox.',
      'Tap the Share icon in the address bar.',
      'Tap "Add to Home Screen".',
      'Confirm the name and tap "Add" - the app now launches from your home screen.',
    ],
  },
  'ios:opera': {
    supported: false,
    note: 'Since iOS 16.4, Apple lets third-party browsers add web apps to the home screen, but Opera for iOS doesn’t offer this option yet.',
    alternatives: ['safari', 'chrome', 'edge', 'firefox'],
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
