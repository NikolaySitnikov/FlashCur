'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Shield,
    Eye,
    EyeOff,
    RefreshCw,
    Trash2,
    Clock,
    MapPin,
    Monitor
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { adminAPI } from '@/lib/admin/api-client'
import { formatDistanceToNow } from 'date-fns'

export function SecuritySettings() {
    const [loading, setLoading] = useState<string | null>(null)
    const [sessions, setSessions] = useState<any[]>([])
    const [showPassword, setShowPassword] = useState(false)
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading('password')

        try {
            if (passwordData.newPassword !== passwordData.confirmPassword) {
                toast.error('New passwords do not match')
                return
            }

            await adminAPI.changePassword(passwordData)
            toast.success('Password changed successfully')
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            })
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password')
        } finally {
            setLoading(null)
        }
    }

    const handleRevokeSession = async (sessionId: string) => {
        setLoading(sessionId)
        try {
            await adminAPI.revokeSession(sessionId)
            toast.success('Session revoked')
            setSessions(sessions.filter(s => s.id !== sessionId))
        } catch (error: any) {
            toast.error('Failed to revoke session')
        } finally {
            setLoading(null)
        }
    }

    const loadSessions = async () => {
        setLoading('sessions')
        try {
            const data = await adminAPI.getActiveSessions()
            setSessions(data.sessions)
        } catch (error: any) {
            toast.error('Failed to load sessions')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Password Change */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Shield className="h-5 w-5" />
                        <span>Change Password</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <div className="relative">
                                <Input
                                    id="currentPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                minLength={12}
                                required
                            />
                            <p className="text-sm text-muted-foreground mt-1">
                                Minimum 12 characters with mixed case, numbers, and symbols
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                required
                            />
                        </div>

                        <Button type="submit" disabled={loading === 'password'}>
                            {loading === 'password' ? 'Changing...' : 'Change Password'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Monitor className="h-5 w-5" />
                            <span>Active Sessions</span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={loadSessions}
                            disabled={loading === 'sessions'}
                        >
                            {loading === 'sessions' ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                            Refresh
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {sessions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No active sessions found</p>
                            <p className="text-sm">Click refresh to load current sessions</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.map((session) => (
                                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="flex items-center space-x-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-medium">{session.ipAddress}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(session.lastActivity), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                            {session.userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop'}
                                        </Badge>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRevokeSession(session.id)}
                                        disabled={loading === session.id}
                                    >
                                        {loading === session.id ? (
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
