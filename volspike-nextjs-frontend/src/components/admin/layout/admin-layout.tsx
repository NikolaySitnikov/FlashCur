import React from 'react';
import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';

interface AdminLayoutProps {
    children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">
            <AdminSidebar />
            <div className="flex flex-col flex-1 lg:ml-64">
                <AdminHeader />
                <main className="flex-1 p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
