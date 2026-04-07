import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { child, get, ref, set, push, update } from 'firebase/database';
import bcrypt from 'bcryptjs';
import { rtdb } from './firebase';
import { normalizePakistanPhone, phoneDigitsForQuery } from './lib/phoneAuth';
import './styles/cashback.css';

const FALLBACK = 'https://placehold.co/600x400/1a1a27/ff6b35?text=Product';

const EP_NUM = '03001234567';
const EP_DISPLAY = '0300-1234567';

const BASE_CASHBACK_PERCENTAGE = 15; // 15% cashback on product price
const REFER_BONUS = 1500;

// Calculate cashback based on product price (15% of price)
const calculateCashback = (price) =>
  Math.round((price * BASE_CASHBACK_PERCENTAGE) / 100);

const PRODUCTS = [
  {
    id: 1,
    name: 'GREE Ceiling Fan 56″',
    category: 'fans',
    img: 'https://rosepng.com/wp-content/uploads/elementor/thumbs/s11728_ceiling_fan_isolated_on_white_background_-stylize_200_a571b63d-7690-4b1c-8203-2d0359b1021e_3-photoroom-png-photoroom_11zonG0niZvX-qlg1jqeweelzzokbgidts35l7xhb1d9jqke7m00rkw.png',
    price: 12999,
    description:
      'Energy efficient ceiling fan with remote control, 5-star rating',
  },
  {
    id: 2,
    name: 'Super Asia Pedestal Fan 18″',
    category: 'fans',
    img: 'https://superasiastore.ae/cdn/shop/files/IndustrialstandFanDubaicopy.jpg?v=1693825504&width=1058',
    price: 7499,
    description:
      'Heavy duty pedestal fan with 3 speed settings, ideal for home and office',
  },
  {
    id: 3,
    name: 'National Table Fan 12″',
    category: 'fans',
    img: 'https://s.alicdn.com/@sc04/kf/H30882940ffdc4a89922a225dad8c5bfc3/12-Inch-Table-Fan-with-Light-Bulb-Rechargeable-Electric-Solar-Fan-Emergency-High-Wind-Power-Shaking-Head-Solar-Fan.jpg_300x300.jpg',
    price: 4599,
    description: 'Compact table fan for personal use, energy saving motor',
  },
  {
    id: 4,
    name: 'Dawlance Tower Fan 40″',
    category: 'fans',
    img: 'https://emperial.co.uk/cdn/shop/files/Artboard2_7eccb2db-e2d5-4055-a0cd-f3e3a0c4c3ec.jpg?v=1720622384&width=2000',
    price: 15999,
    description:
      'Sleek tower fan with oscillation, 3 speed modes, timer function',
  },
  {
    id: 5,
    name: 'Pro Fitness Dumbbells Set 20kg',
    category: 'gym',
    img: 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?w=600&q=80',
    price: 8500,
    description: 'Premium cast iron dumbbells with stand, perfect for home gym',
  },
  {
    id: 6,
    name: 'Bodylastics Resistance Bands Set',
    category: 'gym',
    img: 'https://img.drz.lazcdn.com/static/np/p/81459e7e80f1d75392055a52f8054d71.jpg_720x720q80.jpg',
    price: 2999,
    description:
      '5-piece resistance band set with door anchor, exercise guide included',
  },
  {
    id: 7,
    name: 'ProSpeed Jump Rope',
    category: 'gym',
    img: 'https://www.jimkiddsports.com.au/cdn/shop/files/SHOPIFY_0000s_0001_HARBINGER-PRO-SPEED-ROPE-24351-_2.png?v=1743664296&width=2048',
    price: 899,
    description: 'Adjustable speed jump rope with ball bearings, foam handles',
  },
  {
    id: 8,
    name: 'Gaiam Yoga Mat 6mm',
    category: 'gym',
    img: 'https://cdn.shopify.com/s/files/1/0044/9341/0393/files/gaiam-performance-dry-grip-yoga-mat-14.jpg?v=1610562932',
    price: 2499,
    description: 'Non-slip eco-friendly yoga mat with carrying strap',
  },
  {
    id: 9,
    name: 'Perfect Fitness Ab Wheel Roller',
    category: 'gym',
    img: 'https://proiron.com/cdn/shop/articles/6_300x.jpg?v=1712124695',
    price: 1299,
    description:
      'Dual wheel ab roller with knee pad, core strengthening equipment',
  },
  {
    id: 10,
    name: 'Philips Electric Kettle 1.7L',
    category: 'kitchen',
    img: 'https://pak-electronics.pk/wp-content/uploads/2023/08/Phlips-9.jpg',
    price: 5499,
    description:
      'Stainless steel electric kettle with auto shut-off, boil-dry protection',
  },
  {
    id: 11,
    name: 'Tefal Non-Stick Fry Pan 28cm',
    category: 'kitchen',
    img: 'https://toplinegroup.ie/cdn/shop/files/d7af78f88f075860debdf86fe2025dc746558a2f_T_3168430264854_1024x1024.jpg?v=1719458116',
    price: 3999,
    description:
      'Thermo-spot technology, titanium non-stick coating, dishwasher safe',
  },
  {
    id: 12,
    name: 'Air Fryer 4 Litre',
    category: 'kitchen',
    img: 'https://philipsappliances.pk/wp-content/uploads/2025/03/vrs_d9efe4639a2f4140c5a360d15a2396c4b1a3e345.webp',
    price: 18999,
    description:
      'Digital air fryer with 8 presets, oil-free cooking, 1700W power',
  },
  {
    id: 13,
    name: 'Sony Wireless Earbuds ANC',
    category: 'electronics',
    img: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?w=600&q=80',
    price: 15999,
    description:
      'Noise cancelling earbuds with 20hr battery life, IPX4 water resistant',
  },
  {
    id: 14,
    name: 'Xiaomi Power Bank 20000mAh',
    category: 'electronics',
    img: 'https://dynsol.pk/cdn/shop/files/Xiaomi_33W_Power_Bank_20000mAh_Blue_Integrated_Cable_Best_Price_in_Pakistan_Dynsol.pk.webp?v=1773478299&width=416',
    price: 4999,
    description: 'Fast charging power bank with 18W output, dual USB ports',
  },
  {
    id: 15,
    name: 'Philips Smart LED Strip 5m',
    category: 'electronics',
    img: 'https://cdn1.npcdn.net/npimg/1752899168ebf9ac62dd7dbcd456eb5cc1d83ca48f.webp?md5id=d0866fb7fef7340334755089f89bdfeb&new_width=1000&new_height=1000&size=max&w=1774400981&from=jpg&type=1',
    price: 3499,
    description: 'RGB smart LED strip with app control, music sync feature',
  },
  {
    id: 16,
    name: 'Anker USB-C Hub 7-in-1',
    category: 'electronics',
    img: 'https://xcessorieshub.com/wp-content/uploads/2025/07/Anker-A8355.webp',
    price: 8999,
    description: '7-port USB-C hub with 4K HDMI, Ethernet, USB 3.0 ports',
  },
].map((p) => ({
  ...p,
  cashback: calculateCashback(p.price),
  desc: `Assalam o Alaikum! ${p.description} Is product ko buy karne par aapko Rs. ${calculateCashback(p.price).toLocaleString()} cashback milega (24 ghante ke andar). Agar aap kisi dost ko refer karte hain, to aapko ${REFER_BONUS} extra cashback milega.`,
}));

