exports.up = async function(knex) {
  await knex.schema.createTable('cell_values', (table) => {
    table.increments('id').primary();
    table.integer('node_id').unsigned().notNullable()
      .references('id').inTable('hierarchy_nodes').onDelete('CASCADE');
    table.integer('measure_id').unsigned().notNullable()
      .references('id').inTable('measures').onDelete('CASCADE');
    table.integer('time_period_id').unsigned().notNullable()
      .references('id').inTable('time_periods').onDelete('CASCADE');
    table.decimal('value', 18, 4).nullable();
    table.integer('version_id').unsigned().notNullable().defaultTo(1)
      .references('id').inTable('versions');
    table.integer('updated_by').unsigned().nullable()
      .references('id').inTable('users');
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.unique(['node_id', 'measure_id', 'time_period_id', 'version_id']);
    table.index('node_id', 'idx_cell_values_node');
    table.index(['node_id', 'measure_id', 'time_period_id', 'version_id'], 'idx_cell_values_composite');
    table.index('version_id', 'idx_cell_values_version');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('cell_values');
};
