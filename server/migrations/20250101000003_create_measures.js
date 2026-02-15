exports.up = async function(knex) {
  await knex.schema.createTable('measures', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('short_name', 50).unique().notNullable();
    table.string('data_type', 20).notNullable()
      .checkIn(['currency', 'units', 'percentage', 'ratio']);
    table.boolean('is_editable').defaultTo(true);
    table.text('formula').nullable();
    table.string('aggregation_type', 20).defaultTo('SUM')
      .checkIn(['SUM', 'WEIGHTED_AVG', 'AVG', 'NONE']);
    table.integer('weight_measure_id').unsigned().nullable()
      .references('id').inTable('measures');
    table.integer('sort_order').defaultTo(0);
    table.string('format_pattern', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('measures');
};
