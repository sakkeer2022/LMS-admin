export interface UserProfile { id: string; email: string; firstName: string; lastName: string; isActive: boolean; roles: { id: string; name: string; permissions: { name: string }[] }[] }
