'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Key,
    Shield,
    ShieldCheck,
    ShieldX,
    Copy,
    Download,
    RefreshCw
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { adminAPI } from '@/lib/admin/api-client'

interface TwoFactorSettingsProps {
    user: {
        twoFactorEnabled: boolean
    }
}

export function TwoFactorSettings({ user }: TwoFactorSettingsProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const [setupData, setSetupData] = useState<{
        secret: string
        qrCodeUrl: string
        backupCodes: string[]
    } | null>(null)
    const [verificationCode, setVerificationCode] = useState('')
    const [backupCode, setBackupCode] = useState('')

    const handleSetup2FA = async () => {
        setLoading('setup')
        try {
            const data = await adminAPI.setup2FA('') // Password would be required in real implementation
            setSetupData(data)
            toast.success('2FA setup initiated')
        } catch (error: any) {
            toast.error(error.message || 'Failed to setup 2FA')
        } finally {
            setLoading(null)
        }
    }

    const handleVerify2FA = async () => {
        setLoading('verify')
        try {
            await adminAPI.verify2FA({
                code: verificationCode,
                backupCode: backupCode || undefined,
            })
            toast.success('2FA enabled successfully')
            setSetupData(null)
            setVerificationCode('')
            setBackupCode('')
        } catch (error: any) {
            toast.error(error.message || 'Failed to verify 2FA')
        } finally {
            setLoading(null)
        }
    }

    const handleDisable2FA = async () => {
        setLoading('disable')
        try {
            await adminAPI.disable2FA()
            toast.success('2FA disabled successfully')
        } catch (error: any) {
            toast.error(error.message || 'Failed to disable 2FA')
        } finally {
            setLoading(null)
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        toast.success(`${label} copied to clipboard`)
    }

    const downloadBackupCodes = () => {
        if (!setupData) return

        const content = `VolSpike Admin 2FA Backup Codes\n\n${setupData.backupCodes.join('\n')}\n\nKeep these codes safe! Each can only be used once.`
        const blob = new Blob([content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'volspike-2fa-backup-codes.txt'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Key className="h-5 w-5" />
                    <span>Two-Factor Authentication</span>
                    <Badge variant={user.twoFactorEnabled ? 'default' : 'secondary'}>
                        {user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!user.twoFactorEnabled ? (
                    <div className="space-y-6">
                        {!setupData ? (
                            <div className="text-center py-8">
                                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                <h3 className="text-lg font-medium mb-2">Enable Two-Factor Authentication</h3>
                                <p className="text-muted-foreground mb-6">
                                    Add an extra layer of security to your admin account
                                </p>
                                <Button onClick={handleSetup2FA} disabled={loading === 'setup'}>
                                    {loading === 'setup' ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <ShieldCheck className="h-4 w-4 mr-2" />
                                    )}
                                    Enable 2FA
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* QR Code */}
                                <div className="text-center">
                                    <h3 className="text-lg font-medium mb-4">Scan QR Code</h3>
                                    <div className="inline-block p-4 bg-white border rounded-lg">
                                        <img
                                            src={setupData.qrCodeUrl}
                                            alt="2FA QR Code"
                                            className="w-48 h-48"
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Scan this QR code with your authenticator app
                                    </p>
                                </div>

                                {/* Secret Key */}
                                <div>
                                    <Label>Secret Key</Label>
                                    <div className="flex items-center space-x-2">
                                        <Input
                                            value={setupData.secret}
                                            readOnly
                                            className="font-mono text-sm"
                                        />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => copyToClipboard(setupData.secret, 'Secret key')}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Enter this key manually if you can't scan the QR code
                                    </p>
                                </div>

                                {/* Backup Codes */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <Label>Backup Codes</Label>
                                        <div className="flex space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={downloadBackupCodes}
                                            >
                                                <Download className="h-4 w-4 mr-1" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 rounded-lg">
                                        {setupData.backupCodes.map((code, index) => (
                                            <div key={index} className="flex items-center justify-between">
                                                <span className="font-mono text-sm">{code}</span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => copyToClipboard(code, 'Backup code')}
                                                >
                                                    <Copy className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Save these codes in a safe place. Each can only be used once.
                                    </p>
                                </div>

                                {/* Verification */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Verify Setup</h3>
                                    <div>
                                        <Label htmlFor="verificationCode">Enter 6-digit code from your app</Label>
                                        <Input
                                            id="verificationCode"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            placeholder="123456"
                                            maxLength={6}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="backupCode">Or enter a backup code</Label>
                                        <Input
                                            id="backupCode"
                                            value={backupCode}
                                            onChange={(e) => setBackupCode(e.target.value)}
                                            placeholder="Backup code"
                                        />
                                    </div>
                                    <Button
                                        onClick={handleVerify2FA}
                                        disabled={loading === 'verify' || (!verificationCode && !backupCode)}
                                    >
                                        {loading === 'verify' ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <ShieldCheck className="h-4 w-4 mr-2" />
                                        )}
                                        Verify and Enable
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="text-center py-8">
                            <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-green-600" />
                            <h3 className="text-lg font-medium mb-2">Two-Factor Authentication Enabled</h3>
                            <p className="text-muted-foreground mb-6">
                                Your account is protected with 2FA
                            </p>
                            <Button
                                variant="destructive"
                                onClick={handleDisable2FA}
                                disabled={loading === 'disable'}
                            >
                                {loading === 'disable' ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <ShieldX className="h-4 w-4 mr-2" />
                                )}
                                Disable 2FA
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
