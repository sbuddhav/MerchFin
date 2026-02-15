import React, { useState, useEffect, useCallback } from 'react';
import { usersApi } from '../../api/users';
import { hierarchyApi } from '../../api/hierarchy';
import type { User, HierarchyNode } from '../../types';

interface UserWithAssignments extends User {
  assigned_node_ids?: number[];
}

interface UserForm {
  email: string;
  name: string;
  password: string;
  role: 'admin' | 'planner' | 'viewer';
}

const emptyForm: UserForm = { email: '', name: '', password: '', role: 'planner' };

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserWithAssignments[]>([]);
  const [tree, setTree] = useState<HierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<UserForm>({ ...emptyForm });

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'planner' | 'viewer'>('planner');

  // Assignments
  const [assigningUserId, setAssigningUserId] = useState<number | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, treeRes] = await Promise.all([
        usersApi.getAll(),
        hierarchyApi.getTree(),
      ]);
      setUsers(usersRes.data);
      setTree(treeRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddUser = async () => {
    if (!addForm.email.trim() || !addForm.name.trim() || !addForm.password.trim()) {
      setError('All fields are required');
      return;
    }
    try {
      setError('');
      await usersApi.create({
        email: addForm.email.trim(),
        name: addForm.name.trim(),
        password: addForm.password.trim(),
        role: addForm.role,
      });
      setAddForm({ ...emptyForm });
      setShowAddForm(false);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create user');
    }
  };

  const handleSaveEdit = async (id: number) => {
    try {
      setError('');
      await usersApi.update(id, { name: editName, role: editRole });
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    try {
      await usersApi.delete(id);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete user');
    }
  };

  const startAssignment = (user: UserWithAssignments) => {
    setAssigningUserId(user.id);
    setSelectedNodes(new Set(user.assigned_node_ids || []));
  };

  const handleSaveAssignments = async () => {
    if (assigningUserId === null) return;
    try {
      setError('');
      await usersApi.updateAssignments(assigningUserId, Array.from(selectedNodes));
      setAssigningUserId(null);
      fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update assignments');
    }
  };

  const toggleNodeSelection = (id: number) => {
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNodeCheckbox = (node: HierarchyNode, depth: number): React.ReactNode => {
    return (
      <div key={node.id}>
        <label style={{ ...styles.checkboxRow, paddingLeft: 8 + depth * 22 }}>
          <input
            type="checkbox"
            checked={selectedNodes.has(node.id)}
            onChange={() => toggleNodeSelection(node.id)}
            style={styles.checkbox}
          />
          <span style={styles.checkboxLabel}>{node.name}</span>
          {node.level_name && <span style={styles.checkboxLevelTag}>{node.level_name}</span>}
        </label>
        {node.children && node.children.map((child) => renderNodeCheckbox(child, depth + 1))}
      </div>
    );
  };

  const roleBadgeColor: Record<string, string> = {
    admin: '#4263eb',
    planner: '#37b24d',
    viewer: '#868e96',
  };

  if (loading) {
    return <div style={styles.page}><p style={styles.loadingText}>Loading users...</p></div>;
  }

  return (
    <div style={styles.page}>
      {error && (
        <div style={styles.errorBar}>
          {error}
          <button onClick={() => setError('')} style={styles.errorClose}>&times;</button>
        </div>
      )}

      {/* ─── Users Table ─── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h3 style={styles.cardTitle}>Users</h3>
            <p style={styles.cardDesc}>Manage user accounts and their roles.</p>
          </div>
          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)} style={styles.primaryBtn}>
              + Add User
            </button>
          )}
        </div>

        {/* Add User Form */}
        {showAddForm && (
          <div style={styles.addFormContainer}>
            <h4 style={styles.addFormTitle}>New User</h4>
            <div style={styles.addFormGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Name</label>
                <input
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@company.com"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  value={addForm.password}
                  onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 6 characters"
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value as any }))}
                  style={styles.select}
                >
                  <option value="admin">Admin</option>
                  <option value="planner">Planner</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
            </div>
            <div style={styles.addFormActions}>
              <button onClick={handleAddUser} style={styles.primaryBtn}>Create User</button>
              <button onClick={() => { setShowAddForm(false); setAddForm({ ...emptyForm }); }} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={{ ...styles.th, width: 200 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) =>
                editingId === u.id ? (
                  <tr key={u.id}>
                    <td style={styles.td}>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={styles.cellInput}
                      />
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 13, color: '#495057' }}>{u.email}</span>
                    </td>
                    <td style={styles.td}>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        style={styles.cellSelect}
                      >
                        <option value="admin">Admin</option>
                        <option value="planner">Planner</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => handleSaveEdit(u.id)} style={styles.saveBtnSmall}>Save</button>
                        <button onClick={() => setEditingId(null)} style={styles.cancelBtnSmall}>Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.id}>
                    <td style={styles.td}>
                      <span style={{ fontWeight: 500, color: '#212529', fontSize: 13 }}>{u.name}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ fontSize: 13, color: '#495057' }}>{u.email}</span>
                    </td>
                    <td style={styles.td}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#fff',
                          padding: '2px 10px',
                          borderRadius: 10,
                          background: roleBadgeColor[u.role] || '#868e96',
                          textTransform: 'uppercase' as const,
                          letterSpacing: '0.5px',
                        }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => { setEditingId(u.id); setEditName(u.name); setEditRole(u.role); }}
                          style={styles.actionBtn}
                        >
                          Edit
                        </button>
                        {u.role === 'planner' && (
                          <button onClick={() => startAssignment(u)} style={styles.actionBtnAssign}>
                            Assign Nodes
                          </button>
                        )}
                        <button onClick={() => handleDelete(u.id)} style={styles.actionBtnDanger}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>

          {users.length === 0 && (
            <p style={styles.emptyText}>No users found.</p>
          )}
        </div>
      </div>

      {/* ─── Node Assignment Modal ─── */}
      {assigningUserId !== null && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              Assign Hierarchy Nodes
              <span style={styles.modalSubtitle}>
                {users.find((u) => u.id === assigningUserId)?.name || ''}
              </span>
            </h3>
            <p style={styles.cardDesc}>Select which hierarchy nodes this planner can access.</p>

            <div style={styles.nodeTree}>
              {tree.length === 0 ? (
                <p style={styles.emptyText}>No hierarchy nodes available.</p>
              ) : (
                tree.map((node) => renderNodeCheckbox(node, 0))
              )}
            </div>

            <div style={styles.modalActions}>
              <button onClick={handleSaveAssignments} style={styles.primaryBtn}>
                Save Assignments
              </button>
              <button onClick={() => setAssigningUserId(null)} style={styles.cancelBtn}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  loadingText: { color: '#868e96', fontSize: 14 },
  errorBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', marginBottom: 16, background: '#fff5f5',
    border: '1px solid #ffc9c9', borderRadius: 6, color: '#c92a2a', fontSize: 13,
  },
  errorClose: {
    background: 'none', border: 'none', color: '#c92a2a', fontSize: 18, cursor: 'pointer', padding: '0 4px',
  },
  card: {
    background: '#fff',
    borderRadius: 8,
    border: '1px solid #dee2e6',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '20px 24px 16px',
  },
  cardTitle: { margin: 0, fontSize: 15, fontWeight: 600, color: '#212529' },
  cardDesc: { margin: '4px 0 0', fontSize: 12, color: '#868e96' },
  primaryBtn: {
    padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#fff',
    background: '#4263eb', border: 'none', borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  cancelBtn: {
    padding: '8px 16px', fontSize: 12, fontWeight: 500, color: '#495057',
    background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6, cursor: 'pointer',
  },
  /* Add form */
  addFormContainer: {
    padding: '0 24px 20px',
    borderBottom: '1px solid #dee2e6',
    background: '#f8f9fa',
    margin: '0 0 0',
    paddingTop: 16,
  },
  addFormTitle: { margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#212529' },
  addFormGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16,
  },
  addFormActions: {
    display: 'flex', gap: 8,
  },
  field: {},
  label: {
    display: 'block', marginBottom: 4, fontSize: 12, fontWeight: 500, color: '#495057',
  },
  input: {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #dee2e6', borderRadius: 6, outline: 'none',
    color: '#212529', boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%', padding: '7px 10px', fontSize: 13,
    border: '1px solid #dee2e6', borderRadius: 6, outline: 'none',
    color: '#212529', background: '#fff', boxSizing: 'border-box' as const,
  },
  /* Table */
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#868e96',
    textAlign: 'left', textTransform: 'uppercase' as const, letterSpacing: '0.5px',
    background: '#f8f9fa', borderTop: '1px solid #dee2e6', borderBottom: '1px solid #dee2e6',
  },
  td: {
    padding: '10px 14px', fontSize: 13, color: '#495057',
    borderBottom: '1px solid #f1f3f5', verticalAlign: 'middle',
  },
  cellInput: {
    width: '100%', padding: '5px 8px', fontSize: 13,
    border: '1px solid #4263eb', borderRadius: 4, outline: 'none', color: '#212529',
    boxSizing: 'border-box' as const,
  },
  cellSelect: {
    padding: '5px 8px', fontSize: 12, border: '1px solid #4263eb',
    borderRadius: 4, outline: 'none', color: '#212529', background: '#fff',
  },
  actionBtn: {
    padding: '4px 8px', fontSize: 11, color: '#495057', background: '#f8f9fa',
    border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer',
  },
  actionBtnAssign: {
    padding: '4px 8px', fontSize: 11, color: '#4263eb', background: '#edf2ff',
    border: '1px solid #bac8ff', borderRadius: 4, cursor: 'pointer', fontWeight: 500,
  },
  actionBtnDanger: {
    padding: '4px 8px', fontSize: 11, color: '#c92a2a', background: '#fff5f5',
    border: '1px solid #ffc9c9', borderRadius: 4, cursor: 'pointer',
  },
  saveBtnSmall: {
    padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#fff',
    background: '#4263eb', border: 'none', borderRadius: 4, cursor: 'pointer',
  },
  cancelBtnSmall: {
    padding: '4px 10px', fontSize: 11, color: '#495057', background: '#f8f9fa',
    border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer',
  },
  emptyText: {
    fontSize: 13, color: '#868e96', textAlign: 'center', padding: '40px 0',
  },
  /* Modal */
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modal: {
    width: 500, maxHeight: '80vh', background: '#fff', borderRadius: 10,
    padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    display: 'flex', flexDirection: 'column',
  },
  modalTitle: {
    margin: 0, fontSize: 16, fontWeight: 600, color: '#212529',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  modalSubtitle: {
    fontSize: 13, fontWeight: 400, color: '#868e96',
  },
  nodeTree: {
    flex: 1, overflowY: 'auto', maxHeight: 400,
    margin: '16px 0', padding: '8px 0',
    border: '1px solid #e9ecef', borderRadius: 6, background: '#f8f9fa',
  },
  checkboxRow: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '5px 0', cursor: 'pointer', fontSize: 13,
  },
  checkbox: {
    cursor: 'pointer', accentColor: '#4263eb',
  },
  checkboxLabel: {
    color: '#212529', fontWeight: 500,
  },
  checkboxLevelTag: {
    fontSize: 10, color: '#868e96', background: '#e9ecef',
    padding: '1px 6px', borderRadius: 4,
  },
  modalActions: {
    display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 8,
  },
};

export default UserManagement;