// ─── Profile Dropdown Component ───────────────────────────────────────────────
function ProfileDropdown({
  currentUser,
  onLogout,
  onNavigate,
  userStats,
  loadingStats,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = currentUser?.phone
    ? currentUser.phone.replace(/\D/g, '').slice(-4, -2)
    : 'U';

  const shortPhone = currentUser?.phone
    ? currentUser.phone.replace('+92', '0').replace(/(\d{4})(\d{7})/, '$1-$2')
    : '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '7px 13px',
          borderRadius: 9,
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: '#ff6b35',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: 11,
            color: '#fff',
          }}
        >
          {initials}
        </div>
        <span>📱 {shortPhone}</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: '#000000',
            border: '0.5px solid var(--color-border-tertiary, #e0e0e0)',
            borderRadius: 14,
            width: 280,
            zIndex: 999,
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#1a1a27',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: '#ff6b35',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 16,
                color: '#fff',
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>
                Mera Account
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                {currentUser?.phone}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <StatBox
              label="Orders"
              value={loadingStats ? '...' : userStats?.totalOrders || 0}
              color="inherit"
            />
            <StatBox
              label="Cashback"
              value={
                loadingStats
                  ? '...'
                  : `Rs. ${(userStats?.totalCashback || 0).toLocaleString()}`
              }
              color="#22a06b"
              border
            />
            <StatBox
              label="Refer Bonus"
              value={
                loadingStats
                  ? '...'
                  : `Rs. ${(userStats?.referBonus || 0).toLocaleString()}`
              }
              color="#cf7808"
              border
            />
          </div>

          <Divider />

          <MenuItem
            icon="📦"
            label="Meri Orders"
            onClick={() => {
              setOpen(false);
              onNavigate('/orders');
            }}
          />
          <MenuItem
            icon="💰"
            label="Cashback History"
            onClick={() => {
              setOpen(false);
              onNavigate('/cashback-history');
            }}
          />
          <MenuItem
            icon="🔗"
            label="Dost Ko Refer Karo"
            onClick={() => {
              setOpen(false);
              onNavigate('/refer');
            }}
          />

          <Divider />

          <MenuItem
            icon="🚪"
            label="Logout"
            danger
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          />
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color, border }) {
  return (
    <div
      style={{
        padding: '12px 8px',
        textAlign: 'center',
        borderRight: border
          ? '0.5px solid var(--color-border-tertiary, #eee)'
          : 'none',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: color || 'var(--color-text-primary)',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--color-text-secondary)',
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        cursor: 'pointer',
        fontSize: 13,
        color: danger ? '#c0392b' : 'var(--color-text-primary)',
        background: hover ? 'var(--color-background-secondary)' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>
        {icon}
      </span>
      {label}
    </div>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: '0.5px',
        background: 'var(--color-border-tertiary, #eee)',
      }}
    />
  );
}

