import { LoginPage } from '@/components/login-page'

export const metadata = {
    title: 'Sign Up - VolSpike',
    description: 'Create your VolSpike account to access real-time volume spike alerts',
}

export default function SignupPage() {
    return <LoginPage initialMode="signup" />
}
