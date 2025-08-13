DROP TABLE IF EXISTS alembic_version CASCADE;
DROP TABLE IF EXISTS user_song CASCADE;
DROP TABLE IF EXISTS "user" CASCADE; -- "user" necesita comillas
DROP TABLE IF EXISTS song CASCADE;

COMMIT; -- Fuerza a la base de datos a guardar los cambios permanentemente.