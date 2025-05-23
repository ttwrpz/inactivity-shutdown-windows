import PowerShell from "powershell";

class WindowsNotifier {
    static async showNotification(title, message, type = 'info') {
        const psScript = `
            Add-Type -AssemblyName System.Windows.Forms
            $notification = New-Object System.Windows.Forms.NotifyIcon
            $notification.Icon = [System.Drawing.SystemIcons]::Information
            $notification.BalloonTipTitle = "${title}"
            $notification.BalloonTipText = "${message}"
            $notification.Visible = $true
            $notification.ShowBalloonTip(5000)
            Start-Sleep -Seconds 6
            $notification.Dispose()
        `;

        try {
            await new Promise((resolve, reject) => {
                new PowerShell(psScript, false, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        } catch (error) {
            console.log(`Notification failed: ${error.message}`);
        }
    }
}

export default WindowsNotifier;