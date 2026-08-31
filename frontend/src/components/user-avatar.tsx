// components/user-avatar.tsx
type UserAvatarProps = {
    avatarUrl?: string | null
    name?: string
    size?: number
}

export function UserAvatar({ avatarUrl, name, size = 40}: UserAvatarProps) {
    const initials = name?.trim()?.[0]?.toUpperCase() ?? '?'

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name ?? 'User avatar'}
                className="rounded-full object-cover"
                style={{ width: size, height: size }}
            />
        )
    }

    return (
        <div
            className="flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium"
            style={{ width: size, height: size}}
        >
            {initials}
        </div>
    )
}