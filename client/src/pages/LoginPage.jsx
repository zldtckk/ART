import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [registeredUser, setRegisteredUser] = useState(null);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) return;
    if (password !== confirmPassword) {
      alert('两次密码不一致');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', { username, password });
      setRegisteredUser(res.data.user);
    } catch (err) {
      alert(err.response?.data?.error || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  // 注册成功展示系统ID
  if (registeredUser) {
    return (
      <div className="login-page" style={{ justifyContent: 'center' }}>
        <div className="login-logo">
          <h1>画室圈</h1>
          <p>注册成功！</p>
        </div>
        <div style={{ textAlign: 'center', padding: '0 16px' }}>
          <div style={{
            background: 'var(--bg)',
            borderRadius: 'var(--radius-md)',
            padding: 24,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 8 }}>你的系统ID</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>
              {registeredUser.sys_user_id}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
              请牢记此ID，认证和找回密码时会用到
            </div>
          </div>
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              login(null, registeredUser);
              navigate('/');
            }}
          >
            开始使用
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page" style={{ justifyContent: 'center' }}>
      <div className="login-logo">
        <h1>画室圈</h1>
        <p>杭州美术集训生社区</p>
      </div>

      {/* 登录/注册切换 */}
      <div style={{ display: 'flex', marginBottom: 20, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
        <button
          onClick={() => setMode('login')}
          style={{
            flex: 1, padding: '10px', fontSize: 15, fontWeight: 600, border: 'none',
            background: mode === 'login' ? 'var(--accent)' : '#fff',
            color: mode === 'login' ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >
          登录
        </button>
        <button
          onClick={() => setMode('register')}
          style={{
            flex: 1, padding: '10px', fontSize: 15, fontWeight: 600, border: 'none',
            background: mode === 'register' ? 'var(--accent)' : '#fff',
            color: mode === 'register' ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >
          注册
        </button>
      </div>

      <div>
        <div className="form-group">
          <label className="form-label">用户名</label>
          <input
            className="form-input"
            type="text"
            placeholder="英文或数字组合，2-20位"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
            maxLength={20}
          />
        </div>

        <div className="form-group">
          <label className="form-label">密码</label>
          <input
            className="form-input"
            type="password"
            placeholder={mode === 'register' ? '至少4位' : '输入密码'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label">确认密码</label>
            <input
              className="form-input"
              type="password"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        <button
          className="btn btn-primary btn-block"
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={!username || !password || loading || (mode === 'register' && !confirmPassword)}
          style={{ opacity: username && password && !loading ? 1 : 0.5, marginTop: 8 }}
        >
          {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
        </button>
      </div>
    </div>
  );
}
