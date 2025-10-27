import { LoginPage } from '@/components/login-page'

export const metadata = {
    title: 'Sign In - VolSpike',
    description: 'Sign in to VolSpike to access real-time volume spike alerts',
}

export default function LoginPageRoute() {
    return <LoginPage initialMode="signin" />
}
