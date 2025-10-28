export interface AdminUser {
    id: string
    email: string
    role: 'admin' | 'user'
    tier: 'free' | 'pro' | 'elite'
    twoFactorEnabled?: boolean
    lastLoginAt?: Date | null
}

export interface AppBindings {
    // Add any bindings if needed
}

export interface AppVariables {
    adminUser?: AdminUser
}
