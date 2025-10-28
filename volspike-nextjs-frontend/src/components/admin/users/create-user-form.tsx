'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { adminAPI } from '@/lib/admin/api-client'
import { CreateUserRequest } from '@/types/admin'

export function CreateUserForm() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<CreateUserRequest>({
        email: '',
        tier: 'free',
        role: 'USER',
        sendInvite: true,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await adminAPI.createUser(formData)

            if (result.temporaryPassword) {
                toast.success(`User created successfully. Temporary password: ${result.temporaryPassword}`)
            } else {
                toast.success('User created successfully. Invitation email sent.')
            }

            router.push('/admin/users')
        } catch (error: any) {
            toast.error(error.message || 'Failed to create user')
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = () => {
        router.push('/admin/users')
    }

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="user@example.com"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="tier">Tier</Label>
                            <Select
                                value={formData.tier}
                                onValueChange={(value: any) => setFormData(prev => ({ ...prev, tier: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="free">Free</SelectItem>
                                    <SelectItem value="pro">Pro</SelectItem>
                                    <SelectItem value="elite">Elite</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(value: any) => setFormData(prev => ({ ...prev, role: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USER">User</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="sendInvite"
                                checked={formData.sendInvite}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sendInvite: checked as boolean }))}
                            />
                            <Label htmlFor="sendInvite">Send invitation email</Label>
                        </div>

                        {!formData.sendInvite && (
                            <div>
                                <Label htmlFor="temporaryPassword">Temporary Password</Label>
                                <Input
                                    id="temporaryPassword"
                                    type="password"
                                    value={formData.temporaryPassword || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, temporaryPassword: e.target.value }))}
                                    placeholder="Leave empty to generate automatically"
                                    minLength={12}
                                />
                                <p className="text-sm text-muted-foreground mt-1">
                                    Minimum 12 characters. Leave empty to generate automatically.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end space-x-4">
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !formData.email}>
                            {loading ? 'Creating...' : 'Create User'}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
