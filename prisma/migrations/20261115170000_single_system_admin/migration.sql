DO $$
BEGIN
  IF (
    SELECT COUNT(DISTINCT ur."userId")
    FROM "user_roles" ur
    JOIN "roles" r ON r."id" = ur."roleId"
    WHERE r."name" = 'SYSTEM_ADMIN'
  ) > 1 THEN
    RAISE EXCEPTION 'Multiple SYSTEM_ADMIN users exist; resolve them before applying the single-admin migration';
  END IF;
END $$;

ALTER TABLE "users" ADD COLUMN "systemAdminKey" TEXT;

CREATE UNIQUE INDEX "users_systemAdminKey_key" ON "users"("systemAdminKey");

UPDATE "users" u
SET "systemAdminKey" = 'SYSTEM_ADMIN'
WHERE EXISTS (
  SELECT 1
  FROM "user_roles" ur
  JOIN "roles" r ON r."id" = ur."roleId"
  WHERE ur."userId" = u."id"
    AND r."name" = 'SYSTEM_ADMIN'
);
