import { UserRole } from '../enums/user-role.enum';

export interface User {
  id: number;
  profileId?: number;
  login: string;
  isVerified: boolean;
  userRole: UserRole;
  status: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  walletAmount: number;
  paymentType: string | null;
  vipLevel: number;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithPassword extends User {
  password: string;
  refreshTokenHash: string | null;
  emailVerificationTokenHash: string | null;
  emailVerificationTokenExpiresAt: Date | null;
}

export interface Member extends Omit<User, 'id'> {
  id: number;
  userId: number;
}
