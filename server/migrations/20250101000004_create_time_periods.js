exports.up = async function(knex) {
  await knex.schema.createTable('time_config', (table) => {
    table.increments('id').primary();
    table.string('granularity', 20).notNullable()
      .checkIn(['week', 'month', 'quarter']);
    table.integer('fiscal_year_start_month').defaultTo(1);
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('time_periods', (table) => {
    table.increments('id').primary();
    table.string('label', 50).notNullable();
    table.date('start_date').notNullable();
    table.date('end_date').notNullable();
    table.integer('parent_id').unsigned().nullable()
      .references('id').inTable('time_periods');
    table.integer('depth').notNullable();
    table.integer('sort_order').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index('parent_id', 'idx_time_periods_parent');
    table.index('depth', 'idx_time_periods_depth');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('time_periods');
  await knex.schema.dropTableIfExists('time_config');
};
