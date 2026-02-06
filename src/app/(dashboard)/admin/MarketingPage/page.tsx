// app/admin/instructors/page.tsx
import React from 'react'
import MarketingAdmin from '@/components/Admin/MarketingAdmin'

export const metadata = {
    title: 'Marketing Management | Code School Admin',
    description: 'Manage marketing campaigns, promotions, and user engagement'
}

export default function MarketingPage() {
    return <MarketingAdmin />
}