DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "users"
    GROUP BY "login"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add users_login_unique: duplicate users.login values exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_login_unique'
      AND conrelid = '"users"'::regclass
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_login_unique" UNIQUE ("login");
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "profiles"
    GROUP BY "user_id"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add profiles_user_id_unique: duplicate profiles.user_id values exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_user_id_unique'
      AND conrelid = '"profiles"'::regclass
  ) THEN
    ALTER TABLE "profiles"
      ADD CONSTRAINT "profiles_user_id_unique" UNIQUE ("user_id");
  END IF;
END $$;
