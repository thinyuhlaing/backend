import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_DB_PROVIDER } from '../database/database.constants';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './enums/user-role.enum';
import { UserWithPassword } from './interfaces/user.interface';
import { profiles } from './schema/profiles.schema';
import { users } from './schema/users.schema';

type UserRow = typeof users.$inferSelect;
type ProfileRow = typeof profiles.$inferSelect;

type UserWithProfileRow = {
  user: UserRow;
  profile: ProfileRow;
};

@Injectable()
export class UsersRepository {
  constructor(
    @Inject(DRIZZLE_DB_PROVIDER)
    private readonly db: NodePgDatabase,
  ) {}

  async create(
    dto: CreateUserDto & { password: string },
  ): Promise<UserWithPassword> {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          login: dto.login,
          password: dto.password,
          refreshTokenHash: null,
          userRole: dto.userRole,
        })
        .returning();

      const [profile] = await tx
        .insert(profiles)
        .values({
          userId: user.id,
          name: dto.name,
          email: dto.login,
          phone: dto.phone ?? null,
          avatarUrl: dto.avatarUrl ?? null,
        })
        .returning();

      return this.mapJoinedRow({ user, profile });
    });
  }

  async findAll(): Promise<UserWithPassword[]> {
    const rows = await this.db
      .select({
        user: users,
        profile: profiles,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .orderBy(desc(users.createdAt));

    return rows.map((row) => this.mapJoinedRow(row));
  }

  async findOne(id: string): Promise<UserWithPassword | null> {
    const [row] = await this.db
      .select({
        user: users,
        profile: profiles,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.id, id));

    return row ? this.mapJoinedRow(row) : null;
  }

  async findByLogin(login: string): Promise<UserWithPassword | null> {
    const [row] = await this.db
      .select({
        user: users,
        profile: profiles,
      })
      .from(users)
      .innerJoin(profiles, eq(profiles.userId, users.id))
      .where(eq(users.login, login));

    return row ? this.mapJoinedRow(row) : null;
  }

  async findById(id: string): Promise<UserWithPassword | null> {
    return this.findOne(id);
  }

  async update(
    id: string,
    dto: UpdateUserDto & { password?: string },
  ): Promise<UserWithPassword | null> {
    return this.db.transaction(async (tx) => {
      const userValues: Partial<typeof users.$inferInsert> = {};
      const profileValues: Partial<typeof profiles.$inferInsert> = {};

      if (dto.login !== undefined) {
        userValues.login = dto.login;
        profileValues.email = dto.login;
      }

      if (dto.password !== undefined) {
        userValues.password = dto.password;
      }

      if (dto.userRole !== undefined) {
        userValues.userRole = dto.userRole;
      }

      if (dto.name !== undefined) {
        profileValues.name = dto.name;
      }

      if (dto.phone !== undefined) {
        profileValues.phone = dto.phone;
      }

      if (dto.avatarUrl !== undefined) {
        profileValues.avatarUrl = dto.avatarUrl;
      }

      if (Object.keys(userValues).length > 0) {
        await tx.update(users).set(userValues).where(eq(users.id, id));
      }

      if (Object.keys(profileValues).length > 0) {
        await tx
          .update(profiles)
          .set(profileValues)
          .where(eq(profiles.userId, id));
      }

      const [row] = await tx
        .select({
          user: users,
          profile: profiles,
        })
        .from(users)
        .innerJoin(profiles, eq(profiles.userId, users.id))
        .where(eq(users.id, id));

      return row ? this.mapJoinedRow(row) : null;
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

  async remove(id: string) {
    const deleted = await this.db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return deleted.length > 0;
  }

  async updateRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.db
      .update(users)
      .set({ refreshTokenHash })
      .where(eq(users.id, id));
  }

  private mapJoinedRow(row: UserWithProfileRow): UserWithPassword {
    return {
      id: row.user.id,
      login: row.user.login,
      password: row.user.password,
      refreshTokenHash: row.user.refreshTokenHash,
      userRole: row.user.userRole,
      name: row.profile.name,
      phone: row.profile.phone,
      avatarUrl: row.profile.avatarUrl,
      createdAt: row.user.createdAt,
      updatedAt: row.user.updatedAt,
    };
  }
}
