/**
 * Add bg_color column to measures table for row background coloring.
 */
exports.up = async function (knex) {
  await knex.schema.alterTable('measures', (table) => {
    table.string('bg_color', 20).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('measures', (table) => {
    table.dropColumn('bg_color');
  });
};
