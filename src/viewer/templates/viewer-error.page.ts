export function renderExpiredPage(labName?: string): string {
    const name = labName ?? 'the laboratory';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Link Expired</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh; display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f1f5f9; color: #0f172a;
    }
    .card {
      background: #fff; border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,.1);
      padding: 40px 32px; max-width: 360px; width: 100%; text-align: center;
    }
    .icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: #fef3c7; display: flex; align-items: center; justify-content: center;
      font-size: 28px; margin: 0 auto 20px;
    }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
    p  { font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 8px; }
    .contact { font-size: 13px; color: #d97706; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⏱</div>
    <h1>Report Link Expired</h1>
    <p>This health report link is no longer active. Report links are valid for 90 days from the date of issue.</p>
    <p>Please contact ${name} to obtain an updated copy of your report.</p>
    <div class="contact">Contact your laboratory for assistance</div>
  </div>
</body>
</html>`;
}

export function renderInvalidPage(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invalid Report Link</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh; display: flex; flex-direction: column; align-items: center;
      justify-content: center; padding: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f1f5f9; color: #0f172a;
    }
    .card {
      background: #fff; border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,.1);
      padding: 40px 32px; max-width: 360px; width: 100%; text-align: center;
    }
    .icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: #fee2e2; display: flex; align-items: center; justify-content: center;
      font-size: 28px; margin: 0 auto 20px;
    }
    h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 12px; }
    p  { font-size: 14px; color: #64748b; line-height: 1.7; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✗</div>
    <h1>Invalid Report Link</h1>
    <p>This link does not correspond to any health report. Please make sure you scanned the QR code correctly from your printed lab report.</p>
  </div>
</body>
</html>`;
}
