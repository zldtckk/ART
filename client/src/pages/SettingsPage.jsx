import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post('/upload/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAvatar(res.data.avatar_url);
      // 更新全局 user 状态
      const userRes = await api.get('/auth/me');
      updateUser(userRes.data.user);
    } catch (err) {
      alert(err.response?.data?.error || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { nickname: nickname.trim(), phone: phone.trim() });
      updateUser(res.data.user);
      alert('保存成功');
    } catch (err) {
      alert(err.response?.data?.error || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="page">
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <span className="header-title">设置</span>
        <button className="header-action" onClick={handleSave} disabled={saving}>
          {saving ? '保存中' : '保存'}
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* 头像 */}
        <div
          onClick={() => fileInput.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '16px', background: '#fff', borderRadius: 'var(--radius-md)',
            marginBottom: 12, cursor: 'pointer',
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--border)', overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {avatar ? (
              <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
            {uploading && <div className="loading-spinner" style={{ position: 'absolute', padding: 0 }} />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{user.nickname}</div>
            <div style={{ fontSize: 13, color: 'var(--accent)', marginTop: 2 }}>
              {uploading ? '上传中...' : '点击更换头像'}
            </div>
          </div>
          <input ref={fileInput} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>

        {/* 表单 */}
        <div style={{
          background: '#fff', borderRadius: 'var(--radius-md)', overflow: 'hidden',
          marginBottom: 12,
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>昵称</label>
            <input className="form-input" style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 16, width: '100%' }}
              value={nickname} onChange={e => setNickname(e.target.value)} maxLength={12} />
          </div>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>手机号</label>
            <input className="form-input" style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', fontSize: 16, width: '100%' }}
              value={phone} onChange={e => setPhone(e.target.value)} placeholder="绑定手机号" maxLength={11} />
          </div>
          <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15 }}>机构认证</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{user.studio_name || '未认证画室'}</div>
            </div>
            <span style={{
              fontSize: 12, padding: '2px 10px', borderRadius: 10,
              background: user.verification_status === 'approved' ? 'rgba(52,199,89,0.1)' : 'rgba(255,149,0,0.1)',
              color: user.verification_status === 'approved' ? 'var(--success)' : 'var(--warning)', fontWeight: 500,
            }}>
              {user.verification_status === 'approved' ? '已认证' : user.verification_status === 'pending' ? '审核中' : '未认证'}
            </span>
          </div>
        </div>

        {/* 数字ID */}
        <div style={{
          background: '#fff', borderRadius: 'var(--radius-md)', padding: '16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
        }}>
          <div>
            <div style={{ fontSize: 15 }}>数字 ID</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>你的唯一身份标识</div>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            {String(user.id).padStart(6, '0')}
          </span>
        </div>

        {user.verification_status !== 'approved' && (
          <button className="btn btn-primary btn-block" onClick={() => navigate('/verify')}>
            {user.verification_status === 'pending' ? '查看审核状态' : '去认证'}
          </button>
        )}
      </div>
    </div>
  );
}
