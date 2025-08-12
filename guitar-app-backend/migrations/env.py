import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Importa tus modelos para que Alembic los vea
from models import db 

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = db.metadata

# --- CONFIGURACIÓN PARA RENDER/SUPABASE ---
def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    
    # Obtiene la URL de la base de datos de la variable de entorno
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set")
    
    # Corrige el prefijo para SQLAlchemy si es necesario
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    # Crea la configuración de conexión
    connectable = engine_from_config(
        {'sqlalchemy.url': db_url},
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # ¡ESTAS SON LAS LÍNEAS CLAVE!
            version_table_schema='public',
            include_schemas=True,
        )

        with context.begin_transaction():
            context.run_migrations()

# Ejecuta las migraciones en modo online
run_migrations_online()