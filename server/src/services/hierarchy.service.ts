import db from '../config/database';
import { HierarchyLevel, HierarchyNode } from '../types/index';

export class HierarchyService {
  // ──────────────────────────────────────────────
  //  Hierarchy Levels
  // ──────────────────────────────────────────────

  /**
   * Retrieve all hierarchy levels ordered by depth (ascending).
   */
  async getLevels(): Promise<HierarchyLevel[]> {
    return db<HierarchyLevel>('hierarchy_levels').orderBy('depth', 'asc');
  }

  /**
   * Create a new hierarchy level at the given depth.
   */
  async createLevel(name: string, depth: number): Promise<HierarchyLevel> {
    const [level] = await db<HierarchyLevel>('hierarchy_levels')
      .insert({ name, depth })
      .returning('*');
    return level;
  }

  /**
   * Update the name of an existing hierarchy level.
   */
  async updateLevel(id: number, name: string): Promise<HierarchyLevel> {
    const [level] = await db<HierarchyLevel>('hierarchy_levels')
      .where({ id })
      .update({ name })
      .returning('*');

    if (!level) {
      throw new Error(`Hierarchy level with id ${id} not found`);
    }

    return level;
  }

  /**
   * Delete a hierarchy level by id.
   * Fails if any nodes still reference this level.
   */
  async deleteLevel(id: number): Promise<void> {
    const nodesUsingLevel = await db<HierarchyNode>('hierarchy_nodes')
      .where({ level_id: id })
      .first();

    if (nodesUsingLevel) {
      throw new Error(
        'Cannot delete level: one or more nodes still reference it'
      );
    }

    const deleted = await db<HierarchyLevel>('hierarchy_levels')
      .where({ id })
      .del();

    if (!deleted) {
      throw new Error(`Hierarchy level with id ${id} not found`);
    }
  }

  // ──────────────────────────────────────────────
  //  Hierarchy Nodes
  // ──────────────────────────────────────────────

  /**
   * Build the full hierarchy tree using a recursive CTE.
   * Returns a nested array of root nodes, each with a `children` array.
   */
  async getTree(): Promise<HierarchyNode[]> {
    const rows = await db.raw(`
      WITH RECURSIVE tree AS (
        SELECT
          n.id,
          n.name,
          n.level_id,
          n.parent_id,
          n.sort_order,
          n.created_at,
          n.updated_at,
          l.name AS level_name,
          0    AS tree_depth
        FROM hierarchy_nodes n
        JOIN hierarchy_levels l ON l.id = n.level_id
        WHERE n.parent_id IS NULL

        UNION ALL

        SELECT
          child.id,
          child.name,
          child.level_id,
          child.parent_id,
          child.sort_order,
          child.created_at,
          child.updated_at,
          l.name AS level_name,
          t.tree_depth + 1
        FROM hierarchy_nodes child
        JOIN hierarchy_levels l ON l.id = child.level_id
        JOIN tree t ON t.id = child.parent_id
      )
      SELECT * FROM tree
      ORDER BY tree_depth, sort_order, name
    `);

    return this.buildNestedTree(rows.rows);
  }

  /**
   * Get the subtree rooted at a specific node (inclusive).
   */
  async getSubtree(nodeId: number): Promise<HierarchyNode | null> {
    const rows = await db.raw(
      `
      WITH RECURSIVE subtree AS (
        SELECT
          n.id,
          n.name,
          n.level_id,
          n.parent_id,
          n.sort_order,
          n.created_at,
          n.updated_at,
          l.name AS level_name,
          0    AS tree_depth
        FROM hierarchy_nodes n
        JOIN hierarchy_levels l ON l.id = n.level_id
        WHERE n.id = ?

        UNION ALL

        SELECT
          child.id,
          child.name,
          child.level_id,
          child.parent_id,
          child.sort_order,
          child.created_at,
          child.updated_at,
          l.name AS level_name,
          s.tree_depth + 1
        FROM hierarchy_nodes child
        JOIN hierarchy_levels l ON l.id = child.level_id
        JOIN subtree s ON s.id = child.parent_id
      )
      SELECT * FROM subtree
      ORDER BY tree_depth, sort_order, name
    `,
      [nodeId]
    );

    if (rows.rows.length === 0) return null;

    const tree = this.buildNestedTree(rows.rows);
    return tree[0] || null;
  }

