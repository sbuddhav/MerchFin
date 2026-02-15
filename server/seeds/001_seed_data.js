const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // ──────────────────────────────────────────────
  // a) Clear all tables in reverse dependency order
  // ──────────────────────────────────────────────
  await knex('cell_values').del();
  await knex('user_node_assignments').del();
  await knex('versions').del();
  await knex('time_periods').del();
  await knex('time_config').del();
  await knex('measures').del();
  await knex('hierarchy_nodes').del();
  await knex('hierarchy_levels').del();
  await knex('users').del();

  // ──────────────────────────────────────────────
  // b) Create default admin user
  // ──────────────────────────────────────────────
  const adminPassword = bcrypt.hashSync('admin123', 12);
  const [adminUser] = await knex('users').insert({
    email: 'admin@merchfin.com',
    password: adminPassword,
    name: 'Admin User',
    role: 'admin',
  }).returning('*');

  // ──────────────────────────────────────────────
  // c) Create planner user
  // ──────────────────────────────────────────────
  const plannerPassword = bcrypt.hashSync('planner123', 12);
  const [plannerUser] = await knex('users').insert({
    email: 'planner@merchfin.com',
    password: plannerPassword,
    name: 'Planner User',
    role: 'planner',
  }).returning('*');

  // ──────────────────────────────────────────────
  // d) Create viewer user
  // ──────────────────────────────────────────────
  const viewerPassword = bcrypt.hashSync('viewer123', 12);
  await knex('users').insert({
    email: 'viewer@merchfin.com',
    password: viewerPassword,
    name: 'Viewer User',
    role: 'viewer',
  });

  // ──────────────────────────────────────────────
  // e) Create default version
  // ──────────────────────────────────────────────
  const [version] = await knex('versions').insert({
    name: 'Working Plan',
    is_default: true,
    created_by: adminUser.id,
  }).returning('*');

  // ──────────────────────────────────────────────
  // f) Create hierarchy levels
  // ──────────────────────────────────────────────
  const [deptLevel] = await knex('hierarchy_levels').insert({
    name: 'Department',
    depth: 0,
  }).returning('*');

  const [catLevel] = await knex('hierarchy_levels').insert({
    name: 'Category',
    depth: 1,
  }).returning('*');

  const [subCatLevel] = await knex('hierarchy_levels').insert({
    name: 'Subcategory',
    depth: 2,
  }).returning('*');

  // ──────────────────────────────────────────────
  // g) Create hierarchy nodes (retail hierarchy)
  // ──────────────────────────────────────────────

  // --- Women's Apparel ---
  const [womensApparel] = await knex('hierarchy_nodes').insert({
    name: "Women's Apparel",
    level_id: deptLevel.id,
    parent_id: null,
    sort_order: 1,
  }).returning('*');

  const [womensTops] = await knex('hierarchy_nodes').insert({
    name: 'Tops',
    level_id: catLevel.id,
    parent_id: womensApparel.id,
    sort_order: 1,
  }).returning('*');

  const [tShirts] = await knex('hierarchy_nodes').insert({
    name: 'T-Shirts',
    level_id: subCatLevel.id,
    parent_id: womensTops.id,
    sort_order: 1,
  }).returning('*');

  const [blouses] = await knex('hierarchy_nodes').insert({
    name: 'Blouses',
    level_id: subCatLevel.id,
    parent_id: womensTops.id,
    sort_order: 2,
  }).returning('*');

  const [womensBottoms] = await knex('hierarchy_nodes').insert({
    name: 'Bottoms',
    level_id: catLevel.id,
    parent_id: womensApparel.id,
    sort_order: 2,
  }).returning('*');

  const [jeans] = await knex('hierarchy_nodes').insert({
    name: 'Jeans',
    level_id: subCatLevel.id,
    parent_id: womensBottoms.id,
    sort_order: 1,
  }).returning('*');

  const [skirts] = await knex('hierarchy_nodes').insert({
    name: 'Skirts',
    level_id: subCatLevel.id,
    parent_id: womensBottoms.id,
    sort_order: 2,
  }).returning('*');

  // --- Men's Apparel ---
  const [mensApparel] = await knex('hierarchy_nodes').insert({
    name: "Men's Apparel",
    level_id: deptLevel.id,
    parent_id: null,
    sort_order: 2,
  }).returning('*');

  const [mensShirts] = await knex('hierarchy_nodes').insert({
    name: 'Shirts',
    level_id: catLevel.id,
    parent_id: mensApparel.id,
    sort_order: 1,
  }).returning('*');

  const [dressShirts] = await knex('hierarchy_nodes').insert({
    name: 'Dress Shirts',
    level_id: subCatLevel.id,
    parent_id: mensShirts.id,
    sort_order: 1,
  }).returning('*');

  const [casualShirts] = await knex('hierarchy_nodes').insert({
    name: 'Casual Shirts',
    level_id: subCatLevel.id,
    parent_id: mensShirts.id,
    sort_order: 2,
  }).returning('*');

  const [mensPants] = await knex('hierarchy_nodes').insert({
    name: 'Pants',
    level_id: catLevel.id,
    parent_id: mensApparel.id,
    sort_order: 2,
  }).returning('*');

  const [dressPants] = await knex('hierarchy_nodes').insert({
    name: 'Dress Pants',
    level_id: subCatLevel.id,
    parent_id: mensPants.id,
    sort_order: 1,
  }).returning('*');

  const [casualPants] = await knex('hierarchy_nodes').insert({
    name: 'Casual Pants',
    level_id: subCatLevel.id,
    parent_id: mensPants.id,
    sort_order: 2,
  }).returning('*');

  // ──────────────────────────────────────────────
  // h) Create measures (9 retail measures)
  // ──────────────────────────────────────────────

  // 1. Sales $
  const [salesDollars] = await knex('measures').insert({
    name: 'Sales $',
    short_name: 'sales_dollars',
    data_type: 'currency',
    is_editable: true,
    formula: null,
    aggregation_type: 'SUM',
    weight_measure_id: null,
    sort_order: 1,
    format_pattern: '$#,##0',
  }).returning('*');

  // 2. Sales Units
  const [salesUnits] = await knex('measures').insert({
    name: 'Sales Units',
    short_name: 'sales_units',
    data_type: 'units',
    is_editable: true,
    formula: null,
    aggregation_type: 'SUM',
    weight_measure_id: null,
    sort_order: 2,
    format_pattern: '#,##0',
  }).returning('*');

  // 3. AUR (Average Unit Retail)
  await knex('measures').insert({
    name: 'AUR',
    short_name: 'aur',
    data_type: 'currency',
    is_editable: false,
    formula: 'sales_dollars / sales_units',
    aggregation_type: 'WEIGHTED_AVG',
    weight_measure_id: salesUnits.id,
    sort_order: 3,
    format_pattern: '$#,##0.00',
  });

  // 4. COGS
  const [cogs] = await knex('measures').insert({
    name: 'COGS',
    short_name: 'cogs',
    data_type: 'currency',
    is_editable: true,
    formula: null,
    aggregation_type: 'SUM',
    weight_measure_id: null,
    sort_order: 4,
    format_pattern: '$#,##0',
  }).returning('*');

  // 5. Margin %
  await knex('measures').insert({
    name: 'Margin %',
    short_name: 'margin_pct',
    data_type: 'percentage',
    is_editable: false,
    formula: '(sales_dollars - cogs) / sales_dollars * 100',
    aggregation_type: 'WEIGHTED_AVG',
    weight_measure_id: salesDollars.id,
    sort_order: 5,
    format_pattern: '0.0%',
  });

  // 6. Markdown $
  const [markdownDollars] = await knex('measures').insert({
    name: 'Markdown $',
    short_name: 'markdown_dollars',
    data_type: 'currency',
    is_editable: true,
    formula: null,
    aggregation_type: 'SUM',
    weight_measure_id: null,
    sort_order: 6,
    format_pattern: '$#,##0',
  }).returning('*');

  // 7. Markdown %
  await knex('measures').insert({
    name: 'Markdown %',
    short_name: 'markdown_pct',
    data_type: 'percentage',
    is_editable: false,
    formula: 'markdown_dollars / sales_dollars * 100',
    aggregation_type: 'WEIGHTED_AVG',
    weight_measure_id: salesDollars.id,
    sort_order: 7,
    format_pattern: '0.0%',
  });

  // 8. Inventory Units
  const [inventoryUnits] = await knex('measures').insert({
    name: 'Inventory Units',
    short_name: 'inventory_units',
    data_type: 'units',
    is_editable: true,
    formula: null,
    aggregation_type: 'SUM',
    weight_measure_id: null,
    sort_order: 8,
    format_pattern: '#,##0',
  }).returning('*');

  // 9. Sell-Through %
  await knex('measures').insert({
    name: 'Sell-Through %',
    short_name: 'sell_through_pct',
    data_type: 'percentage',
    is_editable: false,
    formula: 'sales_units / (inventory_units + sales_units) * 100',
    aggregation_type: 'WEIGHTED_AVG',
    weight_measure_id: null,
    sort_order: 9,
    format_pattern: '0.0%',
  });

  // ──────────────────────────────────────────────
  // i) Create time configuration
  // ──────────────────────────────────────────────
  await knex('time_config').insert({
    granularity: 'month',
    fiscal_year_start_month: 1,
  });

  // ──────────────────────────────────────────────
  // j) Create time periods for 2025
  // ──────────────────────────────────────────────

  // Year level (depth 0)
  const [fy2025] = await knex('time_periods').insert({
    label: 'FY 2025',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    parent_id: null,
    depth: 0,
    sort_order: 1,
  }).returning('*');

  // Quarter level (depth 1)
  const [q1] = await knex('time_periods').insert({
    label: 'Q1 2025',
    start_date: '2025-01-01',
    end_date: '2025-03-31',
    parent_id: fy2025.id,
    depth: 1,
    sort_order: 1,
  }).returning('*');

  const [q2] = await knex('time_periods').insert({
    label: 'Q2 2025',
    start_date: '2025-04-01',
    end_date: '2025-06-30',
    parent_id: fy2025.id,
    depth: 1,
    sort_order: 2,
  }).returning('*');

  const [q3] = await knex('time_periods').insert({
    label: 'Q3 2025',
    start_date: '2025-07-01',
    end_date: '2025-09-30',
    parent_id: fy2025.id,
    depth: 1,
    sort_order: 3,
  }).returning('*');

  const [q4] = await knex('time_periods').insert({
    label: 'Q4 2025',
    start_date: '2025-10-01',
    end_date: '2025-12-31',
    parent_id: fy2025.id,
    depth: 1,
    sort_order: 4,
  }).returning('*');

  // Month level (depth 2)
  const monthData = [
    { label: 'Jan 2025', start: '2025-01-01', end: '2025-01-31', parentId: q1.id, sort: 1 },
    { label: 'Feb 2025', start: '2025-02-01', end: '2025-02-28', parentId: q1.id, sort: 2 },
    { label: 'Mar 2025', start: '2025-03-01', end: '2025-03-31', parentId: q1.id, sort: 3 },
    { label: 'Apr 2025', start: '2025-04-01', end: '2025-04-30', parentId: q2.id, sort: 4 },
    { label: 'May 2025', start: '2025-05-01', end: '2025-05-31', parentId: q2.id, sort: 5 },
    { label: 'Jun 2025', start: '2025-06-01', end: '2025-06-30', parentId: q2.id, sort: 6 },
    { label: 'Jul 2025', start: '2025-07-01', end: '2025-07-31', parentId: q3.id, sort: 7 },
    { label: 'Aug 2025', start: '2025-08-01', end: '2025-08-31', parentId: q3.id, sort: 8 },
    { label: 'Sep 2025', start: '2025-09-01', end: '2025-09-30', parentId: q3.id, sort: 9 },
    { label: 'Oct 2025', start: '2025-10-01', end: '2025-10-31', parentId: q4.id, sort: 10 },
    { label: 'Nov 2025', start: '2025-11-01', end: '2025-11-30', parentId: q4.id, sort: 11 },
    { label: 'Dec 2025', start: '2025-12-01', end: '2025-12-31', parentId: q4.id, sort: 12 },
  ];

  const months = {};
  for (const m of monthData) {
    const [inserted] = await knex('time_periods').insert({
      label: m.label,
      start_date: m.start,
      end_date: m.end,
      parent_id: m.parentId,
      depth: 2,
      sort_order: m.sort,
    }).returning('*');
    months[m.label] = inserted;
  }

  // ──────────────────────────────────────────────
  // k) Create sample cell values for leaf nodes
  //    (Jan, Feb, Mar 2025 only)
  // ──────────────────────────────────────────────

  // Leaf subcategory nodes
  const leafNodes = [
    { node: tShirts, label: 'T-Shirts' },
    { node: blouses, label: 'Blouses' },
    { node: jeans, label: 'Jeans' },
    { node: skirts, label: 'Skirts' },
    { node: dressShirts, label: 'Dress Shirts' },
    { node: casualShirts, label: 'Casual Shirts' },
    { node: dressPants, label: 'Dress Pants' },
    { node: casualPants, label: 'Casual Pants' },
  ];

  const targetMonths = [months['Jan 2025'], months['Feb 2025'], months['Mar 2025']];

  // Deterministic seed data: base values per leaf node
  const baseData = {
    'T-Shirts':      { sales: 25000, units: 500, inv: 800 },
    'Blouses':       { sales: 32000, units: 400, inv: 650 },
    'Jeans':         { sales: 45000, units: 600, inv: 1200 },
    'Skirts':        { sales: 18000, units: 300, inv: 500 },
    'Dress Shirts':  { sales: 38000, units: 350, inv: 700 },
    'Casual Shirts': { sales: 22000, units: 450, inv: 900 },
    'Dress Pants':   { sales: 35000, units: 320, inv: 600 },
    'Casual Pants':  { sales: 20000, units: 400, inv: 750 },
  };

  // Monthly multipliers for seasonal variation (deterministic)
  const monthMultipliers = [1.0, 0.9, 1.1]; // Jan, Feb, Mar

  const cellValueRows = [];

  for (const leaf of leafNodes) {
    const base = baseData[leaf.label];

    for (let mi = 0; mi < targetMonths.length; mi++) {
      const month = targetMonths[mi];
      const mult = monthMultipliers[mi];

      const salesVal = Math.round(base.sales * mult);
      const unitsVal = Math.round(base.units * mult);
      const cogsVal = Math.round(salesVal * 0.6);
      const mdVal = Math.round(salesVal * 0.1);
      const invVal = Math.round(base.inv * mult);

      // Sales $
      cellValueRows.push({
        node_id: leaf.node.id,
        measure_id: salesDollars.id,
        time_period_id: month.id,
        value: salesVal,
        version_id: version.id,
        updated_by: adminUser.id,
      });

      // Sales Units
      cellValueRows.push({
        node_id: leaf.node.id,
        measure_id: salesUnits.id,
        time_period_id: month.id,
        value: unitsVal,
        version_id: version.id,
        updated_by: adminUser.id,
      });

      // COGS
      cellValueRows.push({
        node_id: leaf.node.id,
        measure_id: cogs.id,
        time_period_id: month.id,
        value: cogsVal,
        version_id: version.id,
        updated_by: adminUser.id,
      });

      // Markdown $
      cellValueRows.push({
        node_id: leaf.node.id,
        measure_id: markdownDollars.id,
        time_period_id: month.id,
        value: mdVal,
        version_id: version.id,
        updated_by: adminUser.id,
      });

      // Inventory Units
      cellValueRows.push({
        node_id: leaf.node.id,
        measure_id: inventoryUnits.id,
        time_period_id: month.id,
        value: invVal,
        version_id: version.id,
        updated_by: adminUser.id,
      });
    }
  }

  // Batch insert cell values
  await knex.batchInsert('cell_values', cellValueRows, 50);

  // ──────────────────────────────────────────────
  // l) Assign planner to Women's Apparel
  // ──────────────────────────────────────────────
  await knex('user_node_assignments').insert({
    user_id: plannerUser.id,
    node_id: womensApparel.id,
  });
};
