// app/admin/instructors/page.tsx
import React from 'react'
import AdminManagement from '@/components/Admin/AdminManagement'

export const metadata = {
    title: 'Admin Management | Code School Admin',
    description: 'Manage admin users, permissions, and system settings'
}

export default function AdminPage() {
    return <AdminManagement />
}