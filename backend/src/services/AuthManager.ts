import { Logger } from '../utils/Logger';
import { Socket } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Config } from '../utils/Config';

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

export class AuthManager {
  private logger = new Logger('AuthManager');
  private config = Config.getInstance();
  private users: Map<string, User> = new Map();
  private sessions: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultUsers();
  }

  private initializeDefaultUsers(): void {
    // Create default admin user
    const adminUser: User = {
      id: 'admin',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      permissions: ['rdp:connect', 'rdp:disconnect', 'file:upload', 'file:download', 'device:redirect', 'clipboard:sync'],
      lastLogin: new Date(),
      isActive: true
    };

    // Create default user
    const defaultUser: User = {
      id: 'user',
      username: 'user',
      email: 'user@example.com',
      role: 'user',
      permissions: ['rdp:connect', 'rdp:disconnect', 'file:upload', 'file:download'],
      lastLogin: new Date(),
      isActive: true
    };

    this.users.set('admin', adminUser);
    this.users.set('user', defaultUser);

    this.logger.info('Default users initialized');
  }

  public async authenticateSocket(socket: Socket, data: any): Promise<AuthResult> {
    try {
      const { username, password, token } = data;

      // Check if token is provided
      if (token) {
        return this.authenticateWithToken(token);
      }

      // Check if username and password are provided
      if (username && password) {
        return this.authenticateWithCredentials(username, password);
      }

      // Check for anonymous access
      if (this.config.get('auth').allowAnonymous) {
        return this.authenticateAnonymous(socket);
      }

      return {
        success: false,
        error: 'Authentication method not supported'
      };
    } catch (error) {
      this.logger.error('Authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  private async authenticateWithToken(token: string): Promise<AuthResult> {
    try {
      const secret = this.config.get('auth').jwtSecret;
      const decoded = jwt.verify(token, secret) as any;

      const user = this.users.get(decoded.userId);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'Invalid or expired token'
        };
      }

      // Update last login
      user.lastLogin = new Date();

      return {
        success: true,
        token,
        user
      };
    } catch (error) {
      this.logger.error('Token authentication error:', error);
      return {
        success: false,
        error: 'Invalid token'
      };
    }
  }

  public async authenticateWithCredentials(username: string, password: string): Promise<AuthResult> {
    try {
      const user = this.findUserByUsername(username);
      if (!user || !user.isActive) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // For demo purposes, we'll use simple password comparison
      // In production, you should use proper password hashing
      const isValidPassword = await this.validatePassword(password, user);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }

      // Update last login
      user.lastLogin = new Date();

      // Generate JWT token
      const token = this.generateToken(user);

      return {
        success: true,
        token,
        user
      };
    } catch (error) {
      this.logger.error('Credential authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }

  private authenticateAnonymous(socket: Socket): AuthResult {
    const anonymousUser: User = {
      id: `anon_${socket.id}`,
      username: 'anonymous',
      email: 'anonymous@example.com',
      role: 'guest',
      permissions: ['rdp:connect', 'rdp:disconnect'],
      lastLogin: new Date(),
      isActive: true
    };

    const token = this.generateToken(anonymousUser);

    return {
      success: true,
      token,
      user: anonymousUser
    };
  }

  private async validatePassword(password: string, user: User): Promise<boolean> {
    // For demo purposes, use simple password validation
    // In production, use proper password hashing
    if (user.username === 'admin' && password === 'admin123') {
      return true;
    }
    if (user.username === 'user' && password === 'user123') {
      return true;
    }
    return false;
  }

  public generateToken(user: User): string {
    const secret = this.config.get('auth').jwtSecret;
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, secret);
  }

  private findUserByUsername(username: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  public verifyPermission(token: string, permission: string): boolean {
    try {
      const secret = this.config.get('auth').jwtSecret;
      const decoded = jwt.verify(token, secret) as any;
      
      const user = this.users.get(decoded.userId);
      if (!user || !user.isActive) {
        return false;
      }

      return user.permissions.includes(permission);
    } catch (error) {
      return false;
    }
  }

  public getUserFromToken(token: string): User | null {
    try {
      const secret = this.config.get('auth').jwtSecret;
      const decoded = jwt.verify(token, secret) as any;
      
      const user = this.users.get(decoded.userId);
      if (!user || !user.isActive) {
        return null;
      }

      return user;
    } catch (error) {
      return null;
    }
  }

  public createUser(userData: Partial<User>): User {
    const user: User = {
      id: userData.id || `user_${Date.now()}`,
      username: userData.username || '',
      email: userData.email || '',
      role: userData.role || 'user',
      permissions: userData.permissions || ['rdp:connect', 'rdp:disconnect'],
      lastLogin: new Date(),
      isActive: true
    };

    this.users.set(user.id, user);
    this.logger.info(`Created user: ${user.username}`);
    
    return user;
  }

  public updateUser(userId: string, updates: Partial<User>): User | null {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    Object.assign(user, updates);
    this.users.set(userId, user);
    
    this.logger.info(`Updated user: ${user.username}`);
    return user;
  }

  public deleteUser(userId: string): boolean {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    this.users.delete(userId);
    this.logger.info(`Deleted user: ${user.username}`);
    return true;
  }

  public getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  public getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  public createSession(userId: string, sessionData: any): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.sessions.set(sessionId, {
      userId,
      createdAt: new Date(),
      lastActivity: new Date(),
      data: sessionData
    });

    this.logger.info(`Created session: ${sessionId} for user: ${userId}`);
    return sessionId;
  }

  public getSession(sessionId: string): any {
    return this.sessions.get(sessionId);
  }

  public updateSessionActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  public deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);
    this.logger.info(`Deleted session: ${sessionId}`);
    return true;
  }

  public cleanupExpiredSessions(): void {
    const maxAge = this.config.get('auth').sessionMaxAge || 24 * 60 * 60 * 1000; // 24 hours
    const now = new Date();

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxAge) {
        this.sessions.delete(sessionId);
        this.logger.info(`Cleaned up expired session: ${sessionId}`);
      }
    }
  }

  public getActiveSessionsCount(): number {
    return this.sessions.size;
  }
} 