export enum SessionStatus {
    Active = 'ACTIVE',
    Revoked = 'REVOKED',
    Expired = 'EXPIRED',
}

export type SessionProps = {
    id: string;
    userId: string;
    refreshTokenHash: string;
    status: SessionStatus;
    createdAt: Date;
    lastUsedAt: Date;
    expiresAt: Date;
    revokedAt?: Date;
    revokedBy?: string;
    ip?: string;
    userAgent?: string;
};

export class Session {
    private constructor(private readonly props: SessionProps) {}

    static create(props: SessionProps): Session {
        return new Session({ ...props });
    }

    get id(): string {
        return this.props.id;
    }

    get userId(): string {
        return this.props.userId;
    }

    get refreshTokenHash(): string {
        return this.props.refreshTokenHash;
    }

    get status(): SessionStatus {
        return this.props.status;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get lastUsedAt(): Date {
        return this.props.lastUsedAt;
    }

    get expiresAt(): Date {
        return this.props.expiresAt;
    }

    get revokedAt(): Date | undefined {
        return this.props.revokedAt;
    }

    get revokedBy(): string | undefined {
        return this.props.revokedBy;
    }

    get ip(): string | undefined {
        return this.props.ip;
    }

    get userAgent(): string | undefined {
        return this.props.userAgent;
    }
}
