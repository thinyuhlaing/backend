import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { paymentMethods } from '../payment-methods/schema/payment-methods.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';
import { UserWithPassword } from './interfaces/user.interface';
import { profiles } from './schema/profiles.schema';
import { users } from './schema/users.schema';

type UserWithProfileRow = {
  id: number;
  login: string;
  password: string;
  isVerified: boolean;
  refreshTokenHash: string | null;
  emailVerifiedAt: Date | null;
  emailVerificationTokenHash: string | null;
  emailVerificationTokenExpiresAt: Date | null;
  userRole: UserRole;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  walletAmount: string;
  paymentType: string | null;
  vipLevel: number;
  profileId: number;
};

@Injectable()
export class UsersRepository {
  private schemaReady?: Promise<void>;

  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) { }

  async create(
    dto: CreateUserDto & { password: string },
  ): Promise<UserWithPassword> {
    await this.ensureUserSchema();
    const paymentType = await this.normalizePaymentType(dto.paymentType);

    try {
      return await this.db.transaction(async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            login: dto.login,
            password: dto.password,
            isVerified: !dto.emailVerificationToken,
            refreshTokenHash: null,
            emailVerifiedAt: dto.emailVerificationToken ? null : new Date(),
            emailVerificationTokenHash: dto.emailVerificationToken ?? null,
            emailVerificationTokenExpiresAt: dto.emailVerificationToken
              ? new Date(Date.now() + 1000 * 60 * 60 * 24)
              : null,
            userRole: dto.userRole,
            status: dto.status ?? 'Active',
          })
          .returning({ id: users.id });

        const [insertedProfile] = await tx
          .insert(profiles)
          .values({
            userId: user.id,
            name: dto.name,
            email: dto.login,
            phone: dto.phone ?? null,
            avatarUrl: dto.avatarUrl ?? null,
            walletAmount: (dto.walletAmount ?? 0).toString(),
            paymentType,
            vipLevel: dto.vipLevel ?? 0,
          })
          .returning({ id: profiles.id });

        const [row] = await tx.select({
          profileId: profiles.id,
          id: users.id,
          login: users.login,
          password: users.password,
          isVerified: users.isVerified,
          refreshTokenHash: users.refreshTokenHash,
          emailVerifiedAt: users.emailVerifiedAt,
          emailVerificationTokenHash: users.emailVerificationTokenHash,
          emailVerificationTokenExpiresAt: users.emailVerificationTokenExpiresAt,
          userRole: users.userRole,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          name: profiles.name,
          email: profiles.email,
          phone: profiles.phone,
          avatarUrl: profiles.avatarUrl,
          walletAmount: profiles.walletAmount,
          paymentType: profiles.paymentType,
          vipLevel: profiles.vipLevel,
        })
          .from(users)
          .innerJoin(profiles, eq(profiles.userId, users.id))
          .where(eq(users.id, user.id));

        if (!row) {
          console.error('UsersRepository.create: created record not found after inserts', {
            userId: user.id,
            profileInsertResult: insertedProfile,
            dto,
          });
          throw new Error('Failed to create user: created record not found after inserts');
        }

        const created = this.mapJoinedRow(row as UserWithProfileRow);
        return created;
      });
    } catch (err) {
      console.error('UsersRepository.create failed:', err instanceof Error ? err.message : err, err);
      throw err;
    }
  }

  async findAll(opts?: { page?: number; limit?: number; q?: string }): Promise<UserWithPassword[]> {
    await this.ensureUserSchema();

    const page = opts?.page && opts.page > 0 ? opts.page : 1;
    const limit = opts?.limit && opts.limit > 0 ? opts.limit : 50;
    const offset = (page - 1) * limit;

    let builder = this.selectUsersWithProfiles()
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id));

    if (opts?.q) {
      const q = `%${opts.q}%`;
      (builder as any) = (builder as any).where(sql`(profiles.name ILIKE ${q} OR profiles.email ILIKE ${q} OR users.login ILIKE ${q})`);
    }

    const rows = await builder.orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    return rows.map((row) => this.mapJoinedRow(row));
  }

  async findMembers(opts?: { page?: number; limit?: number; q?: string }): Promise<UserWithPassword[]> {
    await this.ensureUserSchema();

    const page = opts?.page && opts.page > 0 ? opts.page : 1;
    const limit = opts?.limit && opts.limit > 0 ? opts.limit : 50;
    const offset = (page - 1) * limit;

    let builder = this.selectUsersWithProfiles()
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.userId))
      .where(ne(users.userRole, UserRole.INTERNAL_USER));

    if (opts?.q) {
      const q = `%${opts.q}%`;
      (builder as any) = (builder as any).where(and(
        ne(users.userRole, UserRole.INTERNAL_USER),
        sql`(profiles.name ILIKE ${q} OR profiles.email ILIKE ${q} OR users.login ILIKE ${q})`,
      ));
    }

    const rows = await builder.orderBy(desc(profiles.createdAt)).limit(limit).offset(offset);

    return rows.map((row) => this.mapJoinedRow(row));
  }

  async findMember(id: number): Promise<UserWithPassword | null> {
    await this.ensureUserSchema();

    const [row] = await this.selectUsersWithProfiles()
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.userId))
      .where(and(
        eq(profiles.id, id),
        ne(users.userRole, UserRole.INTERNAL_USER),
      ));

    return row ? this.mapJoinedRow(row) : null;
  }

  async findMemberByUserId(userId: number): Promise<UserWithPassword | null> {
    await this.ensureUserSchema();

    const [row] = await this.selectUsersWithProfiles()
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.userId))
      .where(eq(users.id, userId));

    return row ? this.mapJoinedRow(row) : null;
  }

  async findOne(id: number): Promise<UserWithPassword | null> {
    await this.ensureUserSchema();

    const [row] = await this.selectUsersWithProfiles()
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, id));

    return row ? this.mapJoinedRow(row) : null;
  }

  async findByLogin(login: string): Promise<UserWithPassword | null> {
    await this.ensureUserSchema();

    const [row] = await this.selectUsersWithProfiles()
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.login, login));

    return row ? this.mapJoinedRow(row) : null;
  }

  async findById(id: number): Promise<UserWithPassword | null> {
    return this.findOne(id);
  }

  async findByVerificationTokenHash(
    tokenHash: string,
  ): Promise<UserWithPassword | null> {
    await this.ensureUserSchema();

    const [row] = await this.selectUsersWithProfiles()
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.emailVerificationTokenHash, tokenHash));

    return row ? this.mapJoinedRow(row) : null;
  }

  async markEmailVerified(id: number): Promise<UserWithPassword | null> {
    await this.ensureUserSchema();

    await this.db
      .update(users)
      .set({
        isVerified: true,
        status: 'Active',
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationTokenExpiresAt: null,
      })
      .where(eq(users.id, id));

    return this.findOne(id);
  }

  async update(
    id: number,
    dto: UpdateUserDto & { password?: string },
  ): Promise<UserWithPassword | null> {
    await this.ensureUserSchema();

    return this.db.transaction(async (tx) => {
      const userValues: Partial<typeof users.$inferInsert> = {};
      const profileValues: Partial<typeof profiles.$inferInsert> = {};

      if (dto.login !== undefined) {
        userValues.login = dto.login;
        profileValues.email = dto.login;
      }
      if (dto.email !== undefined) {
        userValues.login = dto.email;
        profileValues.email = dto.email;
      }

      if (dto.password !== undefined) userValues.password = dto.password;
      if (dto.userRole !== undefined) userValues.userRole = dto.userRole;
      if (dto.status !== undefined) userValues.status = dto.status;
      if (dto.name !== undefined) profileValues.name = dto.name;
      if (dto.phone !== undefined) profileValues.phone = dto.phone;
      if (dto.avatarUrl !== undefined) profileValues.avatarUrl = dto.avatarUrl;
      if (dto.walletAmount !== undefined) {
        profileValues.walletAmount = dto.walletAmount.toString();
      }
      if (dto.paymentType !== undefined) {
        profileValues.paymentType = await this.normalizePaymentType(dto.paymentType);
      }
      if (dto.vipLevel !== undefined) profileValues.vipLevel = dto.vipLevel;

      if (Object.keys(userValues).length > 0) {
        await tx
          .update(users)
          .set({ ...userValues, updatedAt: new Date() })
          .where(eq(users.id, id));
      }

      if (Object.keys(profileValues).length > 0) {
        await tx
          .update(profiles)
          .set({ ...profileValues, updatedAt: new Date() })
          .where(eq(profiles.userId, id));
      }

      return this.findOne(id);
    });
  }

  async updateMember(
    profileId: number,
    dto: UpdateUserDto & { password?: string },
  ): Promise<UserWithPassword | null> {
    await this.ensureUserSchema();

    return this.db.transaction(async (tx) => {
      const [member] = await tx
        .select({
          profileId: profiles.id,
          userId: profiles.userId,
        })
        .from(profiles)
        .innerJoin(users, eq(users.id, profiles.userId))
        .where(and(
          eq(profiles.id, profileId),
          ne(users.userRole, UserRole.INTERNAL_USER),
        ));

      if (!member) {
        return null;
      }

      const userValues: Partial<typeof users.$inferInsert> = {};
      const profileValues: Partial<typeof profiles.$inferInsert> = {};

      if (dto.login !== undefined) {
        userValues.login = dto.login;
        profileValues.email = dto.login;
      }
      if (dto.email !== undefined) {
        userValues.login = dto.email;
        profileValues.email = dto.email;
      }
      if (dto.password !== undefined) userValues.password = dto.password;
      if (dto.userRole !== undefined) userValues.userRole = dto.userRole;
      if (dto.status !== undefined) userValues.status = dto.status;
      if (dto.name !== undefined) profileValues.name = dto.name;
      if (dto.phone !== undefined) profileValues.phone = dto.phone;
      if (dto.avatarUrl !== undefined) profileValues.avatarUrl = dto.avatarUrl;
      if (dto.walletAmount !== undefined) {
        profileValues.walletAmount = dto.walletAmount.toString();
      }
      if (dto.paymentType !== undefined) {
        profileValues.paymentType = await this.normalizePaymentType(dto.paymentType);
      }
      if (dto.vipLevel !== undefined) profileValues.vipLevel = dto.vipLevel;

      if (Object.keys(userValues).length > 0) {
        await tx
          .update(users)
          .set({ ...userValues, updatedAt: new Date() })
          .where(eq(users.id, member.userId));
      }

      if (Object.keys(profileValues).length > 0) {
        await tx
          .update(profiles)
          .set({ ...profileValues, updatedAt: new Date() })
          .where(eq(profiles.id, profileId));
      }

      return this.findMember(profileId);
    });
  }

  async upsertAdmin(values: {
    login: string;
    password: string;
    userRole: UserRole;
    name: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<UserWithPassword> {
    const existing = await this.findByLogin(values.login);

    if (existing) {
      const updated = await this.update(existing.id, values);
      if (!updated) {
        throw new Error('Failed to update admin user');
      }

      return updated;
    }

    return this.create(values);
  }

  async remove(id: number) {
    await this.ensureUserSchema();

    const deleted = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return deleted.length > 0;
  }

  async removeMember(profileId: number) {
    await this.ensureUserSchema();

    const [member] = await this.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .innerJoin(users, eq(users.id, profiles.userId))
      .where(and(
        eq(profiles.id, profileId),
        ne(users.userRole, UserRole.INTERNAL_USER),
      ));

    if (!member) {
      return false;
    }

    const deleted = await this.db
      .delete(users)
      .where(eq(users.id, member.userId))
      .returning({ id: users.id });

    return deleted.length > 0;
  }

  async updateRefreshTokenHash(
    id: number,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.ensureUserSchema();

    await this.db
      .update(users)
      .set({ refreshTokenHash })
      .where(eq(users.id, id));
  }

  private selectUsersWithProfiles() {
    return this.db.select({
      profileId: profiles.id,
      id: users.id,
      login: users.login,
      password: users.password,
      isVerified: users.isVerified,
      refreshTokenHash: users.refreshTokenHash,
      emailVerifiedAt: users.emailVerifiedAt,
      emailVerificationTokenHash: users.emailVerificationTokenHash,
      emailVerificationTokenExpiresAt: users.emailVerificationTokenExpiresAt,
      userRole: users.userRole,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      name: profiles.name,
      email: profiles.email,
      phone: profiles.phone,
      avatarUrl: profiles.avatarUrl,
      walletAmount: profiles.walletAmount,
      paymentType: profiles.paymentType,
      vipLevel: profiles.vipLevel,
    });
  }

  private async ensureUserSchema() {
    this.schemaReady ??= this.applyUserSchemaPatch();
    return this.schemaReady;
  }

  private async normalizePaymentType(paymentType?: string | null) {
    const code = paymentType?.trim().toLowerCase();

    if (!code) {
      return null;
    }

    const [method] = await this.db
      .select({ code: paymentMethods.code })
      .from(paymentMethods)
      .where(
        and(
          eq(paymentMethods.code, code),
          eq(paymentMethods.isActive, true),
          eq(paymentMethods.isArchived, false),
        ),
      );

    if (!method) {
      throw new BadRequestException('Selected payment type is invalid or inactive');
    }

    return method.code;
  }

  private async applyUserSchemaPatch() {
    await this.db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT true NOT NULL
    `);
    await this.db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "refresh_token_hash" varchar(255)
    `);
    await this.db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp with time zone
    `);
    await this.db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token_hash" varchar(255)
    `);
    await this.db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verification_token_expires_at" timestamp with time zone
    `);
    await this.db.execute(sql`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(50) DEFAULT 'Active' NOT NULL
    `);
    await this.db.execute(sql`
      ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "wallet_amount" numeric(12, 2) DEFAULT 0 NOT NULL
    `);
    await this.db.execute(sql`
      ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "payment_type" varchar(100)
    `);
    await this.db.execute(sql`
      ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "vip_level" integer DEFAULT 0 NOT NULL
    `);
  }

  private mapJoinedRow(row: UserWithProfileRow): UserWithPassword {
    return {
      id: row.id,
      profileId: row.profileId,
      login: row.login,
      isVerified: row.isVerified,
      password: row.password,
      refreshTokenHash: row.refreshTokenHash,
      emailVerifiedAt: row.emailVerifiedAt,
      emailVerificationTokenHash: row.emailVerificationTokenHash,
      emailVerificationTokenExpiresAt: row.emailVerificationTokenExpiresAt,
      userRole: row.userRole,
      status: row.status,
      name: row.name,
      email: row.email,
      phone: row.phone,
      avatarUrl: row.avatarUrl,
      walletAmount: Number(row.walletAmount),
      paymentType: row.paymentType,
      vipLevel: row.vipLevel,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
