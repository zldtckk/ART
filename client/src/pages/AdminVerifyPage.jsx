import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function AdminVerifyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState('verify'); // 'verify' | 'studios'
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  // 画室管理
  const [studios, setStudios] = useState([]);
  const [newName, setNewName] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'circle_master')) {
      navigate(user ? '/' : '/login');
      return;
    }
    loadPending();
    loadStudios();
  }, [user]);

  const loadPending = async () => {
    try {
      const res = await api.get('/auth/pending-verifications');
      setPending(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudios = async () => {
    try {
      const res = await api.get('/auth/studios');
      setStudios(res.data.studios);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReview = async (userId, action) => {
    try {
      await api.post(`/auth/review/${userId}`, { action });
      setPending((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err.response?.data?.error || '操作失败');
    }
  };

  const handleAddStudio = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.post('/studios', { name: newName.trim(), district: newDistrict.trim() });
      setNewName('');
      setNewDistrict('');
      loadStudios();
    } catch (err) {
      alert(err.response?.data?.error || '添加失败');
    } finally {
      setAdding(false);
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <span className="header-title">管理后台</span>
        <div />
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)' }}>
        <button
          onClick={() => setTab('verify')}
          style={{
            flex: 1, padding: '12px', fontSize: 14, fontWeight: 600, border: 'none',
            background: 'none', cursor: 'pointer',
            color: tab === 'verify' ? 'var(--accent)' : 'var(--text-tertiary)',
            borderBottom: tab === 'verify' ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          认证审核 ({pending.length})
        </button>
        <button
          onClick={() => setTab('studios')}
          style={{
            flex: 1, padding: '12px', fontSize: 14, fontWeight: 600, border: 'none',
            background: 'none', cursor: 'pointer',
            color: tab === 'studios' ? 'var(--accent)' : 'var(--text-tertiary)',
            borderBottom: tab === 'studios' ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s',
          }}
        >
          画室管理 ({studios.length})
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {tab === 'verify' && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              待审核认证 ({pending.length})
            </h2>

            {loading ? (
              <div className="loading-spinner" />
            ) : pending.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3>没有待审核的申请</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pending.map((u) => (
                  <div key={u.id} style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{u.real_name || u.nickname}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                          昵称：{u.nickname}{u.username ? ` (@${u.username})` : ''}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {u.studio_name} · {u.class_name || '未填班级'}
                        </div>
                        {u.student_id_url && (
                          <img
                            src={u.student_id_url}
                            alt="学生证"
                            style={{ marginTop: 8, borderRadius: 6, maxHeight: 100, objectFit: 'cover', background: 'var(--border)', cursor: 'pointer' }}
                            onClick={() => window.open(u.student_id_url, '_blank')}
                          />
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-primary"
                          style={{ padding: '6px 14px', fontSize: 13 }}
                          onClick={() => handleReview(u.id, 'approve')}
                        >
                          通过
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 14px', fontSize: 13 }}
                          onClick={() => handleReview(u.id, 'reject')}
                        >
                          拒绝
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'studios' && (
          <>
            {/* 添加画室 */}
            <div style={{ background: '#fff', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>添加画室</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder="画室名称"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={20}
                />
                <input
                  className="form-input"
                  type="text"
                  placeholder="所在区域（如：转塘、银湖）"
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  maxLength={10}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddStudio}
                  disabled={!newName.trim() || adding}
                  style={{ opacity: newName.trim() && !adding ? 1 : 0.5 }}
                >
                  {adding ? '添加中...' : '添加画室'}
                </button>
              </div>
            </div>

            {/* 画室列表 */}
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>已有画室</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {studios.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: '#fff', borderRadius: 'var(--radius-sm)', padding: '12px 16px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 14,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 500 }}>{s.name}</span>
                    <span style={{ color: 'var(--text-tertiary)', marginLeft: 8, fontSize: 12 }}>
                      {s.district}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    ID: {s.id}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
