import React from 'react'
import GroupsAdmin from '@/components/Admin/GroupsAdmin'

export const metadata = {
    title: 'Groups Management | Code School Admin',
    description: 'Manage course groups, sessions, and student enrollments'
}

export default function GroupsPage() {
    return <GroupsAdmin />
}