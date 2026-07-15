from alembic import context
from flask import current_app

from app.extensions import logger


config = context.config
target_db = current_app.extensions["migrate"].db
bind_names = list(current_app.config.get("SQLALCHEMY_BINDS", {}).keys())


def get_engine(bind_key):
    try:
        return target_db.engines[bind_key]
    except (AttributeError, KeyError):
        return target_db.get_engine(bind=bind_key)


def get_engine_url(bind_key):
    try:
        return get_engine(bind_key).url.render_as_string(hide_password=False).replace("%", "%%")
    except AttributeError:
        return str(get_engine(bind_key).url).replace("%", "%%")


for bind_name in bind_names:
    config.set_section_option(bind_name, "sqlalchemy.url", get_engine_url(bind_name))


def get_metadata(bind_key):
    if hasattr(target_db, "metadatas"):
        return target_db.metadatas[bind_key]
    return target_db.metadata


def run_migrations_offline():
    for bind_name in bind_names:
        logger.info("Migrating database %s", bind_name)
        with open(f"{bind_name}.sql", "w", encoding="utf-8") as buffer:
            context.configure(
                url=config.get_section_option(bind_name, "sqlalchemy.url"),
                output_buffer=buffer,
                target_metadata=get_metadata(bind_name),
                literal_binds=True,
                upgrade_token=f"{bind_name}_upgrades",
                downgrade_token=f"{bind_name}_downgrades",
            )
            with context.begin_transaction():
                context.run_migrations(engine_name=bind_name)


def run_migrations_online():
    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]
            if all(upgrade_ops.is_empty() for upgrade_ops in script.upgrade_ops_list):
                directives[:] = []
                logger.info("No changes in schema detected.")

    conf_args = current_app.extensions["migrate"].configure_args
    if conf_args.get("process_revision_directives") is None:
        conf_args["process_revision_directives"] = process_revision_directives

    engines = {
        bind_name: {
            "engine": get_engine(bind_name),
        }
        for bind_name in bind_names
    }

    for record in engines.values():
        record["connection"] = record["engine"].connect()
        record["transaction"] = record["connection"].begin()

    try:
        for bind_name, record in engines.items():
            logger.info("Migrating database %s", bind_name)
            context.configure(
                connection=record["connection"],
                target_metadata=get_metadata(bind_name),
                upgrade_token=f"{bind_name}_upgrades",
                downgrade_token=f"{bind_name}_downgrades",
                **conf_args,
            )
            context.run_migrations(engine_name=bind_name)

        for record in engines.values():
            record["transaction"].commit()
    except Exception:
        for record in engines.values():
            record["transaction"].rollback()
        raise
    finally:
        for record in engines.values():
            record["connection"].close()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
