import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import InsightsPanel from '../components/InsightsPanel';
import '../styles/admin.css';

const ROLE_BADGES = {
  super_admin: { label: 'Super Admin', className: 'badge-super' },
  admin: { label: 'Admin', className: 'badge-admin' },
  intern: { label: 'Intern', className: 'badge-intern' },
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [promoteModal, setPromoteModal] = useState(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);
  useEffect(() => { const d = setTimeout(() => fetchUsers(1), 300); return () => clearTimeout(d); }, [search, roleFilter]);

  const handlePromote = async (userId) => {
    setActionLoading(userId);
    try {
      const { data } = await api.patch(`/admin/users/${userId}/promote`);
      toast.success(data.message);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: 'admin' } : u));
      setPromoteModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Promotion failed');
    } finally { setActionLoading(null); }
  };

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(userId);
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(data.message);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Role update failed');
    } finally { setActionLoading(null); }
  };

  const handleDelete = async (userId) => {
    setActionLoading(userId);
    try {
      const { data } = await api.delete(`/admin/users/${userId}`);
      toast.success(data.message);
      setUsers(prev => prev.filter(u => u._id !== userId));
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally { setActionLoading(null); }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
    toast.success('Logged out');
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>FAQ Admin</span>
        </div>
        <nav className="sidebar-nav">
          <a className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Users
          </a>
          <a className={`nav-item ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Insights
          </a>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className={`role-badge ${ROLE_BADGES[user?.role]?.className}`}>{ROLE_BADGES[user?.role]?.label}</span>
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {activeTab === 'users' ? (
          <>
            <header className="admin-header">
              <h1>User Management</h1>
              <div className="admin-header-actions">
                <select className="filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                  <option value="">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="intern">Intern</option>
                </select>
                <div className="search-wrapper">
                  <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
                </div>
              </div>
            </header>

            <div className="users-table-wrapper">
              {loading ? (
                <div className="table-skeleton">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="skeleton-row">
                      <div className="skeleton-cell skeleton-avatar" />
                      <div className="skeleton-cell skeleton-name" />
                      <div className="skeleton-cell skeleton-email" />
                      <div className="skeleton-cell skeleton-role" />
                      <div className="skeleton-cell skeleton-actions" />
                    </div>
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="empty-state">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <h3>No users found</h3>
                  <p>Try adjusting your search or filter</p>
                </div>
              ) : (
                <table className="users-table">
                  <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map(u => {
                      const badge = ROLE_BADGES[u.role] || ROLE_BADGES.intern;
                      const isSelf = u._id === user?._id;
                      const isSuperTarget = u.role === 'super_admin';
                      return (
                        <tr key={u._id} className={isSelf ? 'row-self' : ''}>
                          <td className="cell-user">
                            <div className="user-avatar-sm">{u.name?.charAt(0)?.toUpperCase()}</div>
                            <span>{u.name}</span>
                            {isSelf && <span className="self-tag">You</span>}
                          </td>
                          <td className="cell-email">{u.email}</td>
                          <td>
                            {isSuperAdmin && !isSelf ? (
                              <select className={`role-select ${badge.className}`} value={u.role}
                                onChange={(e) => handleRoleChange(u._id, e.target.value)} disabled={actionLoading === u._id}>
                                <option value="intern">Intern</option>
                                <option value="admin">Admin</option>
                                {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                              </select>
                            ) : (
                              <span className={`role-badge ${badge.className}`}>{badge.label}</span>
                            )}
                          </td>
                          <td className="cell-date">{new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                          <td className="cell-actions">
                            {u.role === 'intern' && !isSelf && (
                              <button className="action-btn promote-btn" onClick={() => setPromoteModal(u)} disabled={actionLoading === u._id} title="Promote to Admin">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                Promote
                              </button>
                            )}
                            {isSuperAdmin && !isSelf && !isSuperTarget && (
                              <button className="action-btn delete-btn" onClick={() => setConfirmDelete(u)} disabled={actionLoading === u._id} title="Delete user">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                            {isSelf && <span className="no-action">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {pagination.pages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)}>Previous</button>
                <span className="page-info">Page {pagination.page} of {pagination.pages}</span>
                <button className="page-btn" disabled={pagination.page >= pagination.pages} onClick={() => fetchUsers(pagination.page + 1)}>Next</button>
              </div>
            )}

            {promoteModal && (
              <div className="modal-overlay" onClick={() => setPromoteModal(null)}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                  <div className="modal-header"><h3>Promote to Admin</h3><button className="modal-close" onClick={() => setPromoteModal(null)}>&times;</button></div>
                  <div className="modal-body">
                    <p>Are you sure you want to promote <strong>{promoteModal.name}</strong> to <strong>Admin</strong>?</p>
                    <p className="modal-hint">They will gain access to manage FAQs, categories, and users.</p>
                  </div>
                  <div className="modal-footer">
                    <button className="btn-cancel" onClick={() => setPromoteModal(null)}>Cancel</button>
                    <button className="btn-confirm" onClick={() => handlePromote(promoteModal._id)} disabled={actionLoading === promoteModal._id}>
                      {actionLoading === promoteModal._id ? 'Promoting...' : 'Promote to Admin'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {confirmDelete && (
              <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
                <div className="modal modal-danger" onClick={e => e.stopPropagation()}>
                  <div className="modal-header"><h3>Delete User</h3><button className="modal-close" onClick={() => setConfirmDelete(null)}>&times;</button></div>
                  <div className="modal-body">
                    <p>Are you sure you want to delete <strong>{confirmDelete.name}</strong>?</p>
                    <p className="modal-hint">This action cannot be undone.</p>
                  </div>
                  <div className="modal-footer">
                    <button className="btn-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
                    <button className="btn-danger" onClick={() => handleDelete(confirmDelete._id)} disabled={actionLoading === confirmDelete._id}>
                      {actionLoading === confirmDelete._id ? 'Deleting...' : 'Delete User'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <InsightsPanel />
        )}
      </main>
    </div>
  );
}
