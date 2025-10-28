'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'react-hot-toast'
import { adminAPI } from '@/lib/admin/api-client'
import { AdminSettings } from '@/types/admin'

interface SettingsFormProps {
    settings: AdminSettings
}

export function SettingsForm({ settings }: SettingsFormProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        adminEmailWhitelist: settings.adminEmailWhitelist.join('\n'),
        adminIPWhitelist: settings.adminIPWhitelist.join('\n'),
        adminSessionDuration: settings.adminSessionDuration,
        auditLogRetentionDays: settings.auditLogRetentionDays,
        rateLimitConfig: settings.rateLimitConfig,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const updatedSettings = {
                adminEmailWhitelist: formData.adminEmailWhitelist.split('\n').filter(email => email.trim()),
                adminIPWhitelist: formData.adminIPWhitelist.split('\n').filter(ip => ip.trim()),
                adminSessionDuration: formData.adminSessionDuration,
                auditLogRetentionDays: formData.auditLogRetentionDays,
                rateLimitConfig: formData.rateLimitConfig,
            }

            await adminAPI.updateAdminSettings(updatedSettings)
            toast.success('Settings updated successfully')
        } catch (error: any) {
            toast.error(error.message || 'Failed to update settings')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Email Whitelist */}
                    <div>
                        <Label htmlFor="emailWhitelist">Admin Email Whitelist</Label>
                        <textarea
                            id="emailWhitelist"
                            value={formData.adminEmailWhitelist}
                            onChange={(e) => setFormData(prev => ({ ...prev, adminEmailWhitelist: e.target.value }))}
                            placeholder="Enter email addresses, one per line"
                            className="w-full p-2 border rounded-md h-24 resize-none"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            Only these email addresses can access the admin panel
                        </p>
                    </div>

                    {/* IP Whitelist */}
                    <div>
                        <Label htmlFor="ipWhitelist">Admin IP Whitelist</Label>
                        <textarea
                            id="ipWhitelist"
                            value={formData.adminIPWhitelist}
                            onChange={(e) => setFormData(prev => ({ ...prev, adminIPWhitelist: e.target.value }))}
                            placeholder="Enter IP addresses or ranges, one per line"
                            className="w-full p-2 border rounded-md h-24 resize-none"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            Only these IP addresses can access the admin panel (leave empty to allow all)
                        </p>
                    </div>

                    {/* Session Duration */}
                    <div>
                        <Label htmlFor="sessionDuration">Admin Session Duration (minutes)</Label>
                        <Input
                            id="sessionDuration"
                            type="number"
                            value={formData.adminSessionDuration}
                            onChange={(e) => setFormData(prev => ({ ...prev, adminSessionDuration: parseInt(e.target.value) }))}
                            min="5"
                            max="1440"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            How long admin sessions should last before requiring re-authentication
                        </p>
                    </div>

                    {/* Audit Log Retention */}
                    <div>
                        <Label htmlFor="auditRetention">Audit Log Retention (days)</Label>
                        <Input
                            id="auditRetention"
                            type="number"
                            value={formData.auditLogRetentionDays}
                            onChange={(e) => setFormData(prev => ({ ...prev, auditLogRetentionDays: parseInt(e.target.value) }))}
                            min="30"
                            max="365"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            How long to keep audit logs before automatic deletion
                        </p>
                    </div>

                    {/* Rate Limiting */}
                    <div className="space-y-4">
                        <Label>Rate Limiting Configuration</Label>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="loginWindow">Login Window (ms)</Label>
                                <Input
                                    id="loginWindow"
                                    type="number"
                                    value={formData.rateLimitConfig.login.windowMs}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        rateLimitConfig: {
                                            ...prev.rateLimitConfig,
                                            login: {
                                                ...prev.rateLimitConfig.login,
                                                windowMs: parseInt(e.target.value)
                                            }
                                        }
                                    }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="loginMax">Login Max Requests</Label>
                                <Input
                                    id="loginMax"
                                    type="number"
                                    value={formData.rateLimitConfig.login.maxRequests}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        rateLimitConfig: {
                                            ...prev.rateLimitConfig,
                                            login: {
                                                ...prev.rateLimitConfig.login,
                                                maxRequests: parseInt(e.target.value)
                                            }
                                        }
                                    }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="apiWindow">API Window (ms)</Label>
                                <Input
                                    id="apiWindow"
                                    type="number"
                                    value={formData.rateLimitConfig.api.windowMs}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        rateLimitConfig: {
                                            ...prev.rateLimitConfig,
                                            api: {
                                                ...prev.rateLimitConfig.api,
                                                windowMs: parseInt(e.target.value)
                                            }
                                        }
                                    }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="apiMax">API Max Requests</Label>
                                <Input
                                    id="apiMax"
                                    type="number"
                                    value={formData.rateLimitConfig.api.maxRequests}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        rateLimitConfig: {
                                            ...prev.rateLimitConfig,
                                            api: {
                                                ...prev.rateLimitConfig.api,
                                                maxRequests: parseInt(e.target.value)
                                            }
                                        }
                                    }))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
