import { UserRole } from '../enums/user-role.enum';

export interface User {
  id: number;
  login: string;
  userRole: UserRole;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  password: string;
  refreshTokenHash: string | null;
}
