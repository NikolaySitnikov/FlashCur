import { Suspense } from 'react';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Pricing } from '@/components/landing/Pricing';
import { Footer } from '@/components/landing/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-dark-900">
            <Suspense fallback={<LoadingSpinner />}>
                <Hero />
                <Features />
                <Pricing />
                <Footer />
            </Suspense>
        </div>
    );
}
