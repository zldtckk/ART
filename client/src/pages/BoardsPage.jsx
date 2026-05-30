import { useNavigate } from 'react-router-dom';

const BOARDS = [
  {
    key: 'circle',
    label: '画室圈子',
    desc: '闲聊、求助、树洞、拼车、拼饭',
    icon: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
    ),
    color: '#007aff',
    path: '/board/circle',
  },
  {
    key: 'market',
    label: '二手集市',
    desc: '出售·求购·赠送',
    icon: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    color: '#ff9500',
    path: '/board/market',
  },
  {
    key: 'fan',
    label: '爱豆专区',
    desc: '追星交流、周边分享',
    icon: (color) => (
      <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
    color: '#af52de',
    path: '/board/fan',
    disabled: true,
  },
];

export default function BoardsPage() {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="header">
        <span className="header-title">板块</span>
      </div>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {BOARDS.map((b) => (
          <div
            key={b.key}
            onClick={() => {
              if (!b.disabled) navigate(b.path);
            }}
            style={{
              background: '#fff',
              borderRadius: 'var(--radius-md)',
              padding: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              cursor: b.disabled ? 'default' : 'pointer',
              opacity: b.disabled ? 0.5 : 1,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${b.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={b.color} strokeWidth="1.5" width="22" height="22">
                {b.key === 'circle' && <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />}
                {b.key === 'market' && <><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></>}
                {b.key === 'fan' && <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />}
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{b.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{b.desc}</div>
            </div>
            {b.disabled && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 8 }}>
                即将开放
              </span>
            )}
            {!b.disabled && (
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" width="18" height="18">
                <path d="M9 18l6-6-6-6" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
