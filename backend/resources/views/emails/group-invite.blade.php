<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, Helvetica, Arial, sans-serif; background: #f4f5f7; padding: 24px;">
    <table role="presentation" width="100%" style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 32px;">
        <tr>
            <td>
                <h1 style="font-size: 20px; margin: 0 0 16px;">You've been added to "{{ $groupName }}"</h1>
                <p style="color: #444; line-height: 1.5;">
                    {{ $inviterName }} added you as a member of "{{ $groupName }}" on Split Even Wiser to help split expenses. Tap the button below to view it and log in. This link expires in 7 days and can only be used once.
                </p>
                <p style="margin: 24px 0;">
                    <a href="{{ $verifyUrl }}"
                       style="background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
                        View group
                    </a>
                </p>
                <p style="color: #888; font-size: 13px; line-height: 1.5;">
                    If you weren't expecting this, you can safely ignore this email.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
