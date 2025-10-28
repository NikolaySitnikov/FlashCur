import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { SettingsForm } from '@/components/admin/settings/settings-form'
import { SecuritySettings } from '@/components/admin/settings/security-settings'
import { TwoFactorSettings } from '@/components/admin/settings/two-factor-settings'
import { adminAPI } from '@/lib/admin/api-client'

export const metadata: Metadata = {
    title: 'Settings - Admin',
    description: 'Admin settings and configuration',
}

export default async function SettingsPage() {
    const session = await auth()

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    // Set access token for API client
    adminAPI.setAccessToken(session.accessToken || null)

    try {
        // Fetch settings data
        const settingsData = await adminAPI.getAdminSettings()

        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
                    <p className="text-muted-foreground">
                        Configure system settings and security options
                    </p>
                </div>

                <div className="grid gap-6">
                    {/* General Settings */}
                    <SettingsForm settings={settingsData.settings} />

                    {/* Security Settings */}
                    <SecuritySettings />

                    {/* 2FA Settings */}
                    <TwoFactorSettings user={settingsData.user} />
                </div>
            </div>
        )
    } catch (error) {
        console.error('Error fetching settings:', error)
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Settings</h1>
                    <p className="text-muted-foreground">
                        Configure system settings and security options
                    </p>
                </div>
                <div className="text-center py-12">
                    <p className="text-red-600">Error loading settings. Please try again.</p>
                </div>
            </div>
        )
    }
}
