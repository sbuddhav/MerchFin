exports.up = async function(knex) {
  await knex.schema.createTable('hierarchy_levels', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.integer('depth').unique().notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('hierarchy_nodes', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.integer('level_id').unsigned().notNullable()
      .references('id').inTable('hierarchy_levels');
    table.integer('parent_id').unsigned().nullable()
      .references('id').inTable('hierarchy_nodes').onDelete('CASCADE');
    table.integer('sort_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('parent_id', 'idx_nodes_parent');
    table.index('level_id', 'idx_nodes_level');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('hierarchy_nodes');
  await knex.schema.dropTableIfExists('hierarchy_levels');
};
