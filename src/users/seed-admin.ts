import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { hashPassword } from './password.util';
import { UserRole } from './enums/user-role.enum';
import { profiles } from './schema/profiles.schema';
import { users } from './schema/users.schema';

config({ path: '.env' });

async function seedAdmin() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const db = drizzle(pool);
  const adminName = process.env.ADMIN_NAME ?? process.env.ADMIN_USERNAME;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminRole =
    (process.env.ADMIN_USER_ROLE as UserRole | undefined) ??
    UserRole.INTERNAL_USER;

  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error('Missing admin seed env variables');
  }

  const password = hashPassword(adminPassword);

  const [existing] = await db
    .select({
      user: users,
      profile: profiles,
    })
    .from(users)
    .innerJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.login, adminEmail));

  if (existing) {
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          password,
          isVerified: true,
          emailVerifiedAt: existing.user.emailVerifiedAt ?? new Date(),
          userRole: adminRole,
        })
        .where(eq(users.id, existing.user.id));

      await tx
        .update(profiles)
        .set({
          name: adminName,
          email: adminEmail,
        })
        .where(eq(profiles.userId, existing.user.id));
    });

    console.log(`Updated admin user: ${adminEmail}`);
  } else {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          login: adminEmail,
          password,
          isVerified: true,
          emailVerifiedAt: new Date(),
          userRole: adminRole,
        })
        .returning({ id: users.id });

      await tx.insert(profiles).values({
        userId: user.id,
        name: adminName,
        email: adminEmail,
      });
    });

    console.log(`Created admin user: ${adminEmail}`);
  }

  await pool.end();
}

seedAdmin().catch((error) => {
  console.error('Failed to seed admin user', error);
  process.exit(1);
});
