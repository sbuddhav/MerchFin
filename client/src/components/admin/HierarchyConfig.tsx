import React, { useState, useEffect, useCallback } from 'react';
import { hierarchyApi } from '../../api/hierarchy';
import type { HierarchyLevel, HierarchyNode } from '../../types';

/* ─── Hierarchy Config ─── */

const HierarchyConfig: React.FC = () => {
  const [levels, setLevels] = useState<HierarchyLevel[]>([]);
  const [tree, setTree] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Level form
  const [newLevelName, setNewLevelName] = useState('');
  const [editingLevelId, setEditingLevelId] = useState<number | null>(null);
  const [editingLevelName, setEditingLevelName] = useState('');

  // Node form
  const [addingNodeParent, setAddingNodeParent] = useState<{ parentId: number | null; levelId: number } | null>(null);
  const [newNodeName, setNewNodeName] = useState('');
  const [editingNodeId, setEditingNodeId] = useState<number | null>(null);
  const [editingNodeName, setEditingNodeName] = useState('');

  // Expand/collapse state
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [levelsRes, treeRes] = await Promise.all([
        hierarchyApi.getLevels(),
        hierarchyApi.getTree(),
      ]);
      setLevels(levelsRes.data);
      setTree(treeRes.data);
      // Auto-expand top-level nodes
      const topIds = new Set<number>(treeRes.data.map((n: HierarchyNode) => n.id));
      setExpanded(topIds);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load hierarchy data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── Level CRUD ─── */

  const handleAddLevel = async () => {
    if (!newLevelName.trim()) return;
    try {
      const nextDepth = levels.length > 0 ? Math.max(...levels.map((l) => l.depth)) + 1 : 0;
      await hierarchyApi.createLevel(newLevelName.trim(), nextDepth);
      setNewLevelName('');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create level');
    }
  };

  const handleSaveLevel = async (id: number) => {
    if (!editingLevelName.trim()) return;
    try {
      await hierarchyApi.updateLevel(id, editingLevelName.trim());
      setEditingLevelId(null);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update level');
    }
  };

  const handleDeleteLevel = async (id: number) => {
    if (!window.confirm('Delete this level? All associated nodes will also be removed.')) return;
    try {
      await hierarchyApi.deleteLevel(id);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete level');
    }
  };

  /* ─── Node CRUD ─── */

  const handleAddNode = async () => {
    if (!addingNodeParent || !newNodeName.trim()) return;
    try {
      await hierarchyApi.createNode({
        name: newNodeName.trim(),
        level_id: addingNodeParent.levelId,
        parent_id: addingNodeParent.parentId,
      });
      setAddingNodeParent(null);
      setNewNodeName('');
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create node');
    }
  };

  const handleSaveNode = async (id: number) => {
    if (!editingNodeName.trim()) return;
    try {
      await hierarchyApi.updateNode(id, { name: editingNodeName.trim() });
      setEditingNodeId(null);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update node');
    }
  };

  const handleDeleteNode = async (id: number) => {
    if (!window.confirm('Delete this node and all its children?')) return;
    try {
      await hierarchyApi.deleteNode(id);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete node');
    }
  };

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ─── Find the child level for a given node ─── */

  const getChildLevel = (node: HierarchyNode): HierarchyLevel | undefined => {
    const sorted = [...levels].sort((a, b) => a.depth - b.depth);
    const nodeLevel = sorted.find((l) => l.id === node.level_id);
    if (!nodeLevel) return undefined;
    return sorted.find((l) => l.depth === nodeLevel.depth + 1);
  };

  /* ─── Render Tree Recursively ─── */

  const renderNode = (node: HierarchyNode, depth: number): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const childLevel = getChildLevel(node);
    const isEditing = editingNodeId === node.id;

    return (
      <div key={node.id}>
        <div
          style={{
            ...styles.treeRow,
            paddingLeft: 16 + depth * 24,
          }}
        >
          {/* Expand/Collapse toggle */}
          <button
            onClick={() => toggleExpand(node.id)}
            style={{
              ...styles.expandBtn,
              visibility: hasChildren || childLevel ? 'visible' : 'hidden',
            }}
          >
            {isExpanded ? '\u25BC' : '\u25B6'}
          </button>

          {/* Node name or edit input */}
          {isEditing ? (
            <div style={styles.inlineForm}>
              <input
                value={editingNodeName}
                onChange={(e) => setEditingNodeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNode(node.id)}
                style={styles.inlineInput}
                autoFocus
              />
              <button onClick={() => handleSaveNode(node.id)} style={styles.saveBtnSmall}>Save</button>
              <button onClick={() => setEditingNodeId(null)} style={styles.cancelBtnSmall}>Cancel</button>
            </div>
          ) : (
            <>
              <span style={styles.nodeName}>{node.name}</span>
              <span style={styles.nodeLevelTag}>{node.level_name || ''}</span>
              <div style={styles.nodeActions}>
                {childLevel && (
                  <button
                    onClick={() => {
                      setAddingNodeParent({ parentId: node.id, levelId: childLevel.id });
                      setNewNodeName('');
                      if (!isExpanded) toggleExpand(node.id);
                    }}
                    style={styles.actionBtn}
                    title={`Add ${childLevel.name}`}
                  >
                    + Child
                  </button>
                )}
                <button
                  onClick={() => { setEditingNodeId(node.id); setEditingNodeName(node.name); }}
                  style={styles.actionBtn}
                >
                  Edit
                </button>
                <button onClick={() => handleDeleteNode(node.id)} style={styles.actionBtnDanger}>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>

        {/* Inline add child form */}
        {isExpanded && addingNodeParent?.parentId === node.id && (
          <div style={{ ...styles.treeRow, paddingLeft: 16 + (depth + 1) * 24 }}>
            <span style={styles.expandBtn}>{'\u00B7'}</span>
            <div style={styles.inlineForm}>
              <input
                value={newNodeName}
                onChange={(e) => setNewNodeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
                placeholder="New node name"
                style={styles.inlineInput}
                autoFocus
              />
              <button onClick={handleAddNode} style={styles.saveBtnSmall}>Add</button>
              <button onClick={() => setAddingNodeParent(null)} style={styles.cancelBtnSmall}>Cancel</button>
            </div>
          </div>
        )}

        {/* Render children */}
        {isExpanded && hasChildren && node.children!.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (loading) {
    return <div style={styles.page}><p style={styles.loadingText}>Loading hierarchy data...</p></div>;
  }

  return (
    <div style={styles.page}>
      {error && (
        <div style={styles.errorBar}>
          {error}
          <button onClick={() => setError('')} style={styles.errorClose}>&times;</button>
        </div>
      )}

      <div style={styles.columns}>
        {/* ─── LEFT: Levels Panel ─── */}
        <div style={styles.levelsPanel}>
          <h3 style={styles.panelTitle}>Hierarchy Levels</h3>
          <p style={styles.panelDesc}>Define the depth levels of your product/location hierarchy.</p>

          <div style={styles.levelsList}>
            {[...levels].sort((a, b) => a.depth - b.depth).map((level) => (
              <div key={level.id} style={styles.levelRow}>
                <span style={styles.levelDepth}>{level.depth}</span>
                {editingLevelId === level.id ? (
                  <div style={styles.inlineForm}>
                    <input
                      value={editingLevelName}
                      onChange={(e) => setEditingLevelName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveLevel(level.id)}
                      style={styles.inlineInput}
                      autoFocus
                    />
                    <button onClick={() => handleSaveLevel(level.id)} style={styles.saveBtnSmall}>Save</button>
                    <button onClick={() => setEditingLevelId(null)} style={styles.cancelBtnSmall}>Cancel</button>
                  </div>
                ) : (
                  <>
                    <span style={styles.levelName}>{level.name}</span>
                    <div style={styles.levelActions}>
                      <button
                        onClick={() => { setEditingLevelId(level.id); setEditingLevelName(level.name); }}
                        style={styles.actionBtn}
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDeleteLevel(level.id)} style={styles.actionBtnDanger}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add new level */}
          <div style={styles.addLevelForm}>
            <input
              value={newLevelName}
              onChange={(e) => setNewLevelName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddLevel()}
              placeholder="New level name"
              style={styles.input}
            />
            <button onClick={handleAddLevel} style={styles.primaryBtn}>
              Add Level
            </button>
          </div>
        </div>

        {/* ─── RIGHT: Tree Panel ─── */}
        <div style={styles.treePanel}>
          <div style={styles.treePanelHeader}>
            <h3 style={styles.panelTitle}>Hierarchy Tree</h3>
            {levels.length > 0 && (
              <button
                onClick={() => {
                  const topLevel = [...levels].sort((a, b) => a.depth - b.depth)[0];
                  setAddingNodeParent({ parentId: null, levelId: topLevel.id });
                  setNewNodeName('');
                }}
                style={styles.primaryBtn}
              >
                + Root Node
              </button>
            )}
          </div>

          {/* Inline add root node form */}
          {addingNodeParent?.parentId === null && (
            <div style={{ ...styles.treeRow, paddingLeft: 16 }}>
              <span style={styles.expandBtn}>{'\u00B7'}</span>
              <div style={styles.inlineForm}>
                <input
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNode()}
                  placeholder="Root node name"
                  style={styles.inlineInput}
                  autoFocus
                />
                <button onClick={handleAddNode} style={styles.saveBtnSmall}>Add</button>
                <button onClick={() => setAddingNodeParent(null)} style={styles.cancelBtnSmall}>Cancel</button>
              </div>
            </div>
          )}

          <div style={styles.treeContainer}>
            {tree.length === 0 ? (
              <p style={styles.emptyText}>No nodes yet. Add levels first, then create root nodes.</p>
            ) : (
              tree.map((node) => renderNode(node, 0))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingText: { color: '#868e96', fontSize: 14 },
  errorBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    marginBottom: 16,
    background: '#fff5f5',
    border: '1px solid #ffc9c9',
    borderRadius: 6,
    color: '#c92a2a',
    fontSize: 13,
  },
  errorClose: {
    background: 'none',
    border: 'none',
    color: '#c92a2a',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
  },
  columns: {
    display: 'flex',
    gap: 24,
    alignItems: 'flex-start',
  },
  /* Levels panel */
  levelsPanel: {
    width: 320,
    minWidth: 320,
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #dee2e6',
    padding: 20,
  },
  panelTitle: {
    margin: '0 0 4px',
    fontSize: 15,
    fontWeight: 600,
    color: '#212529',
  },
  panelDesc: {
    margin: '0 0 16px',
    fontSize: 12,
    color: '#868e96',
  },
  levelsList: {
    marginBottom: 16,
  },
  levelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid #f1f3f5',
  },
  levelDepth: {
    width: 24,
    height: 24,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    background: '#e9ecef',
    fontSize: 11,
    fontWeight: 600,
    color: '#495057',
    flexShrink: 0,
  },
  levelName: {
    flex: 1,
    fontSize: 13,
    fontWeight: 500,
    color: '#212529',
  },
  levelActions: {
    display: 'flex',
    gap: 4,
  },
  addLevelForm: {
    display: 'flex',
    gap: 8,
  },
  input: {
    flex: 1,
    padding: '7px 10px',
    fontSize: 13,
    border: '1px solid #dee2e6',
    borderRadius: 6,
    outline: 'none',
    color: '#212529',
  },
  primaryBtn: {
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    background: '#4263eb',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  /* Tree panel */
  treePanel: {
    flex: 1,
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #dee2e6',
    padding: 20,
    minHeight: 400,
  },
  treePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  treeContainer: {
    maxHeight: 600,
    overflowY: 'auto',
  },
  treeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 0',
    minHeight: 32,
  },
  expandBtn: {
    width: 20,
    height: 20,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#868e96',
    fontSize: 10,
    flexShrink: 0,
    padding: 0,
  },
  nodeName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#212529',
  },
  nodeLevelTag: {
    fontSize: 10,
    color: '#868e96',
    background: '#f1f3f5',
    padding: '1px 6px',
    borderRadius: 4,
    marginLeft: 4,
  },
  nodeActions: {
    marginLeft: 'auto',
    display: 'flex',
    gap: 4,
  },
  actionBtn: {
    padding: '3px 8px',
    fontSize: 11,
    color: '#495057',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: 4,
    cursor: 'pointer',
  },
  actionBtnDanger: {
    padding: '3px 8px',
    fontSize: 11,
    color: '#c92a2a',
    background: '#fff5f5',
    border: '1px solid #ffc9c9',
    borderRadius: 4,
    cursor: 'pointer',
  },
  inlineForm: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  inlineInput: {
    flex: 1,
    padding: '5px 8px',
    fontSize: 13,
    border: '1px solid #4263eb',
    borderRadius: 4,
    outline: 'none',
    color: '#212529',
    maxWidth: 200,
  },
  saveBtnSmall: {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
    background: '#4263eb',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
  cancelBtnSmall: {
    padding: '4px 10px',
    fontSize: 11,
    color: '#495057',
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: 4,
    cursor: 'pointer',
  },
  emptyText: {
    fontSize: 13,
    color: '#868e96',
    textAlign: 'center',
    padding: '40px 0',
  },
};

export default HierarchyConfig;