// ─── Referral Page Component ────────────────────────────────────────────
function ReferralPage({ currentUser, onCopyRefer, referLink }) {
  const navigate = useNavigate();
  const [copySuccess, setCopySuccess] = useState(false);

  const shareOnWhatsApp = () => {
    const message = `Assalam o Alaikum! 🎉\n\nJoin CashBack Shop and earn ${BASE_CASHBACK_PERCENTAGE}% cashback on every purchase! Use my referral link to get started:\n\n${referLink}\n\nAapko bhi cashback milega aur mujhe bhi! 💰`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referLink)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
      if (onCopyRefer) onCopyRefer();
    } catch {
      alert('Copy nahi ho saka');
    }
  };

  if (!currentUser) {
    return (
      <div className="page active">
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            padding: 40,
            textAlign: 'center',
          }}
        >
          <div className="big">🔗</div>
          <h2>Pehle Login Karo</h2>
          <p style={{ marginBottom: 20 }}>
            Referral link share karne ke liye login karna zaroori hai.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login Karein
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="referral-page" className="page active">
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>

        <div className="cart-header" style={{ marginBottom: 30 }}>
          🔗 Dost Ko Refer Karo — Rs. {REFER_BONUS.toLocaleString()} Kamao!
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: 24,
            padding: 30,
            marginBottom: 30,
            textAlign: 'center',
            border: '1px solid rgba(255,107,53,0.2)',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 15 }}>🎁</div>
          <h2 style={{ marginBottom: 10, color: '#ff6b35' }}>
            Rs. {REFER_BONUS.toLocaleString()} Bonus!
          </h2>
          <p style={{ color: '#aaa', marginBottom: 25 }}>
            Jab aapka dost register karega aur pehla order karega, aapko{' '}
            {REFER_BONUS} rupees extra cashback milega!
          </p>

          <div
            style={{
              background: '#000000',
              borderRadius: 12,
              padding: 15,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: '#888',
                marginBottom: 8,
                textAlign: 'left',
              }}
            >
              Aapka Referral Link:
            </div>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                value={referLink}
                readOnly
                style={{
                  flex: 1,
                  background: '#1a1a27',
                  border: '1px solid #333',
                  borderRadius: 8,
                  padding: '12px 15px',
                  color: '#ff6b35',
                  fontSize: 12,
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={copyToClipboard}
                style={{
                  background: copySuccess ? '#22a06b' : '#ff6b35',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 20px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all 0.3s',
                }}
              >
                {copySuccess ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={shareOnWhatsApp}
              style={{
                background: '#25D366',
                border: 'none',
                borderRadius: 40,
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              📱 Share on WhatsApp
            </button>
            <button
              onClick={shareOnFacebook}
              style={{
                background: '#1877F2',
                border: 'none',
                borderRadius: 40,
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              📘 Share on Facebook
            </button>
          </div>
        </div>

        <div
          style={{
            background: '#1a1a27',
            borderRadius: 16,
            padding: 25,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              marginBottom: 15,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            📋 Kaam Kaise Karta Hai?
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  background: '#ff6b35',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                1
              </div>
              <div>Apna referral link copy karo aur dosto ko bhejo</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  background: '#ff6b35',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                2
              </div>
              <div>Dost aapke link se shop visit kare aur signup kare</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div
                style={{
                  background: '#ff6b35',
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  flexShrink: 0,
                }}
              >
                3
              </div>
              <div>
                Dost jab pehla order karega, aapko turant{' '}
                <strong>Rs. {REFER_BONUS.toLocaleString()}</strong> cashback
                milega!
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(34, 160, 107, 0.1)',
            borderRadius: 16,
            padding: 20,
            border: '1px solid rgba(34, 160, 107, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 24 }}>💡</span>
            <strong style={{ color: '#22a06b' }}>Pro Tip:</strong>
          </div>
          <p style={{ fontSize: 14, color: '#aaa', margin: 0 }}>
            Jitne zyada dosto ko refer karoge, utna zyada cashback kamao! Koi
            limit nahi hai. Har successful referral pe Rs.{' '}
            {REFER_BONUS.toLocaleString()} bonus milega!
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Orders Page Component ────────────────────────────────────────────
function OrdersPage({ currentUser }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchOrders = async () => {
      try {
        const ordersRef = ref(rtdb, `orders/${currentUser.uid}`);
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
          const ordersData = snapshot.val();
          const ordersList = Object.entries(ordersData).map(([id, order]) => ({
            id,
            ...order,
            date: new Date(order.timestamp),
          }));
          ordersList.sort((a, b) => b.timestamp - a.timestamp);
          setOrders(ordersList);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser, navigate]);

  if (loading) {
    return (
      <div className="page active" style={{ textAlign: 'center', padding: 40 }}>
        Loading orders...
      </div>
    );
  }

  return (
    <div id="orders-page" className="page active">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>
        <div className="cart-header">📦 Meri Orders</div>

        {orders.length === 0 ? (
          <div className="cart-empty">
            <div className="big">📦</div>
            <p>Aapne abhi tak koi order nahi kiya</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Shopping Shuru Karo
            </button>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="order-card"
              style={{
                background: '#1a1a27',
                borderRadius: 16,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 15,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#888' }}>Order ID</div>
                  <div style={{ fontSize: 13 }}>{order.id.slice(0, 8)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#888' }}>Date</div>
                  <div style={{ fontSize: 13 }}>
                    {order.date.toLocaleDateString()}
                  </div>
                </div>
              </div>

              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', gap: 12, marginBottom: 12 }}
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    style={{
                      width: 60,
                      height: 60,
                      objectFit: 'cover',
                      borderRadius: 8,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>
                      Qty: {item.qty} × Rs.{item.price.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>Rs.{(item.price * item.qty).toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: '#22a06b' }}>
                      +Rs.{item.cashback * item.qty} cashback
                    </div>
                  </div>
                </div>
              ))}

              <div
                style={{
                  borderTop: '1px solid #333',
                  marginTop: 12,
                  paddingTop: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 600,
                  }}
                >
                  <span>Total Amount:</span>
                  <span>Rs.{order.totalAmount.toLocaleString()}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: '#22a06b',
                    marginTop: 5,
                  }}
                >
                  <span>Cashback Earned ({BASE_CASHBACK_PERCENTAGE}%):</span>
                  <span>+Rs.{order.cashbackEarned.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Cashback History Page ────────────────────────────────────────────
function CashbackHistoryPage({ currentUser }) {
  const [cashbackEntries, setCashbackEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const fetchCashbackHistory = async () => {
      try {
        const cashbackRef = ref(rtdb, `cashbackHistory/${currentUser.uid}`);
        const snapshot = await get(cashbackRef);
        if (snapshot.exists()) {
          const historyData = snapshot.val();
          const historyList = Object.entries(historyData).map(
            ([id, entry]) => ({
              id,
              ...entry,
              date: new Date(entry.timestamp),
            }),
          );
          historyList.sort((a, b) => b.timestamp - a.timestamp);
          setCashbackEntries(historyList);
        }
      } catch (error) {
        console.error('Error fetching cashback history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCashbackHistory();
  }, [currentUser, navigate]);

  if (loading) {
    return (
      <div className="page active" style={{ textAlign: 'center', padding: 40 }}>
        Loading history...
      </div>
    );
  }

  return (
    <div id="cashback-history-page" className="page active">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>
        <div className="cart-header">💰 Cashback History</div>

        {cashbackEntries.length === 0 ? (
          <div className="cart-empty">
            <div className="big">💰</div>
            <p>Abhi tak koi cashback nahi mila</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Shopping Karo
            </button>
          </div>
        ) : (
          cashbackEntries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: '#1a1a27',
                borderRadius: 12,
                padding: 15,
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>
                  {entry.type === 'order' ? 'Order Cashback' : 'Referral Bonus'}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {entry.date.toLocaleDateString()}
                </div>
                {entry.orderId && (
                  <div style={{ fontSize: 11, color: '#888' }}>
                    Order: {entry.orderId.slice(0, 8)}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#22a06b' }}>
                +Rs.{entry.amount.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main App Shell ────────────────────────────────────────────────────────────
function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cbCart') || '[]');
    } catch {
      return [];
    }
  });

  const [userStats, setUserStats] = useState({
    totalOrders: 0,
    totalCashback: 0,
    referBonus: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3200);
  };

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderCashbackTotal, setOrderCashbackTotal] = useState(0);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  useEffect(() => {
    localStorage.setItem('cbCart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const r = sp.get('ref');
    if (r) localStorage.setItem('cbRef', r);
  }, [location.search]);

  useEffect(() => {
    const uid = localStorage.getItem('cbUid');
    const phone = localStorage.getItem('cbPhone');
    if (uid && phone) {
      setCurrentUser({ uid, phone });
      loadUserStats(uid);
    } else {
      setCurrentUser(null);
      setLoadingStats(false);
    }
  }, []);

  const loadUserStats = async (uid) => {
    setLoadingStats(true);
    try {
      const ordersRef = ref(rtdb, `orders/${uid}`);
      const ordersSnap = await get(ordersRef);
      let totalOrders = 0;
      let totalCashback = 0;

      if (ordersSnap.exists()) {
        const orders = ordersSnap.val();
        totalOrders = Object.keys(orders).length;
        Object.values(orders).forEach((order) => {
          totalCashback += order.cashbackEarned || 0;
        });
      }

      const userRef = ref(rtdb, `users/${uid}`);
      const userSnap = await get(userRef);
      let referBonus = 0;
      if (userSnap.exists()) {
        referBonus = userSnap.val().referBonus || 0;
      }

      setUserStats({ totalOrders, totalCashback, referBonus });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('cbUid');
    localStorage.removeItem('cbPhone');
    setCurrentUser(null);
    showToast('Logout ho gaye!');
    navigate('/');
  };

  const addToCart = (id) => {
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) return;
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
        return next;
      }
      return [
        ...prev,
        {
          id: p.id,
          name: p.name,
          img: p.img,
          price: p.price,
          cashback: p.cashback,
          qty: 1,
        },
      ];
    });
    showToast(`✅ "${p.name}" cart mein!`);
  };

  const removeFromCart = (id) =>
    setCart((prev) => prev.filter((x) => x.id !== id));

  const changeQty = (id, delta) => {
    setCart((prev) => {
      const it = prev.find((x) => x.id === id);
      if (!it) return prev;
      const nextQty = it.qty + delta;
      if (nextQty <= 0) return prev.filter((x) => x.id !== id);
      return prev.map((x) => (x.id === id ? { ...x, qty: nextQty } : x));
    });
  };

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart],
  );
  const cashbackTotal = useMemo(
    () => cart.reduce((s, i) => s + i.cashback * i.qty, 0),
    [cart],
  );

  const referLink = useMemo(() => {
    if (!currentUser?.phone) return 'Login karo link ke liye...';
    const digits = phoneDigitsForQuery(currentUser.phone);
    return `${window.location.origin}/?ref=${encodeURIComponent(digits)}`;
  }, [currentUser]);

  const copyText = async (text, okMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(okMsg);
    } catch {
      showToast('Copy nahi ho saka');
    }
  };

  const copyEP = () => copyText(EP_NUM, `📋 ${EP_DISPLAY} copy ho gaya!`);

  const copyReferLink = () => {
    if (!currentUser) {
      showToast('Pehle login karo!');
      navigate('/login');
      return;
    }
    copyText(referLink, '🔗 Refer link copy ho gaya!');
  };

  const placeOrder = async () => {
    if (!currentUser) {
      showToast('Pehle login karo!');
      navigate('/login');
      return;
    }
    if (cart.length === 0) {
      showToast('Cart khali hai!');
      return;
    }

    try {
      const orderId = push(ref(rtdb, `orders/${currentUser.uid}`)).key;
      const orderData = {
        id: orderId,
        userId: currentUser.uid,
        items: cart,
        totalAmount: subtotal,
        cashbackEarned: cashbackTotal,
        timestamp: Date.now(),
        status: 'pending',
      };

      await set(ref(rtdb, `orders/${currentUser.uid}/${orderId}`), orderData);

      await set(ref(rtdb, `cashbackHistory/${currentUser.uid}/${orderId}`), {
        type: 'order',
        amount: cashbackTotal,
        orderId: orderId,
        timestamp: Date.now(),
      });

      const userRef = ref(rtdb, `users/${currentUser.uid}`);
      const userSnap = await get(userRef);
      const currentStats = userSnap.exists() ? userSnap.val() : {};
      const currentCashback = currentStats.totalCashback || 0;
      const currentOrders = currentStats.totalOrders || 0;

      await update(ref(rtdb, `users/${currentUser.uid}`), {
        totalCashback: currentCashback + cashbackTotal,
        totalOrders: currentOrders + 1,
        lastOrderDate: Date.now(),
      });

      const referrerPhone = localStorage.getItem('cbRef');
      if (referrerPhone) {
        const referrerPhoneKey = phoneDigitsForQuery(referrerPhone);
        const referrerUidSnap = await get(
          child(ref(rtdb), `usersByPhone/${referrerPhoneKey}`),
        );
        if (referrerUidSnap.exists()) {
          const referrerUid = referrerUidSnap.val();
          const referrerRef = ref(rtdb, `users/${referrerUid}`);
          const referrerSnap = await get(referrerRef);
          const currentReferBonus = referrerSnap.exists()
            ? referrerSnap.val().referBonus || 0
            : 0;

          await update(ref(rtdb, `users/${referrerUid}`), {
            referBonus: currentReferBonus + REFER_BONUS,
          });

          await set(ref(rtdb, `cashbackHistory/${referrerUid}/${Date.now()}`), {
            type: 'referral',
            amount: REFER_BONUS,
            referredUser: currentUser.uid,
            timestamp: Date.now(),
          });
        }
      }

      await loadUserStats(currentUser.uid);

      setOrderCashbackTotal(cashbackTotal);
      setOrderModalOpen(true);
    } catch (error) {
      console.error('Error placing order:', error);
      showToast('Order place karne mein error aa gaya');
    }
  };

  const closeOrderModal = () => {
    setOrderModalOpen(false);
    setCart([]);
    navigate('/');
  };

  const shareWhatsApp = () => {
    const items = cart
      .map(
        (i) =>
          `• ${i.name} ×${i.qty} = Rs.${(i.price * i.qty).toLocaleString()}`,
      )
      .join('\n');
    const msg = `Assalam o Alaikum!\n\nMera order confirm karna hai:\n\n${items}\n\nTotal: Rs. ${subtotal.toLocaleString()}\n\nPayment: EasyPaisa ${EP_DISPLAY}\n\nCashback: ${BASE_CASHBACK_PERCENTAGE}% (Rs. ${cashbackTotal.toLocaleString()})`;
    const r = localStorage.getItem('cbRef');
    const extra = r ? `\nReferral: ${r}` : '';
    window.open(
      `https://wa.me/923001234567?text=${encodeURIComponent(msg + extra)}`,
      '_blank',
      'noopener,noreferrer',
    );
    closeOrderModal();
  };

  return (
    <>
      <nav>
        <div className="logo" onClick={() => navigate('/')}>
          Cash<span>Back</span> Shop
        </div>
        <div className="nav-right">
          <button
            className="cart-btn"
            onClick={() => navigate('/cart')}
            aria-label="Cart"
          >
            🛒 Cart
            <span className={`cart-count ${cartCount > 0 ? 'show' : ''}`}>
              {cartCount}
            </span>
          </button>

          {currentUser ? (
            <ProfileDropdown
              currentUser={currentUser}
              onLogout={logout}
              onNavigate={navigate}
              userStats={userStats}
              loadingStats={loadingStats}
            />
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <div
        id="toast"
        className={toast ? 'show' : ''}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>

      <Routes>
        <Route
          path="/"
          element={<HomePage cart={cart} onAddToCart={addToCart} />}
        />
        <Route
          path="/product/:id"
          element={<DetailPage cart={cart} onAddToCart={addToCart} />}
        />
        <Route
          path="/cart"
          element={
            <CartPage
              cart={cart}
              onRemove={removeFromCart}
              onChangeQty={changeQty}
              subtotal={subtotal}
              cashbackTotal={cashbackTotal}
              epDisplay={EP_DISPLAY}
              referLink={referLink}
              onCopyEP={copyEP}
              onCopyRefer={copyReferLink}
              onPlaceOrder={placeOrder}
              currentUser={currentUser}
            />
          }
        />
        <Route
          path="/login"
          element={
            <LoginPage
              currentUser={currentUser}
              onLoginComplete={() => navigate('/')}
            />
          }
        />
        <Route
          path="/signup"
          element={<SignupPage onSignupComplete={() => navigate('/')} />}
        />
        <Route
          path="/orders"
          element={<OrdersPage currentUser={currentUser} />}
        />
        <Route
          path="/cashback-history"
          element={<CashbackHistoryPage currentUser={currentUser} />}
        />
        <Route
          path="/refer"
          element={
            <ReferralPage
              currentUser={currentUser}
              onCopyRefer={copyReferLink}
              referLink={referLink}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <div
        className={`modal-overlay ${orderModalOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        {orderModalOpen ? (
          <div className="modal">
            <div className="modal-icon">🎉</div>
            <h2>Order Confirm!</h2>
            <p>
              <strong style={{ color: 'var(--green)' }}>{EP_DISPLAY}</strong> pe
              EasyPaisa se payment bhejo.
              <br />
              <br />
              Screenshot WhatsApp pe bhejo:{' '}
              <strong style={{ color: 'var(--accent2)' }}>{EP_DISPLAY}</strong>
              <br />
              <br />
              Tumhara{' '}
              <strong style={{ color: 'var(--accent2)' }}>
                Rs. {orderCashbackTotal.toLocaleString()}
              </strong>{' '}
              cashback ({BASE_CASHBACK_PERCENTAGE}% of total) 24 ghante mein aa
              jayega! 💰
              <br />
              <br />
              Refer bonus:{' '}
              <strong style={{ color: 'var(--green)' }}>
                Rs. {REFER_BONUS.toLocaleString()}
              </strong>{' '}
              (jab dost order kare).
            </p>
            <div className="modal-btns">
              <button className="btn btn-primary" onClick={closeOrderModal}>
                Done ✓
              </button>
              <button className="btn btn-green" onClick={shareWhatsApp}>
                WhatsApp 📲
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <footer>
        <span>© {new Date().getFullYear()} CashBack Shop Pakistan</span>
        <span>💚 {BASE_CASHBACK_PERCENTAGE}% Cashback on Every Purchase!</span>
      </footer>
    </>
  );

  // ── Page components ────────────────────────────────────────────
  function HomePage({ cart, onAddToCart }) {
    const [filter, setFilter] = useState('all');
    const list = useMemo(
      () =>
        filter === 'all'
          ? PRODUCTS
          : PRODUCTS.filter((p) => p.category === filter),
      [filter],
    );
    const navigate = useNavigate();

    return (
      <div className="page active">
        <section className="hero">
          <div className="cb-banner">
            <span className="dot"></span> Buy & Earn —{' '}
            {BASE_CASHBACK_PERCENTAGE}% Cash Back on Every Order!
          </div>
          <h1>
            Shop Smart.
            <br />
            <em>Earn Every Time.</em>
          </h1>
          <p>
            Top products khareedo, EasyPaisa se pay karo, aur{' '}
            {BASE_CASHBACK_PERCENTAGE}% instant cashback kamao!
          </p>
        </section>

        <div className="filter-tabs">
          {['all', 'fans', 'gym', 'kitchen', 'electronics'].map((cat) => (
            <button
              key={cat}
              className={`tab ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat === 'all'
                ? 'All Products'
                : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="products-grid">
          {list.map((p) => {
            const it = cart.find((x) => x.id === p.id);
            return (
              <div key={p.id} className="product-card">
                <div onClick={() => navigate(`/product/${p.id}`)}>
                  <div className="card-img">
                    <img
                      src={p.img}
                      alt={p.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK;
                      }}
                    />
                    <div className="img-overlay"></div>
                  </div>
                  <div className="card-body">
                    <div className="card-cat">{p.category.toUpperCase()}</div>
                    <div className="card-name">{p.name}</div>
                    <div className="card-price">
                      Rs. {p.price.toLocaleString()} <span>PKR</span>
                    </div>
                    <div className="card-footer">
                      <span className="cb-tag">
                        💰 {BASE_CASHBACK_PERCENTAGE}% Cashback (Rs.
                        {p.cashback.toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 14px 14px' }}>
                  <button
                    className={`add-cart-btn ${it ? 'added' : ''}`}
                    style={{ width: '100%', padding: 9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(p.id);
                    }}
                  >
                    {it ? `✅ Cart Mein (${it.qty})` : '🛒 Add to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function DetailPage({ cart, onAddToCart }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const p = useMemo(
      () => PRODUCTS.find((x) => String(x.id) === String(id)) || null,
      [id],
    );
    const it = p ? cart.find((x) => x.id === p.id) : null;

    if (!p)
      return (
        <div className="page active">
          <div id="detail-page">
            <div className="back-btn" onClick={() => navigate('/')}>
              ← Wapas Jao
            </div>
            <div className="cart-empty">
              <div className="big">❌</div>
              <p
                style={{
                  fontFamily: 'var(--fh)',
                  fontSize: '1.1rem',
                  marginBottom: 8,
                }}
              >
                Product nahi mila.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Products Dekho
              </button>
            </div>
          </div>
        </div>
      );

    return (
      <div id="detail-page" className="page active">
        <div style={{ padding: '0' }}>
          <div className="back-btn" onClick={() => navigate('/')}>
            ← Wapas Jao
          </div>
          <div className="detail-layout">
            <div className="det-img">
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK;
                }}
              />
            </div>
            <div>
              <div className="det-cat">{p.category.toUpperCase()}</div>
              <div className="det-name">{p.name}</div>
              <div className="det-price">
                Rs. {p.price.toLocaleString()} PKR
              </div>
              <div
                className="det-cashback"
                style={{ color: '#22a06b', marginBottom: 10, fontSize: 14 }}
              >
                💰 Cashback: {BASE_CASHBACK_PERCENTAGE}% (Rs.{' '}
                {p.cashback.toLocaleString()})
              </div>
              <div className="det-desc">{p.desc}</div>
              <button
                className={`detail-add-btn ${it ? 'added' : ''}`}
                onClick={() => onAddToCart(p.id)}
              >
                {it
                  ? `✅ Cart Mein (${it.qty}) — Aur Add Karo`
                  : '🛒 Add to Cart'}
              </button>
              <button
                className="btn btn-outline"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  marginTop: 10,
                }}
                onClick={() => navigate('/cart')}
              >
                View Cart →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function CartPage({
    cart,
    onRemove,
    onChangeQty,
    subtotal,
    cashbackTotal,
    epDisplay,
    referLink,
    onCopyEP,
    onCopyRefer,
    onPlaceOrder,
    currentUser,
  }) {
    const navigate = useNavigate();
    const empty = cart.length === 0;

    return (
      <div id="cart-page" className="page active">
        <div style={{ padding: '0', maxWidth: 780, margin: '0 auto' }}>
          <div className="back-btn" onClick={() => navigate('/')}>
            ← Shopping Jari Rakho
          </div>
          <div className="cart-header">🛒 Tumhara Cart</div>

          {empty ? (
            <div className="cart-empty">
              <div className="big">🛒</div>
              <p
                style={{
                  fontFamily: 'var(--fh)',
                  fontSize: '1.1rem',
                  marginBottom: 8,
                }}
              >
                Cart Khali Hai!
              </p>
              <p style={{ marginBottom: 20 }}>
                Koi product add nahi kiya abhi tak.
              </p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Products Dekho
              </button>
            </div>
          ) : (
            <>
              <div>
                {cart.map((it) => (
                  <div key={it.id} className="cart-item">
                    <div className="ci-img">
                      <img
                        src={it.img}
                        alt={it.name}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK;
                        }}
                      />
                    </div>
                    <div className="ci-info">
                      <div className="ci-name">{it.name}</div>
                      <div className="ci-price">
                        Rs. {(it.price * it.qty).toLocaleString()}{' '}
                        <span
                          style={{ color: 'var(--muted)', fontSize: '.76rem' }}
                        >
                          ({it.qty}×Rs.{it.price.toLocaleString()})
                        </span>
                      </div>
                      <div className="ci-qty">
                        <button
                          className="qty-btn"
                          onClick={() => onChangeQty(it.id, -1)}
                        >
                          −
                        </button>
                        <span className="qty-num">{it.qty}</span>
                        <button
                          className="qty-btn"
                          onClick={() => onChangeQty(it.id, +1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      className="ci-remove"
                      onClick={() => onRemove(it.id)}
                    >
                      🗑 Hatao
                    </button>
                  </div>
                ))}
              </div>

              <div className="order-summary">
                <div className="os-title">📋 Order Summary</div>
                <div className="os-row">
                  <span className="lbl">Subtotal</span>
                  <span className="val">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="os-row">
                  <span className="lbl">Delivery</span>
                  <span className="val green">FREE 🎁</span>
                </div>
                <div className="os-row">
                  <span className="lbl">
                    Tumhara Cashback ({BASE_CASHBACK_PERCENTAGE}%)
                  </span>
                  <span className="val green">
                    Rs. {cashbackTotal.toLocaleString()}
                  </span>
                </div>
                <div className="os-row total">
                  <span className="lbl">Aap Pay Karein</span>
                  <span className="val gold">
                    Rs. {subtotal.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="ep-pay-box">
                <h3>💚 EasyPaisa se Payment Karein</h3>
                <div className="ep-num-big">
                  <div>
                    <div className="ep-num-label">EasyPaisa Account Number</div>
                    <div className="ep-num-val">{epDisplay}</div>
                  </div>
                  <button className="ep-copy-btn" onClick={onCopyEP}>
                    📋 Copy
                  </button>
                </div>
                <div className="ep-steps">
                  {[
                    <>
                      EasyPaisa app kholo ya <strong>*786#</strong> dial karo
                    </>,
                    <>
                      <strong>Send Money</strong> → Number:{' '}
                      <strong>{epDisplay}</strong>
                    </>,
                    <>
                      Amount bhejo:{' '}
                      <strong>Rs. {subtotal.toLocaleString()}</strong>
                    </>,
                    <>
                      Payment screenshot WhatsApp pe bhejo:{' '}
                      <strong>{epDisplay}</strong>
                    </>,
                  ].map((s, i) => (
                    <div key={i} className="ep-step">
                      <div className="num">{i + 1}</div>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="cb-info-box">
                <div className="cb-info-title">
                  💰 Tumhara CashBack — Guaranteed!
                </div>
                <div className="cb-row">
                  <span className="ic">🛒</span>
                  <span>
                    Aap jab ye product buy karte hain, aapko{' '}
                    <strong>
                      {BASE_CASHBACK_PERCENTAGE}% cashback (minimum Rs.{' '}
                      {calculateCashback(1000).toLocaleString()})
                    </strong>{' '}
                    milega — seedha EasyPaisa mein{' '}
                    <strong>24 ghante ke andar!</strong>
                  </span>
                </div>
                <div className="cb-row">
                  <span className="ic">👥</span>
                  <span>
                    Kisi bhi dost ko <strong>refer karo</strong> — woh
                    khareedega to aapko{' '}
                    <strong>
                      Rs. {REFER_BONUS.toLocaleString()} extra cashback
                    </strong>{' '}
                    milega!
                  </span>
                </div>
              </div>

              <div className="refer-box">
                <h3>
                  🔗 Refer Karo — Rs. {REFER_BONUS.toLocaleString()} Kamao
                </h3>
                <div className="refer-link-row">
                  <input
                    className="refer-link-input"
                    readOnly
                    value={referLink}
                  />
                  <button
                    className="btn btn-green"
                    onClick={onCopyRefer}
                    style={{
                      borderRadius: 9,
                      fontSize: '.82rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Copy 🔗
                  </button>
                </div>
                <p
                  style={{
                    fontSize: '.73rem',
                    color: 'var(--muted)',
                    marginTop: 7,
                  }}
                >
                  👆 Dosto ko bhejo — unke order pe{' '}
                  <strong style={{ color: 'var(--green)' }}>
                    Rs. {REFER_BONUS.toLocaleString()}
                  </strong>{' '}
                  tumhare EasyPaisa mein!
                </p>
              </div>

              <button className="place-order-btn" onClick={onPlaceOrder}>
                ✅ Order Confirm Karo
              </button>
              {!currentUser && (
                <p
                  style={{
                    marginTop: 10,
                    color: 'var(--muted)',
                    fontSize: '.78rem',
                    textAlign: 'center',
                  }}
                >
                  Payment confirm karne ke liye login zaroori hai.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  function LoginPage({ onLoginComplete, currentUser }) {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
      if (currentUser) navigate('/');
    }, [currentUser]);

    const submit = async (e) => {
      e.preventDefault();
      setStatus('');
      const normalizedPhone = normalizePakistanPhone(phone);
      if (!normalizedPhone) {
        setStatus('⚠️ Number format galat — +923001234567 likho');
        return;
      }
      if (!password || password.length < 6) {
        setStatus('⚠️ Password 6+ characters rakho');
        return;
      }
      try {
        setLoading(true);
        const phoneKey = phoneDigitsForQuery(normalizedPhone);
        const uidSnap = await get(child(ref(rtdb), `usersByPhone/${phoneKey}`));
        if (!uidSnap.exists()) {
          setStatus('❌ Account nahi mila. Pehle signup karo.');
          return;
        }
        const uid = uidSnap.val();
        const userSnap = await get(child(ref(rtdb), `users/${uid}`));
        const data = userSnap.exists() ? userSnap.val() : null;
        if (!data) {
          setStatus('❌ Account data nahi mila. Dobara signup karo.');
          return;
        }
        const ok = await bcrypt.compare(password, data.passwordHash || '');
        if (!ok) {
          setStatus('❌ Password galat hai');
          return;
        }
        localStorage.setItem('cbUid', uid);
        localStorage.setItem('cbPhone', normalizedPhone);
        setCurrentUser({ uid, phone: normalizedPhone });
        setStatus('🎉 Login ho gaya!');
        onLoginComplete?.();
      } catch {
        setStatus('❌ Login failed. Number/password check karo.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div id="login-page" className="page active">
        <div className="login-card">
          <div className="llogo">
            Cash<span>Back</span> Shop
          </div>
          <p className="login-sub">Phone number + password se login karo.</p>
          <form onSubmit={submit}>
            <div className="inp-group">
              <label>📱 Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+923001234567"
                autoComplete="tel"
              />
            </div>
            <div className="phone-hint">
              ⚠️ +92 ke saath likho — jaise{' '}
              <strong style={{ color: 'var(--accent2)' }}>+923001234567</strong>
            </div>
            <div className="inp-group">
              <label>🔒 Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </div>
            <button className="login-btn" disabled={loading} type="submit">
              {loading ? 'Signing in...' : '✅ Login'}
            </button>
            <button
              className="login-btn secondary"
              type="button"
              onClick={() => navigate('/signup')}
            >
              Create Account
            </button>
            <div
              className={`status-msg ${status.includes('❌') || status.includes('⚠️') ? 'error' : ''}`}
            >
              {status}
            </div>
          </form>
        </div>
      </div>
    );
  }

  function SignupPage({ onSignupComplete }) {
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const submit = async (e) => {
      e.preventDefault();
      setStatus('');
      const normalizedPhone = normalizePakistanPhone(phone);
      if (!normalizedPhone) {
        setStatus('⚠️ Number format galat — +923001234567 likho');
        return;
      }
      if (!password || password.length < 6) {
        setStatus('⚠️ Password 6+ characters rakho');
        return;
      }
      if (password !== confirmPassword) {
        setStatus('⚠️ Password match nahi kar rahe');
        return;
      }
      try {
        setLoading(true);
        const phoneKey = phoneDigitsForQuery(normalizedPhone);
        const uidSnap = await get(child(ref(rtdb), `usersByPhone/${phoneKey}`));
        if (uidSnap.exists()) {
          setStatus('❌ Ye number pehle se registered hai. Login karo.');
          return;
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const uid = crypto.randomUUID();
        await set(ref(rtdb, `users/${uid}`), {
          phone: normalizedPhone,
          passwordHash,
          createdAt: Date.now(),
          totalOrders: 0,
          totalCashback: 0,
          referBonus: 0,
        });
        await set(ref(rtdb, `usersByPhone/${phoneKey}`), uid);
        localStorage.setItem('cbUid', uid);
        localStorage.setItem('cbPhone', normalizedPhone);
        setCurrentUser({ uid, phone: normalizedPhone });
        setStatus('🎉 Account created!');
        onSignupComplete?.();
        navigate('/');
      } catch (err) {
        setStatus(err?.message || '❌ Signup failed.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div id="login-page" className="page active">
        <div className="login-card">
          <div className="llogo">
            Cash<span>Back</span> Shop
          </div>
          <p className="login-sub">Signup ke liye phone + password use karo.</p>
          <form onSubmit={submit}>
            <div className="inp-group">
              <label>📱 Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+923001234567"
                autoComplete="tel"
              />
            </div>
            <div className="phone-hint">
              ⚠️ +92 ke saath likho — jaise{' '}
              <strong style={{ color: 'var(--accent2)' }}>+923001234567</strong>
            </div>
            <div className="inp-group">
              <label>🔒 Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                autoComplete="new-password"
              />
            </div>
            <div className="inp-group">
              <label>✅ Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
            </div>
            <button className="login-btn" disabled={loading} type="submit">
              {loading ? 'Creating...' : '✅ Signup'}
            </button>
            <button
              className="login-btn secondary"
              type="button"
              onClick={() => navigate('/login')}
            >
              Already have account? Login
            </button>
            <div
              className={`status-msg ${status.includes('❌') || status.includes('⚠️') ? 'error' : ''}`}
            >
              {status}
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
