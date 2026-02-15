exports.up = async function(knex) {
  await knex.schema.createTable('user_node_assignments', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('node_id').unsigned().notNullable()
      .references('id').inTable('hierarchy_nodes').onDelete('CASCADE');

    table.unique(['user_id', 'node_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_node_assignments');
};
