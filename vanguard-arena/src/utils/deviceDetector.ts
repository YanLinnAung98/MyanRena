export interface DetectedDeviceInfo {
  device: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  os: string;
  browser: string;
  screen: string;
  userAgent: string;
  lastActive: string;
}

export function detectClientDevice(): DetectedDeviceInfo {
  if (typeof navigator === 'undefined') {
    return {
      device: 'Web Client',
      deviceType: 'Desktop',
      os: 'Unknown OS',
      browser: 'Browser',
      screen: '1280x720',
      userAgent: '',
      lastActive: new Date().toISOString(),
    };
  }

  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  let deviceModel = '';

  if (/iPhone/i.test(ua)) {
    os = 'iOS';
    deviceType = 'Mobile';
    deviceModel = 'iPhone';
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    deviceType = 'Tablet';
    deviceModel = 'iPad';
  } else if (/Android/i.test(ua)) {
    const verMatch = ua.match(/Android\s([0-9.]+)/i);
    os = verMatch ? `Android ${verMatch[1]}` : 'Android';
    deviceType = /Mobile/i.test(ua) ? 'Mobile' : 'Tablet';
    const modelMatch = ua.match(/Android[^;]+;\s*([^;)]+)\s*Build/i);
    deviceModel = modelMatch ? modelMatch[1].trim() : 'Android Phone';
  } else if (/Mac OS X/i.test(ua)) {
    os = 'macOS';
    deviceType = 'Desktop';
    deviceModel = 'Mac';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
    deviceType = 'Desktop';
    deviceModel = 'Windows PC';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    deviceType = 'Desktop';
    deviceModel = 'Linux PC';
  }

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Brave/i.test(ua) || (navigator as any).brave) browser = 'Brave';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  const screen =
    typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Unknown';

  const device = `${deviceModel || deviceType} (${os} • ${browser})`;

  return {
    device,
    deviceType,
    os,
    browser,
    screen,
    userAgent: ua.slice(0, 180),
    lastActive: new Date().toISOString(),
  };
}
