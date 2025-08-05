import { Socket } from 'socket.io';
export interface AuthResult {
    success: boolean;
    error?: string;
    token?: string;
    user?: any;
}
export interface User {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user' | 'guest';
    permissions: string[];
    lastLogin: Date;
    isActive: boolean;
}
export declare class AuthManager {
    private logger;
    private config;
    private users;
    private sessions;
    constructor();
    private initializeDefaultUsers;
    authenticateSocket(socket: Socket, data: any): Promise<AuthResult>;
    private authenticateWithToken;
    authenticateWithCredentials(username: string, password: string): Promise<AuthResult>;
    private authenticateAnonymous;
    private validatePassword;
    generateToken(user: User): string;
    private findUserByUsername;
    verifyPermission(token: string, permission: string): boolean;
    getUserFromToken(token: string): User | null;
    createUser(userData: Partial<User>): User;
    updateUser(userId: string, updates: Partial<User>): User | null;
    deleteUser(userId: string): boolean;
    getAllUsers(): User[];
    getUser(userId: string): User | undefined;
    createSession(userId: string, sessionData: any): string;
    getSession(sessionId: string): any;
    updateSessionActivity(sessionId: string): void;
    deleteSession(sessionId: string): boolean;
    cleanupExpiredSessions(): void;
    getActiveSessionsCount(): number;
}
//# sourceMappingURL=AuthManager.d.ts.map