import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function VerifyPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [studios, setStudios] = useState([]);
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [realName, setRealName] = useState('');
  const [className, setClassName] = useState('');
  const [studentIdUrl, setStudentIdUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [master, setMaster] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/auth/studios').then((res) => setStudios(res.data.studios)).catch(console.error);
    api.get('/auth/circle-master').then((res) => setMaster(res.data.master)).catch(console.error);
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.post('/upload/student-id', form);
      setStudentIdUrl(res.data.url);
    } catch (err) {
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudio || !realName.trim() || !studentIdUrl) return;
    setSubmitting(true);
    try {
      const res = await api.post('/auth/verify', {
        real_name: realName.trim(),
        class_name: className.trim(),
        student_id_url: studentIdUrl,
        studio_id: selectedStudio,
      });
      updateUser(res.data.user);
      setSubmitted(true);
    } catch (err) {
      alert(err.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const startChatWithMaster = async () => {
    if (!master) return;
    try {
      const res = await api.post('/messages/conversations', { peer_id: master.id });
      navigate('/messages', { state: { openConvId: res.data.conversation.id } });
    } catch (err) {
      alert('无法发起私信');
    }
  };

  const status = user?.verification_status;

  if (status === 'approved') {
    return (
      <div>
        <div className="header">
          <button className="back-btn" onClick={() => navigate(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回
          </button>
        </div>
        <div style={{ padding: '60px 16px', textAlign: 'center' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" width="48" height="48">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <h3 style={{ marginTop: 12, fontSize: 18 }}>已通过认证</h3>
          <p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 14 }}>你可以发帖、评论、点赞了</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
      </div>

      <div style={{ padding: '24px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>画室认证</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 32 }}>
          选择画室，填写信息并上传校园卡照片，由圈主人工审核
        </p>

        <div style={{
          background: '#fff',
          borderRadius: 'var(--radius-md)',
          padding: 24,
          marginBottom: 24,
        }}>
          {status === 'pending' || submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" width="40" height="40">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <h3 style={{ marginTop: 12, fontSize: 17 }}>审核中</h3>
              <p style={{ marginTop: 4, color: 'var(--text-secondary)', fontSize: 14 }}>
                你的认证申请已提交，请耐心等待圈主审核
              </p>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">画室</label>
                <select
                  className="form-input"
                  value={selectedStudio || ''}
                  onChange={(e) => setSelectedStudio(parseInt(e.target.value))}
                  style={{ appearance: 'auto' }}
                >
                  <option value="">选择你的画室</option>
                  {studios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} · {s.district}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedStudio && master && (
                <div style={{
                  background: 'var(--bg)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 16,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    你的画室不在列表中？
                  </span>
                  <button
                    onClick={startChatWithMaster}
                    style={{
                      fontSize: 13, color: 'var(--accent)', fontWeight: 500,
                      background: 'none', border: 'none', cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    私信圈主添加 →
                  </button>
                </div>
              )}

              {selectedStudio && (
                <>
                  <div className="form-group">
                    <label className="form-label">真实姓名</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="输入你的真实姓名"
                      value={realName}
                      onChange={(e) => setRealName(e.target.value)}
                      maxLength={10}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">班级</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="如：精品三班（选填）"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      maxLength={20}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ color: 'var(--danger)' }}>校园卡/学生证 *</label>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ fontSize: 13, padding: '8px 14px', flexShrink: 0 }}
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                      >
                        {uploading ? '上传中...' : '选择照片'}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleUpload}
                      />
                      {studentIdUrl ? (
                        <span style={{ fontSize: 13, color: 'var(--success)' }}>已上传 ✓</span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--danger)' }}>必填，小于2MB</span>
                      )}
                    </div>
                    {studentIdUrl && (
                      <img
                        src={studentIdUrl}
                        alt="校园卡"
                        style={{
                          marginTop: 8, borderRadius: 8, maxHeight: 160,
                          objectFit: 'cover', background: 'var(--border)',
                        }}
                      />
                    )}
                  </div>

                  <div style={{
                    background: 'var(--bg)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 16,
                    marginBottom: 20,
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    <strong style={{ color: 'var(--text-primary)' }}>认证说明</strong><br />
                    · 提交真实姓名和校园卡照片后由圈主人工审核<br />
                    · 审核通过后即可解锁全部互动权限<br />
                    · 你的信息仅用于认证，不会公开显示<br />
                    · 你的系统ID：<strong style={{ color: 'var(--text-primary)' }}>{user?.sys_user_id}</strong>
                  </div>

                  <button
                    className="btn btn-primary btn-block"
                    onClick={handleSubmit}
                    disabled={!realName.trim() || !studentIdUrl || submitting}
                    style={{ opacity: realName.trim() && studentIdUrl && !submitting ? 1 : 0.5 }}
                  >
                    {submitting ? '提交中...' : '提交认证'}
                  </button>
                </>
              )}

              {status === 'rejected' && (
                <p style={{ marginTop: 12, fontSize: 13, color: 'var(--danger)', textAlign: 'center' }}>
                  上次认证申请未通过，请重新提交
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
