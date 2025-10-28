import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { CreateUserForm } from '@/components/admin/users/create-user-form'

export const metadata: Metadata = {
    title: 'Create User - Admin',
    description: 'Create a new user account',
}

export default async function CreateUserPage() {
    const session = await auth()

    // Check if user is admin
    if (!session?.user || session.user.role !== 'ADMIN') {
        redirect('/auth')
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Create New User</h1>
                <p className="text-muted-foreground">
                    Create a new user account and send them an invitation
                </p>
            </div>

            <CreateUserForm />
        </div>
    )
}
