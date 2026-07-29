<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Log in to Split Even Wiser</title>
</head>
<body style="font-family: -apple-system, Helvetica, Arial, sans-serif; background: #f4f5f7; padding: 24px;">
    <table role="presentation" width="100%" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
        <tr>
            <td>
                <h1 style="font-size: 20px; margin: 0 0 16px;">Log in to Split Even Wiser</h1>
                <p style="color: #444; line-height: 1.5;">
                    Tap the button below to log in. This link expires in 15 minutes and can only be used once.
                </p>
                <p style="margin: 24px 0;">
                    <a href="{{ $verifyUrl }}"
                       style="background: #1f6f4a; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                        Log in
                    </a>
                </p>
                <p style="color: #444; line-height: 1.5;">
                    The button may open your browser instead of the Split Even Wiser app.
                    If that happens, go back to the app and enter this code instead:
                </p>
                <p style="margin: 16px 0; text-align: center; background: #f4f5f7; border-radius: 6px; padding: 14px;">
                    <span style="font-size: 28px; font-weight: 700; letter-spacing: 6px; font-family: monospace;">{{ $code }}</span>
                </p>
                <p style="color: #888; font-size: 13px; line-height: 1.5;">
                    If you didn't request this, you can safely ignore this email.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
