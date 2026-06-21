import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from '../enums/user-status.enum';

export interface User {
  id: number;
  login: string;
  userRole: UserRole;
  status: UserStatus;
  name: string;
  email: string;
  phone: string | null;
  // avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  password: string;
  refreshTokenHash: string | null;
}

export interface UserList {
  id: number;
  userRole: UserRole;
  status: UserStatus;
  login: string;
  name: string;
}
