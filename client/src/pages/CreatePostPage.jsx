import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const BOARDS = [
  { key: 'circle', label: '画室圈子' },
  { key: 'market', label: '二手集市' },
  { key: 'fan', label: '爱豆专区', disabled: true },
];

const MARKET_TAGS = [
  { key: 'sell', label: '出售', color: '#007aff' },
  { key: 'buy', label: '求购', color: '#ff9500' },
  { key: 'giveaway', label: '赠送', color: '#34c759' },
];

const MARKET_CATEGORIES = [
  { key: 'free', label: '免费赠送' },
  { key: 'art_supplies', label: '画材' },
  { key: 'books', label: '书籍' },
  { key: 'other', label: '其他' },
];

const POST_TYPES = {
  circle: [
    { key: 'general', label: '闲聊' },
    { key: 'help', label: '求助' },
    { key: 'anonymous', label: '树洞', anonymous: true },
    { key: 'carpool', label: '拼车' },
    { key: 'food', label: '拼饭' },
    { key: 'other', label: '其他' },
  ],
};

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [board, setBoard] = useState('circle');
  const [content, setContent] = useState('');
  const [type, setType] = useState('general');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState([]);
  const [posting, setPosting] = useState(false);
  const [marketTag, setMarketTag] = useState('sell');
  const [marketCategory, setMarketCategory] = useState('art_supplies');
  const [price, setPrice] = useState('');
  const fileInput = useRef(null);

  const currentTypes = POST_TYPES[board] || POST_TYPES.circle;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setPosting(true);
    try {
      const payload = {
        content: content.trim(),
        board,
        circle_type: type,
        is_anonymous: isAnonymous || type === 'anonymous',
        images,
      };
      if (board === 'market') {
        payload.market_tag = marketTag;
        payload.market_category = marketCategory;
        payload.price = price ? parseFloat(price) : null;
      }
      await api.post('/posts', payload);
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.error || '发布失败');
    } finally {
      setPosting(false);
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages((prev) => [...prev, ev.target.result]);
      };
      reader.readAsDataURL(f);
    });
  };

  return (
    <div>
      <div className="header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={!content.trim() || posting}
          style={{ padding: '6px 16px', fontSize: 14, opacity: content.trim() && !posting ? 1 : 0.5 }}
        >
          {posting ? '发布中...' : '发布'}
        </button>
      </div>

      <div className="create-post">
        {/* 板块选择 */}
        <div className="form-group">
          <label className="form-label">发布到</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {BOARDS.map((b) => (
              <button
                key={b.key}
                className={`post-type-btn ${board === b.key ? 'active' : ''}`}
                onClick={() => !b.disabled && setBoard(b.key)}
                style={b.disabled ? { opacity: 0.4 } : {}}
              >
                {b.label}
                {b.disabled && <span style={{ fontSize: 10, marginLeft: 4 }}>即将开放</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 圈子分类 */}
        {board === 'circle' && currentTypes.length > 0 && (
          <div className="form-group">
            <label className="form-label">分类</label>
            <div className="post-type-selector">
              {currentTypes.map((t) => (
                <button
                  key={t.key}
                  className={`post-type-btn ${type === t.key ? 'active' : ''}`}
                  onClick={() => {
                    setType(t.key);
                    if (t.anonymous) setIsAnonymous(true);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 集市标签 */}
        {board === 'market' && (
          <>
            <div className="form-group">
              <label className="form-label">标签</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {MARKET_TAGS.map(t => (
                  <button
                    key={t.key}
                    className={`post-type-btn ${marketTag === t.key ? 'active' : ''}`}
                    onClick={() => setMarketTag(t.key)}
                    style={marketTag === t.key ? { background: t.color, color: '#fff', borderColor: t.color } : {}}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">分类</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {MARKET_CATEGORIES.map(c => (
                  <button
                    key={c.key}
                    className={`post-type-btn ${marketCategory === c.key ? 'active' : ''}`}
                    onClick={() => setMarketCategory(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">价格 {marketTag === 'giveaway' && <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: 13 }}>（赠送可不填）</span>}</label>
              <input
                className="form-input"
                type="number" step="0.01" min="0"
                placeholder="0.00"
                value={price}
                onChange={e => setPrice(e.target.value)}
                style={{ width: 140, padding: '8px 12px', fontSize: 16, borderRadius: 8, background: 'var(--bg)' }}
              />
            </div>
          </>
        )}

        <textarea
          placeholder="此时此刻，想说点什么..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        {images.length > 0 && (
          <div className="image-preview">
            {images.map((img, i) => (
              <div key={i} className="image-preview-item">
                <img src={img} alt="" />
                <button
                  className="remove-btn"
                  onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="upload-btn" onClick={() => fileInput.current?.click()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span>图片</span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleImageUpload}
          />

          <div className="toggle-row" style={{ flex: 1, justifyContent: 'flex-end' }}>
            <span className="toggle-label" style={{ fontSize: 14, marginRight: 8 }}>匿名</span>
            <div
              className={`toggle ${isAnonymous ? 'active' : ''}`}
              onClick={() => setIsAnonymous(!isAnonymous)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