  /**
   * Create a new hierarchy node.
   */
  async createNode(
    name: string,
    levelId: number,
    parentId: number | null,
    sortOrder: number = 0
  ): Promise<HierarchyNode> {
    // Validate that the level exists
    const level = await db<HierarchyLevel>('hierarchy_levels')
      .where({ id: levelId })
      .first();

    if (!level) {
      throw new Error(`Hierarchy level with id ${levelId} not found`);
    }

    // Validate parent exists (if provided)
    if (parentId !== null) {
      const parent = await db<HierarchyNode>('hierarchy_nodes')
        .where({ id: parentId })
        .first();

      if (!parent) {
        throw new Error(`Parent node with id ${parentId} not found`);
      }
    }

    const [node] = await db<HierarchyNode>('hierarchy_nodes')
      .insert({
        name,
        level_id: levelId,
        parent_id: parentId,
        sort_order: sortOrder,
      })
      .returning('*');

    return node;
  }

  /**
   * Update a hierarchy node's name and/or sort order.
   */
  async updateNode(
    id: number,
    name: string,
    sortOrder?: number
  ): Promise<HierarchyNode> {
    const updateData: Partial<HierarchyNode> = { name };
    if (sortOrder !== undefined) {
      updateData.sort_order = sortOrder;
    }

    const [node] = await db<HierarchyNode>('hierarchy_nodes')
      .where({ id })
      .update(updateData)
      .returning('*');

    if (!node) {
      throw new Error(`Hierarchy node with id ${id} not found`);
    }

    return node;
  }

  /**
   * Delete a node and all of its descendants.
   * Uses a recursive CTE to find all descendant ids, then deletes them
   * along with their associated cell values.
   */
  async deleteNode(id: number): Promise<void> {
    const node = await db<HierarchyNode>('hierarchy_nodes')
      .where({ id })
      .first();

    if (!node) {
      throw new Error(`Hierarchy node with id ${id} not found`);
    }

    // Collect all descendant ids via recursive CTE
    const result = await db.raw(
      `
      WITH RECURSIVE descendants AS (
        SELECT id FROM hierarchy_nodes WHERE id = ?
        UNION ALL
        SELECT n.id
        FROM hierarchy_nodes n
        JOIN descendants d ON d.id = n.parent_id
      )
      SELECT id FROM descendants
    `,
      [id]
    );

    const idsToDelete: number[] = result.rows.map(
      (row: { id: number }) => row.id
    );

    await db.transaction(async (trx) => {
      // Remove cell values for all nodes being deleted
      await trx('cell_values').whereIn('node_id', idsToDelete).del();

      // Delete nodes from deepest to shallowest to satisfy FK constraints
      // Reverse order ensures children are removed before parents
      await trx('hierarchy_nodes').whereIn('id', idsToDelete).del();
    });
  }

  // ──────────────────────────────────────────────
  //  Private helpers
  // ──────────────────────────────────────────────

  /**
   * Convert a flat list of rows (with parent_id) into a nested tree structure.
   */
  private buildNestedTree(rows: any[]): HierarchyNode[] {
    const nodeMap = new Map<number, HierarchyNode>();
    const roots: HierarchyNode[] = [];

    // First pass: create a map of all nodes
    for (const row of rows) {
      nodeMap.set(row.id, {
        id: row.id,
        name: row.name,
        level_id: row.level_id,
        parent_id: row.parent_id,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        level_name: row.level_name,
        children: [],
      });
    }

    // Second pass: wire up parent → child relationships
    for (const row of rows) {
      const node = nodeMap.get(row.id)!;
      if (row.parent_id === null || !nodeMap.has(row.parent_id)) {
        roots.push(node);
      } else {
        const parent = nodeMap.get(row.parent_id)!;
        parent.children!.push(node);
      }
    }

    return roots;
  }
}

export const hierarchyService = new HierarchyService();
