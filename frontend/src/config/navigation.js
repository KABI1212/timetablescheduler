export const normalizeRole = (role) => {
    const normalized = String(role || '').trim().toLowerCase();
    if (normalized === 'developer') return 'admin';
    return normalized;
};

export const menuItems = [
    {
        path: '/',
        label: 'Dashboard',
        icon: 'DB',
        roles: ['admin'],
        description: 'System overview, alerts, and daily operations',
        keywords: ['overview', 'home', 'summary', 'status']
    },
    {
        path: '/timetable-ai',
        label: 'AI Generator',
        icon: 'AI',
        roles: ['admin'],
        description: 'Generate and compare timetable options',
        keywords: ['schedule', 'generate', 'options', 'optimizer']
    },
    {
        path: '/timetable-view',
        label: 'Timetable View',
        icon: 'TV',
        roles: ['admin'],
        description: 'Review published and draft schedules',
        keywords: ['calendar', 'publish', 'view']
    },
    {
        path: '/timetable-editor',
        label: 'Timetable Editor',
        icon: 'ED',
        roles: ['admin'],
        description: 'Drag, lock, and refine timetable slots',
        keywords: ['edit', 'drag', 'draft', 'arrange']
    },
    {
        path: '/timetable-versions',
        label: 'Versions',
        icon: 'VH',
        roles: ['admin'],
        description: 'Publish, inspect, and restore timetable snapshots',
        keywords: ['history', 'rollback', 'publish']
    },
    {
        path: '/conflict-report',
        label: 'Conflict Report',
        icon: 'CF',
        roles: ['admin'],
        description: 'Validate clashes, lab rooms, and unavailable teachers',
        keywords: ['conflicts', 'validate', 'fix']
    },
    {
        path: '/teachers',
        label: 'Teachers',
        icon: 'TC',
        roles: ['admin'],
        description: 'Manage faculty records and teaching load',
        keywords: ['faculty', 'staff', 'assignments']
    },
    {
        path: '/classrooms',
        label: 'Classrooms',
        icon: 'CR',
        roles: ['admin'],
        description: 'Track labs, rooms, and maintenance blocks',
        keywords: ['rooms', 'labs', 'maintenance']
    },
    {
        path: '/subjects',
        label: 'Subjects',
        icon: 'SB',
        roles: ['admin'],
        description: 'Configure theory and lab requirements',
        keywords: ['courses', 'labs', 'hours']
    },
    {
        path: '/availability',
        label: 'Availability',
        icon: 'AV',
        roles: ['admin'],
        description: 'Set preferred, blocked, and leave periods',
        keywords: ['leave', 'preferences', 'blocked']
    },
    {
        path: '/absences',
        label: 'Absence Manager',
        icon: 'AB',
        roles: ['admin'],
        description: 'Handle teacher absences and substitutes',
        keywords: ['substitute', 'leave', 'coverage']
    },
    {
        path: '/analytics',
        label: 'Analytics',
        icon: 'AN',
        roles: ['admin'],
        description: 'Inspect workload and room utilization',
        keywords: ['reports', 'charts', 'insights']
    },
    {
        path: '/admin-backup',
        label: 'Backups',
        icon: 'BK',
        roles: ['admin'],
        description: 'Create and restore JSON database backups',
        keywords: ['backup', 'restore', 'database']
    },
];

export const getMenuItemsForRole = (role) => {
    const normalizedRole = normalizeRole(role);
    return menuItems.filter((item) => item.roles.map(normalizeRole).includes(normalizedRole));
};

export const defaultPathForRole = (role) => {
    return normalizeRole(role) === 'admin' ? '/' : '/login';
};
