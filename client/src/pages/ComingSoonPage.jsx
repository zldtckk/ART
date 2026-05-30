import { useNavigate } from 'react-router-dom';

export default function ComingSoonPage({ name }) {
  const navigate = useNavigate();
  return (
    <div className="page">
      <div className="header">
        <span className="header-title">{name || ''}</span>
      </div>
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <h3>即将开放</h3>
        <p style={{ marginTop: 8, color: 'var(--text-tertiary)', fontSize: 14 }}>
          该板块正在开发中，敬请期待
        </p>
        <button className="btn btn-secondary" style={{ marginTop: 24 }} onClick={() => navigate('/')}>
          去圈子看看
        </button>
      </div>
    </div>
  );
}
