exports.up = async function(knex) {
  await knex.schema.createTable('versions', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.boolean('is_default').defaultTo(false);
    table.integer('created_by').unsigned().nullable()
      .references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('versions');
};
