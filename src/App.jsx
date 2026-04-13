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
const INVESTMENT_RETURN_PERCENTAGE = 12; // 12% return on investment
const MIN_WITHDRAWAL_AMOUNT = 500;

// Calculate cashback based on product price (15% of price)
const calculateCashback = (price) =>
  Math.round((price * BASE_CASHBACK_PERCENTAGE) / 100);

// Calculate investment return
const calculateInvestmentReturn = (amount) =>
  Math.round((amount * INVESTMENT_RETURN_PERCENTAGE) / 100);

// Calculate daily profit
const calculateDailyProfit = (
  price,
  cycleDays = 300,
  returnPercentage = 32,
) => {
  const totalProfit = Math.round((price * returnPercentage) / 100);
  const dailyProfit = Math.round(totalProfit / cycleDays);
  return { dailyProfit, totalProfit, cycleDays, returnPercentage };
};

const PRODUCTS = [
  {
    id: 1,
    name: 'GREE Ceiling Fan 56″',
    category: 'fans',
    img: 'https://rosepng.com/wp-content/uploads/elementor/thumbs/s11728_ceiling_fan_isolated_on_white_background_-stylize_200_a571b63d-7690-4b1c-8203-2d0359b1021e_3-photoroom-png-photoroom_11zonG0niZvX-qlg1jqeweelzzokbgidts35l7xhb1d9jqke7m00rkw.png',
    price: 12999,
    description:
      'Energy efficient ceiling fan with remote control, 5-star rating',
    returnPercentage: 32,
    cycleDays: 300,
  },
  {
    id: 2,
    name: 'Super Asia Pedestal Fan 18″',
    category: 'fans',
    img: 'https://superasiastore.ae/cdn/shop/files/IndustrialstandFanDubaicopy.jpg?v=1693825504&width=1058',
    price: 7499,
    description:
      'Heavy duty pedestal fan with 3 speed settings, ideal for home and office',
    returnPercentage: 30,
    cycleDays: 280,
  },
  {
    id: 3,
    name: 'National Table Fan 12″',
    category: 'fans',
    img: 'https://s.alicdn.com/@sc04/kf/H30882940ffdc4a89922a225dad8c5bfc3/12-Inch-Table-Fan-with-Light-Bulb-Rechargeable-Electric-Solar-Fan-Emergency-High-Wind-Power-Shaking-Head-Solar-Fan.jpg_300x300.jpg',
    price: 4599,
    description: 'Compact table fan for personal use, energy saving motor',
    returnPercentage: 28,
    cycleDays: 260,
  },
  {
    id: 4,
    name: 'Dawlance Tower Fan 40″',
    category: 'fans',
    img: 'https://emperial.co.uk/cdn/shop/files/Artboard2_7eccb2db-e2d5-4055-a0cd-f3e3a0c4c3ec.jpg?v=1720622384&width=2000',
    price: 15999,
    description:
      'Sleek tower fan with oscillation, 3 speed modes, timer function',
    returnPercentage: 32,
    cycleDays: 300,
  },
  {
    id: 5,
    name: 'Pro Fitness Dumbbells Set 20kg',
    category: 'gym',
    img: 'https://images.pexels.com/photos/841130/pexels-photo-841130.jpeg?w=600&q=80',
    price: 8500,
    description: 'Premium cast iron dumbbells with stand, perfect for home gym',
    returnPercentage: 30,
    cycleDays: 280,
  },
  {
    id: 6,
    name: 'Bodylastics Resistance Bands Set',
    category: 'gym',
    img: 'https://img.drz.lazcdn.com/static/np/p/81459e7e80f1d75392055a52f8054d71.jpg_720x720q80.jpg',
    price: 2999,
    description:
      '5-piece resistance band set with door anchor, exercise guide included',
    returnPercentage: 25,
    cycleDays: 250,
  },
  {
    id: 7,
    name: 'ProSpeed Jump Rope',
    category: 'gym',
    img: 'https://www.jimkiddsports.com.au/cdn/shop/files/SHOPIFY_0000s_0001_HARBINGER-PRO-SPEED-ROPE-24351-_2.png?v=1743664296&width=2048',
    price: 899,
    description: 'Adjustable speed jump rope with ball bearings, foam handles',
    returnPercentage: 20,
    cycleDays: 200,
  },
  {
    id: 8,
    name: 'Gaiam Yoga Mat 6mm',
    category: 'gym',
    img: 'https://cdn.shopify.com/s/files/1/0044/9341/0393/files/gaiam-performance-dry-grip-yoga-mat-14.jpg?v=1610562932',
    price: 2499,
    description: 'Non-slip eco-friendly yoga mat with carrying strap',
    returnPercentage: 25,
    cycleDays: 250,
  },
  {
    id: 9,
    name: 'Perfect Fitness Ab Wheel Roller',
    category: 'gym',
    img: 'https://proiron.com/cdn/shop/articles/6_300x.jpg?v=1712124695',
    price: 1299,
    description:
      'Dual wheel ab roller with knee pad, core strengthening equipment',
    returnPercentage: 22,
    cycleDays: 220,
  },
  {
    id: 10,
    name: 'Philips Electric Kettle 1.7L',
    category: 'kitchen',
    img: 'https://pak-electronics.pk/wp-content/uploads/2023/08/Phlips-9.jpg',
    price: 5499,
    description:
      'Stainless steel electric kettle with auto shut-off, boil-dry protection',
    returnPercentage: 28,
    cycleDays: 260,
  },
  {
    id: 11,
    name: 'Tefal Non-Stick Fry Pan 28cm',
    category: 'kitchen',
    img: 'https://toplinegroup.ie/cdn/shop/files/d7af78f88f075860debdf86fe2025dc746558a2f_T_3168430264854_1024x1024.jpg?v=1719458116',
    price: 3999,
    description:
      'Thermo-spot technology, titanium non-stick coating, dishwasher safe',
    returnPercentage: 26,
    cycleDays: 250,
  },
  {
    id: 12,
    name: 'Air Fryer 4 Litre',
    category: 'kitchen',
    img: 'https://philipsappliances.pk/wp-content/uploads/2025/03/vrs_d9efe4639a2f4140c5a360d15a2396c4b1a3e345.webp',
    price: 18999,
    description:
      'Digital air fryer with 8 presets, oil-free cooking, 1700W power',
    returnPercentage: 35,
    cycleDays: 320,
  },
  {
    id: 13,
    name: 'Sony Wireless Earbuds ANC',
    category: 'electronics',
    img: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?w=600&q=80',
    price: 15999,
    description:
      'Noise cancelling earbuds with 20hr battery life, IPX4 water resistant',
    returnPercentage: 32,
    cycleDays: 300,
  },
  {
    id: 14,
    name: 'Xiaomi Power Bank 20000mAh',
    category: 'electronics',
    img: 'https://dynsol.pk/cdn/shop/files/Xiaomi_33W_Power_Bank_20000mAh_Blue_Integrated_Cable_Best_Price_in_Pakistan_Dynsol.pk.webp?v=1773478299&width=416',
    price: 4999,
    description: 'Fast charging power bank with 18W output, dual USB ports',
    returnPercentage: 27,
    cycleDays: 260,
  },
  {
    id: 15,
    name: 'Philips Smart LED Strip 5m',
    category: 'electronics',
    img: 'https://cdn1.npcdn.net/npimg/1752899168ebf9ac62dd7dbcd456eb5cc1d83ca48f.webp?md5id=d0866fb7fef7340334755089f89bdfeb&new_width=1000&new_height=1000&size=max&w=1774400981&from=jpg&type=1',
    price: 3499,
    description: 'RGB smart LED strip with app control, music sync feature',
    returnPercentage: 25,
    cycleDays: 240,
  },
  {
    id: 16,
    name: 'Anker USB-C Hub 7-in-1',
    category: 'electronics',
    img: 'https://xcessorieshub.com/wp-content/uploads/2025/07/Anker-A8355.webp',
    price: 8999,
    description: '7-port USB-C hub with 4K HDMI, Ethernet, USB 3.0 ports',
    returnPercentage: 30,
    cycleDays: 280,
  },
].map((p) => ({
  ...p,
  cashback: calculateCashback(p.price),
  profitDetails: calculateDailyProfit(p.price, p.cycleDays, p.returnPercentage),
  desc: `Assalam o Alaikum! ${p.description} Is product ko buy karne par aapko Rs. ${calculateCashback(p.price).toLocaleString()} cashback milega (24 ghante ke andar). Agar aap kisi dost ko refer karte hain, to aapko ${REFER_BONUS} extra cashback milega.`,
}));

// Payment method constants
const PAYMENT_METHODS = {
  EASYPAISA: 'easypaisa',
  JAZZCASH: 'jazzcash',
  BANK_CARD: 'bank_card',
};

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
          background: 'rgb(228, 220, 220)',
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
            background: '#ffffff',
            border: '0.5px solid #e0e0e0',
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
            icon="💰"
            label="Investment"
            onClick={() => {
              setOpen(false);
              onNavigate('/investment');
            }}
          />
          <MenuItem
            icon="🏦"
            label="Withdraw"
            onClick={() => {
              setOpen(false);
              onNavigate('/withdraw');
            }}
          />
          <MenuItem
            icon="📦"
            label="Meri Orders"
            onClick={() => {
              setOpen(false);
              onNavigate('/orders');
            }}
          />
          <MenuItem
            icon="💸"
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
        borderRight: border ? '0.5px solid #eee' : 'none',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: color || '#000',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{label}</div>
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
        color: danger ? '#c0392b' : '#000',
        background: hover ? '#f5f5f5' : 'transparent',
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
  return <div style={{ height: '0.5px', background: '#eee' }} />;
}

// ─── Investment Page Component ────────────────────────────────────────────
function InvestmentPage({ currentUser, userStats, loadUserStats, showToast }) {
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [loadingInvestments, setLoadingInvestments] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchInvestments();
  }, [currentUser, navigate]);

  const fetchInvestments = async () => {
    if (!currentUser) return;
    setLoadingInvestments(true);
    try {
      const investmentsRef = ref(rtdb, `investments/${currentUser.uid}`);
      const snapshot = await get(investmentsRef);
      if (snapshot.exists()) {
        const investmentsData = snapshot.val();
        const investmentsList = Object.entries(investmentsData).map(
          ([id, inv]) => ({
            id,
            ...inv,
            date: new Date(inv.timestamp),
            expectedReturn: calculateInvestmentReturn(inv.amount),
          }),
        );
        investmentsList.sort((a, b) => b.timestamp - a.timestamp);
        setInvestments(investmentsList);
      } else {
        setInvestments([]);
      }
    } catch (error) {
      console.error('Error fetching investments:', error);
    } finally {
      setLoadingInvestments(false);
    }
  };

  const handleInvest = async () => {
    if (!currentUser) {
      showToast('Pehle login karo!');
      navigate('/login');
      return;
    }
    const amount = parseInt(investmentAmount);
    if (isNaN(amount) || amount < 1000) {
      showToast('Investment amount kam se kam Rs. 1,000 hona chahiye');
      return;
    }
    if (amount > (userStats?.totalCashback || 0)) {
      showToast(
        'Aapke paas itna cashback nahi hai! Pehle shopping karo cashback kamao',
      );
      return;
    }
    setLoading(true);
    try {
      const investmentId = push(
        ref(rtdb, `investments/${currentUser.uid}`),
      ).key;
      const returnAmount = calculateInvestmentReturn(amount);
      await set(ref(rtdb, `investments/${currentUser.uid}/${investmentId}`), {
        amount,
        returnAmount,
        timestamp: Date.now(),
        status: 'active',
        expectedReturnDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      const userRef = ref(rtdb, `users/${currentUser.uid}`);
      const userSnap = await get(userRef);
      const currentData = userSnap.exists() ? userSnap.val() : {};
      const currentCashback = currentData.totalCashback || 0;
      const currentInvested = currentData.totalInvested || 0;
      await update(ref(rtdb, `users/${currentUser.uid}`), {
        totalCashback: currentCashback - amount,
        totalInvested: currentInvested + amount,
      });
      await set(
        ref(rtdb, `cashbackHistory/${currentUser.uid}/${investmentId}`),
        {
          type: 'investment',
          amount: -amount,
          description: `Investment of Rs. ${amount.toLocaleString()}`,
          timestamp: Date.now(),
        },
      );
      await loadUserStats(currentUser.uid);
      await fetchInvestments();
      setInvestmentAmount('');
      showToast(
        `✅ Rs. ${amount.toLocaleString()} invest kar diya! ${INVESTMENT_RETURN_PERCENTAGE}% return milega 30 din mein`,
      );
    } catch (error) {
      console.error('Error making investment:', error);
      showToast('Investment karne mein error aa gaya');
    } finally {
      setLoading(false);
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalExpectedReturn = investments.reduce(
    (sum, inv) => sum + inv.expectedReturn,
    0,
  );

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
          <div className="big">💰</div>
          <h2>Pehle Login Karo</h2>
          <p style={{ marginBottom: 20 }}>
            Investment karne ke liye login karna zaroori hai.
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
    <div id="investment-page" className="page active">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>
        <div className="cart-header">
          💰 Investment - {INVESTMENT_RETURN_PERCENTAGE}% Return in 30 Days
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: 24,
            padding: 30,
            marginBottom: 30,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 15 }}>📈</div>
          <h2 style={{ marginBottom: 10, color: '#ff6b35' }}>
            Invest Your Cashback
          </h2>
          <p style={{ color: '#aaa', marginBottom: 25 }}>
            Apne cashback ko invest karo aur {INVESTMENT_RETURN_PERCENTAGE}%
            extra return kamao 30 din mein!
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 20,
              marginBottom: 30,
            }}
          >
            <div
              style={{ background: '#000000', borderRadius: 16, padding: 20 }}
            >
              <div style={{ fontSize: 14, color: '#888', marginBottom: 5 }}>
                Available Cashback
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#22a06b' }}>
                Rs. {(userStats?.totalCashback || 0).toLocaleString()}
              </div>
            </div>
            <div
              style={{ background: '#000000', borderRadius: 16, padding: 20 }}
            >
              <div style={{ fontSize: 14, color: '#888', marginBottom: 5 }}>
                Total Invested
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#ff6b35' }}>
                Rs. {totalInvested.toLocaleString()}
              </div>
            </div>
          </div>
          <div
            style={{
              background: '#000000',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: '#888',
                marginBottom: 10,
                textAlign: 'left',
              }}
            >
              Investment Amount (Min. Rs. 1,000)
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                placeholder="Enter amount"
                style={{
                  flex: 1,
                  background: '#1a1a27',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: '14px 16px',
                  color: '#fff',
                  fontSize: 16,
                }}
              />
              <button
                onClick={handleInvest}
                disabled={loading || (userStats?.totalCashback || 0) < 1000}
                style={{
                  background: '#ff6b35',
                  border: 'none',
                  borderRadius: 12,
                  padding: '14px 28px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  opacity:
                    loading || (userStats?.totalCashback || 0) < 1000 ? 0.6 : 1,
                }}
              >
                {loading ? 'Processing...' : 'Invest Now'}
              </button>
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#888',
                marginTop: 10,
                textAlign: 'left',
              }}
            >
              💡 {INVESTMENT_RETURN_PERCENTAGE}% return on investment after 30
              days
            </div>
          </div>
        </div>
        <div style={{ background: '#1a1a27', borderRadius: 16, padding: 25 }}>
          <h3
            style={{
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            📊 Your Investments
          </h3>
          {loadingInvestments ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              Loading investments...
            </div>
          ) : investments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
              <p>Abhi tak koi investment nahi ki</p>
            </div>
          ) : (
            investments.map((inv) => (
              <div
                key={inv.id}
                style={{
                  background: '#000000',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      Rs. {inv.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      {inv.date.toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#22a06b', fontWeight: 600 }}>
                      Expected Return: Rs. {inv.expectedReturn.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: '#888' }}>
                      +{INVESTMENT_RETURN_PERCENTAGE}% in 30 days
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    height: 6,
                    background: '#333',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: '#ff6b35',
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            ))
          )}
          {totalInvested > 0 && (
            <div
              style={{
                marginTop: 20,
                padding: 15,
                background: 'rgba(34, 160, 107, 0.1)',
                borderRadius: 12,
                border: '1px solid rgba(34, 160, 107, 0.3)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <span>💰 Total Expected Return:</span>
                <strong style={{ color: '#22a06b', fontSize: 18 }}>
                  Rs. {totalExpectedReturn.toLocaleString()}
                </strong>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                Returns will be added to your cashback after 30 days
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Withdrawal Page Component ────────────────────────────────────────────
function WithdrawalPage({ currentUser, userStats, loadUserStats, showToast }) {
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('easypaisa');
  const [easyPaisaNumber, setEasyPaisaNumber] = useState('');
  const [easyPaisaName, setEasyPaisaName] = useState('');
  const [jazzCashNumber, setJazzCashNumber] = useState('');
  const [jazzCashName, setJazzCashName] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountTitle, setBankAccountTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const navigate = useNavigate();

  const bankOptions = [
    'ABL',
    'HBL',
    'NBL',
    'UBL',
    'MCB',
    'Bank Alfalah',
    'Faysal Bank',
    'Meezan Bank',
  ];

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchWithdrawals();
    if (currentUser?.easyPaisaNumber)
      setEasyPaisaNumber(currentUser.easyPaisaNumber);
    if (currentUser?.easyPaisaName) setEasyPaisaName(currentUser.easyPaisaName);
    if (currentUser?.jazzCashNumber)
      setJazzCashNumber(currentUser.jazzCashNumber);
    if (currentUser?.jazzCashName) setJazzCashName(currentUser.jazzCashName);
  }, [currentUser, navigate]);

  const fetchWithdrawals = async () => {
    if (!currentUser) return;
    setLoadingWithdrawals(true);
    try {
      const withdrawalsRef = ref(rtdb, `withdrawals/${currentUser.uid}`);
      const snapshot = await get(withdrawalsRef);
      if (snapshot.exists()) {
        const withdrawalsData = snapshot.val();
        const withdrawalsList = Object.entries(withdrawalsData).map(
          ([id, wd]) => ({ id, ...wd, date: new Date(wd.timestamp) }),
        );
        withdrawalsList.sort((a, b) => b.timestamp - a.timestamp);
        setWithdrawals(withdrawalsList);
      } else {
        setWithdrawals([]);
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoadingWithdrawals(false);
    }
  };

  const validateWithdrawal = () => {
    const amount = parseInt(withdrawAmount);
    if (isNaN(amount) || amount < MIN_WITHDRAWAL_AMOUNT) {
      showToast(
        `Withdrawal amount kam se kam Rs. ${MIN_WITHDRAWAL_AMOUNT.toLocaleString()} hona chahiye`,
      );
      return false;
    }
    if (amount > (userStats?.totalCashback || 0)) {
      showToast('Aapke paas itna cashback nahi hai!');
      return false;
    }
    if (paymentMethod === 'easypaisa') {
      const normalizedNumber = normalizePakistanPhone(easyPaisaNumber);
      if (!normalizedNumber) {
        showToast(
          'Please enter a valid EasyPaisa number (e.g., +923001234567)',
        );
        return false;
      }
      if (!easyPaisaName.trim()) {
        showToast('Please enter the account holder name for EasyPaisa');
        return false;
      }
    } else if (paymentMethod === 'jazzcash') {
      const normalizedNumber = normalizePakistanPhone(jazzCashNumber);
      if (!normalizedNumber) {
        showToast('Please enter a valid JazzCash number (e.g., +923001234567)');
        return false;
      }
      if (!jazzCashName.trim()) {
        showToast('Please enter the account holder name for JazzCash');
        return false;
      }
    } else if (paymentMethod === 'bank') {
      if (!selectedBank) {
        showToast('Please select a bank');
        return false;
      }
      if (!bankAccountNumber.trim() || bankAccountNumber.length < 5) {
        showToast('Please enter a valid bank account number');
        return false;
      }
      if (!bankAccountTitle.trim()) {
        showToast('Please enter the account title');
        return false;
      }
    }
    return true;
  };

  const handleWithdraw = async () => {
    if (!currentUser) {
      showToast('Pehle login karo!');
      navigate('/login');
      return;
    }
    if (!validateWithdrawal()) return;
    const amount = parseInt(withdrawAmount);
    setLoading(true);
    try {
      const withdrawalId = push(
        ref(rtdb, `withdrawals/${currentUser.uid}`),
      ).key;
      let withdrawalData = {
        amount,
        paymentMethod,
        timestamp: Date.now(),
        status: 'pending',
      };
      let userUpdateData = {};
      if (paymentMethod === 'easypaisa') {
        const normalizedNumber = normalizePakistanPhone(easyPaisaNumber);
        withdrawalData.easyPaisaNumber = normalizedNumber;
        withdrawalData.easyPaisaName = easyPaisaName;
        userUpdateData.easyPaisaNumber = normalizedNumber;
        userUpdateData.easyPaisaName = easyPaisaName;
      } else if (paymentMethod === 'jazzcash') {
        const normalizedNumber = normalizePakistanPhone(jazzCashNumber);
        withdrawalData.jazzCashNumber = normalizedNumber;
        withdrawalData.jazzCashName = jazzCashName;
        userUpdateData.jazzCashNumber = normalizedNumber;
        userUpdateData.jazzCashName = jazzCashName;
      } else if (paymentMethod === 'bank') {
        withdrawalData.bankName = selectedBank;
        withdrawalData.bankAccountNumber = bankAccountNumber;
        withdrawalData.bankAccountTitle = bankAccountTitle;
        userUpdateData.bankName = selectedBank;
        userUpdateData.bankAccountNumber = bankAccountNumber;
        userUpdateData.bankAccountTitle = bankAccountTitle;
      }
      await set(
        ref(rtdb, `withdrawals/${currentUser.uid}/${withdrawalId}`),
        withdrawalData,
      );
      const userRef = ref(rtdb, `users/${currentUser.uid}`);
      const userSnap = await get(userRef);
      const currentData = userSnap.exists() ? userSnap.val() : {};
      const currentCashback = currentData.totalCashback || 0;
      await update(ref(rtdb, `users/${currentUser.uid}`), {
        totalCashback: currentCashback - amount,
        ...userUpdateData,
      });
      await set(
        ref(rtdb, `cashbackHistory/${currentUser.uid}/${withdrawalId}`),
        {
          type: 'withdrawal',
          amount: -amount,
          description: `Withdrawal of Rs. ${amount.toLocaleString()} via ${paymentMethod === 'easypaisa' ? 'EasyPaisa' : paymentMethod === 'jazzcash' ? 'JazzCash' : 'Bank Transfer'}`,
          timestamp: Date.now(),
          status: 'pending',
          paymentMethod,
        },
      );
      await loadUserStats(currentUser.uid);
      await fetchWithdrawals();
      setWithdrawAmount('');
      if (paymentMethod === 'easypaisa') {
        setEasyPaisaNumber('');
        setEasyPaisaName('');
      } else if (paymentMethod === 'jazzcash') {
        setJazzCashNumber('');
        setJazzCashName('');
      } else if (paymentMethod === 'bank') {
        setSelectedBank('');
        setBankAccountNumber('');
        setBankAccountTitle('');
      }
      showToast(
        `✅ Withdrawal request of Rs. ${amount.toLocaleString()} submitted! Amount will be processed within 24-48 hours.`,
      );
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      showToast('Withdrawal karne mein error aa gaya');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return {
          text: 'Pending',
          color: '#cf7808',
          bg: 'rgba(207, 120, 8, 0.1)',
        };
      case 'approved':
        return {
          text: 'Approved',
          color: '#22a06b',
          bg: 'rgba(34, 160, 107, 0.1)',
        };
      case 'completed':
        return {
          text: 'Completed',
          color: '#22a06b',
          bg: 'rgba(34, 160, 107, 0.2)',
        };
      case 'rejected':
        return {
          text: 'Rejected',
          color: '#c0392b',
          bg: 'rgba(192, 57, 43, 0.1)',
        };
      default:
        return { text: status, color: '#888', bg: 'rgba(136, 136, 136, 0.1)' };
    }
  };

  const getPaymentMethodDisplay = (wd) => {
    if (wd.paymentMethod === 'easypaisa')
      return `EasyPaisa: ${wd.easyPaisaNumber} (${wd.easyPaisaName || 'N/A'})`;
    if (wd.paymentMethod === 'jazzcash')
      return `JazzCash: ${wd.jazzCashNumber} (${wd.jazzCashName || 'N/A'})`;
    if (wd.paymentMethod === 'bank')
      return `${wd.bankName}: ${wd.bankAccountNumber} (${wd.bankAccountTitle || 'N/A'})`;
    return wd.paymentMethod || 'Unknown';
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
          <div className="big">🏦</div>
          <h2>Pehle Login Karo</h2>
          <p style={{ marginBottom: 20 }}>
            Withdrawal karne ke liye login karna zaroori hai.
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
    <div id="withdrawal-page" className="page active">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>
        <div className="cart-header">🏦 Withdraw Cashback</div>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: 24,
            padding: 30,
            marginBottom: 30,
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 25 }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>💸</div>
            <h2 style={{ marginBottom: 5, color: '#ff6b35' }}>
              Withdraw Your Cashback
            </h2>
            <p style={{ color: '#aaa' }}>
              Select your preferred withdrawal method
            </p>
          </div>
          <div
            style={{
              background: '#000000',
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 14, color: '#888', marginBottom: 5 }}>
              Available Balance
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, color: '#22a06b' }}>
              Rs. {(userStats?.totalCashback || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 5 }}>
              Minimum withdrawal: Rs. {MIN_WITHDRAWAL_AMOUNT.toLocaleString()}
            </div>
          </div>
          <div style={{ marginBottom: 25 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 10,
                fontSize: 14,
                color: '#aaa',
              }}
            >
              Select Withdrawal Method
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}
            >
              {[
                { id: 'easypaisa', label: '📱 EasyPaisa', color: '#22a06b' },
                { id: 'jazzcash', label: '💳 JazzCash', color: '#ff6b35' },
                { id: 'bank', label: '🏦 Bank Transfer', color: '#3b82f6' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  style={{
                    background:
                      paymentMethod === method.id ? method.color : '#1a1a27',
                    border:
                      paymentMethod === method.id ? 'none' : '1px solid #333',
                    borderRadius: 12,
                    padding: '12px',
                    color: paymentMethod === method.id ? '#fff' : '#aaa',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>
          {paymentMethod === 'easypaisa' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 15 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 14,
                    color: '#aaa',
                  }}
                >
                  📱 EasyPaisa Number
                </label>
                <input
                  type="tel"
                  value={easyPaisaNumber}
                  onChange={(e) => setEasyPaisaNumber(e.target.value)}
                  placeholder="+923001234567"
                  style={{
                    width: '100%',
                    background: '#1a1a27',
                    border: '1px solid #333',
                    borderRadius: 12,
                    padding: '14px 16px',
                    color: '#fff',
                    fontSize: 16,
                  }}
                />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 14,
                    color: '#aaa',
                  }}
                >
                  👤 Account Holder Name
                </label>
                <input
                  type="text"
                  value={easyPaisaName}
                  onChange={(e) => setEasyPaisaName(e.target.value)}
                  placeholder="As per CNIC"
                  style={{
                    width: '100%',
                    background: '#1a1a27',
                    border: '1px solid #333',
                    borderRadius: 12,
                    padding: '14px 16px',
                    color: '#fff',
                    fontSize: 16,
                  }}
                />
              </div>
            </div>
          )}
          {paymentMethod === 'jazzcash' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 15 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 14,
                    color: '#aaa',
                  }}
                >
                  💳 JazzCash Number
                </label>
                <input
                  type="tel"
                  value={jazzCashNumber}
                  onChange={(e) => setJazzCashNumber(e.target.value)}
                  placeholder="+923001234567"
                  style={{
                    width: '100%',
                    background: '#1a1a27',
                    border: '1px solid #333',
                    borderRadius: 12,
                    padding: '14px 16px',
                    color: '#fff',
                    fontSize: 16,
                  }}
                />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 14,
                    color: '#aaa',
                  }}
                >
                  👤 Account Holder Name
                </label>
                <input
                  type="text"
                  value={jazzCashName}
                  onChange={(e) => setJazzCashName(e.target.value)}
                  placeholder="As per CNIC"
                  style={{
                    width: '100%',
                    background: '#1a1a27',
                    border: '1px solid #333',
                    borderRadius: 12,
                    padding: '14px 16px',
                    color: '#fff',
                    fontSize: 16,
                  }}
                />
              </div>
            </div>
          )}
          {paymentMethod === 'bank' && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ marginBottom: 15 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 14,
                    color: '#aaa',
                  }}
                >
                  🏦 Select Bank
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#1a1a27',
                    border: '1px solid #333',
                    borderRadius: 12,
                    padding: '14px 16px',
                    color: '#fff',
                    fontSize: 16,
                  }}
                >
                  <option value="">-- Select Bank --</option>
                  {bankOptions.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 15 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 14,
                    color: '#aaa',
                  }}
                >
                  🔢 Account Number
                </label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Enter bank account number"
                  style={{
                    width: '100%',
                    background: '#1a1a27',
                    border: '1px solid #333',
                    borderRadius: 12,
                    padding: '14px 16px',
                    color: '#fff',
                    fontSize: 16,
                  }}
                />
              </div>
              <div style={{ marginBottom: 15 }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: 8,
                    fontSize: 14,
                    color: '#aaa',
                  }}
                >
                  📝 Account Title
                </label>
                <input
                  type="text"
                  value={bankAccountTitle}
                  onChange={(e) => setBankAccountTitle(e.target.value)}
                  placeholder="As per bank statement"
                  style={{
                    width: '100%',
                    background: '#1a1a27',
                    border: '1px solid #333',
                    borderRadius: 12,
                    padding: '14px 16px',
                    color: '#fff',
                    fontSize: 16,
                  }}
                />
              </div>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 14,
                color: '#aaa',
              }}
            >
              💰 Withdrawal Amount
            </label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder={`Min. Rs. ${MIN_WITHDRAWAL_AMOUNT.toLocaleString()}`}
              style={{
                width: '100%',
                background: '#1a1a27',
                border: '1px solid #333',
                borderRadius: 12,
                padding: '14px 16px',
                color: '#fff',
                fontSize: 16,
              }}
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={
              loading || (userStats?.totalCashback || 0) < MIN_WITHDRAWAL_AMOUNT
            }
            style={{
              width: '100%',
              background: '#ff6b35',
              border: 'none',
              borderRadius: 12,
              padding: '16px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 16,
              opacity:
                loading ||
                (userStats?.totalCashback || 0) < MIN_WITHDRAWAL_AMOUNT
                  ? 0.6
                  : 1,
            }}
          >
            {loading ? 'Processing...' : 'Withdraw Now'}
          </button>
        </div>
        <div style={{ background: '#1a1a27', borderRadius: 16, padding: 25 }}>
          <h3
            style={{
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            📋 Withdrawal History
          </h3>
          {loadingWithdrawals ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              Loading history...
            </div>
          ) : withdrawals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>📭</div>
              <p>Abhi tak koi withdrawal request nahi ki</p>
            </div>
          ) : (
            withdrawals.map((wd) => {
              const statusBadge = getStatusBadge(wd.status);
              return (
                <div
                  key={wd.id}
                  style={{
                    background: '#000000',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>
                        Rs. {wd.amount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        {wd.date.toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span
                        style={{
                          background: statusBadge.bg,
                          color: statusBadge.color,
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        {statusBadge.text}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#aaa', marginTop: 8 }}>
                    📱 {getPaymentMethodDisplay(wd)}
                  </div>
                  {wd.status === 'pending' && (
                    <div
                      style={{ fontSize: 11, color: '#cf7808', marginTop: 8 }}
                    >
                      ⏳ Processing - Will be sent within 24-48 hours
                    </div>
                  )}
                  {wd.status === 'completed' && (
                    <div
                      style={{ fontSize: 11, color: '#22a06b', marginTop: 8 }}
                    >
                      ✅ Amount sent to your account
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div
          style={{
            marginTop: 20,
            padding: 15,
            background: 'rgba(255, 107, 53, 0.1)',
            borderRadius: 12,
            border: '1px solid rgba(255, 107, 53, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <span>💡</span>
            <strong>Withdrawal Information:</strong>
          </div>
          <ul
            style={{ margin: 0, paddingLeft: 20, color: '#aaa', fontSize: 13 }}
          >
            <li>
              Minimum withdrawal amount: Rs.{' '}
              {MIN_WITHDRAWAL_AMOUNT.toLocaleString()}
            </li>
            <li>Withdrawals are processed within 24-48 hours</li>
            <li>Make sure your account details are correct</li>
            <li>You can withdraw via EasyPaisa, JazzCash, or Bank Transfer</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Referral Page Component ────────────────────────────────────────────
function ReferralPage({ currentUser, onCopyRefer, referLink }) {
  const navigate = useNavigate();
  const [copySuccess, setCopySuccess] = useState(false);

  const shareOnWhatsApp = () => {
    const message = `Assalam o Alaikum! 🎉\n\nJoin CashBack Shop and earn ${BASE_CASHBACK_PERCENTAGE}% cashback on every purchase! Also invest your cashback to earn ${INVESTMENT_RETURN_PERCENTAGE}% extra returns! Use my referral link to get started:\n\n${referLink}\n\nAapko bhi cashback milega aur mujhe bhi! 💰`;
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
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>
                  {entry.type === 'order'
                    ? 'Order Cashback'
                    : entry.type === 'referral'
                      ? 'Referral Bonus'
                      : entry.type === 'investment'
                        ? 'Investment'
                        : entry.type === 'withdrawal'
                          ? 'Withdrawal'
                          : 'Other'}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {entry.date.toLocaleDateString()}
                </div>
                {entry.description && (
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {entry.description}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: entry.amount > 0 ? '#22a06b' : '#c0392b',
                }}
              >
                {entry.amount > 0 ? '+' : ''}
                {entry.amount.toLocaleString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Live Balance Marquee Component ─────────────────────────────────────────
function LiveBalanceMarquee({ userStats, loadingStats, currentUser }) {
  const withdrawalMessages = [
    { user: '+92331****5679', amount: 500 },
    { user: '+92341****5099', amount: 300 },
    { user: '+92343****5649', amount: 200 },
    { user: '+92316****4523', amount: 2300 },
    { user: '+92317****7891', amount: 1300 },
    { user: '+92322****3344', amount: 750 },
    { user: '+92345****6789', amount: 1200 },
    { user: '+92312****3456', amount: 4500 },
    { user: '+92333****7890', amount: 800 },
    { user: '+92344****1122', amount: 600 },
  ];
  const scrollingItems = [...withdrawalMessages, ...withdrawalMessages];

  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #1a1a27, #0f0f1a, #1a1a27)',
        padding: '12px 20px',
        borderRadius: 40,
        margin: '0 20px 20px 20px',
        textAlign: 'center',
        border: '1px solid rgba(255,107,53,0.3)',
        boxShadow: '0 0 10px rgba(255,107,53,0.2)',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        position: 'relative',
      }}
    >
      <div
        className="marquee-track"
        style={{
          display: 'inline-flex',
          gap: '40px',
          fontSize: '14px',
          fontWeight: 500,
          animation: 'marquee 25s linear infinite',
          whiteSpace: 'nowrap',
        }}
      >
        {scrollingItems.map((item, idx) => (
          <span key={idx} style={{ color: '#ffffff' }}>
            👤 {item.user} withdrew Rs {item.amount.toLocaleString()}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } } .marquee-track:hover { animation-play-state: paused; } @media (max-width: 768px) { .marquee-track { animation-duration: 35s; gap: 25px; } }`}</style>
    </div>
  );
}

// ─── Info Cards Component ─────────────────────────────────────────
function InfoCards({ onNavigate }) {
  const cards = [
    {
      icon: '🏦',
      title: 'Withdraw Cashback',
      description: 'Withdraw your cashback directly',
      color: '#ff6b35',
      link: '/withdraw',
    },
    {
      icon: '📖',
      title: 'About Us',
      description: 'Learn more about Cashback Store',
      color: '#22a06b',
      link: '#',
    },
    {
      icon: '👥',
      title: 'Our Team',
      description: 'Meet the team behind Cashback Store',
      color: '#3b82f6',
      link: '#',
    },
    {
      icon: '🛡️',
      title: 'Support',
      description: '24/7 customer support',
      color: '#a855f7',
      link: '#',
    },
  ];
  const handleCardClick = (card) => {
    if (card.link === '/withdraw') onNavigate(card.link);
    else alert(`${card.title} - Coming Soon!`);
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        margin: '30px 20px',
        padding: '0',
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          onClick={() => handleCardClick(card)}
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: 20,
            padding: '20px 15px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            border: `1px solid ${card.color}30`,
            boxShadow: `0 4px 15px ${card.color}10`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = `0 8px 25px ${card.color}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 4px 15px ${card.color}10`;
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '10px' }}>
            {card.icon}
          </div>
          <div
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: card.color,
              marginBottom: '8px',
            }}
          >
            {card.title}
          </div>
          <div style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.4 }}>
            {card.description}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App Shell ────────────────────────────────────────────────────────────
function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [lastOrderItems, setLastOrderItems] = useState([]);
  const [lastOrderAmount, setLastOrderAmount] = useState(0);
  const [userStats, setUserStats] = useState({
    totalOrders: 0,
    totalCashback: 0,
    referBonus: 0,
    totalInvested: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderCashbackTotal, setOrderCashbackTotal] = useState(0);

  const showToast = (msg) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(''), 3200);
  };

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
      let totalOrders = 0,
        totalCashback = 0;
      if (ordersSnap.exists()) {
        const orders = ordersSnap.val();
        totalOrders = Object.keys(orders).length;
        Object.values(orders).forEach((order) => {
          totalCashback += order.cashbackEarned || 0;
        });
      }
      const userRef = ref(rtdb, `users/${uid}`);
      const userSnap = await get(userRef);
      let referBonus = 0,
        totalInvested = 0;
      if (userSnap.exists()) {
        referBonus = userSnap.val().referBonus || 0;
        totalInvested = userSnap.val().totalInvested || 0;
      }
      totalCashback += referBonus;
      setUserStats({ totalOrders, totalCashback, referBonus, totalInvested });
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
  const referLink = useMemo(() => {
    if (!currentUser?.phone) return 'Login karo...';
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

  const placeOrder = async (product, paymentMethod, paymentDetails) => {
    if (!currentUser) {
      showToast('Pehle login karo!');
      navigate('/login');
      return;
    }
    if (!product) {
      showToast('Product select karo');
      return;
    }
    const orderItems = [{ ...product, qty: 1 }];
    const subtotal = product.price;
    const cashbackTotal = product.cashback;
    try {
      const orderId = push(ref(rtdb, `orders/${currentUser.uid}`)).key;
      await set(ref(rtdb, `orders/${currentUser.uid}/${orderId}`), {
        id: orderId,
        userId: currentUser.uid,
        items: orderItems,
        totalAmount: subtotal,
        cashbackEarned: cashbackTotal,
        paymentMethod,
        paymentDetails,
        timestamp: Date.now(),
        status: 'pending',
      });
      await set(ref(rtdb, `cashbackHistory/${currentUser.uid}/${orderId}`), {
        type: 'order',
        amount: cashbackTotal,
        orderId,
        description: `Cashback from order worth Rs. ${subtotal.toLocaleString()}`,
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
          const referrerCashback = referrerSnap.exists()
            ? referrerSnap.val().totalCashback || 0
            : 0;
          await update(ref(rtdb, `users/${referrerUid}`), {
            referBonus: currentReferBonus + REFER_BONUS,
            totalCashback: referrerCashback + REFER_BONUS,
          });
          await set(ref(rtdb, `cashbackHistory/${referrerUid}/${Date.now()}`), {
            type: 'referral',
            amount: REFER_BONUS,
            referredUser: currentUser.uid,
            description: `Referral bonus for referring user ${currentUser.phone}`,
            timestamp: Date.now(),
          });
        }
      }
      await loadUserStats(currentUser.uid);
      setLastOrderItems(orderItems);
      setLastOrderAmount(subtotal);
      setOrderCashbackTotal(cashbackTotal);
      setOrderModalOpen(true);
    } catch (error) {
      console.error('Error placing order:', error);
      showToast('Order place karne mein error aa gaya');
    }
  };

  const closeOrderModal = () => {
    setOrderModalOpen(false);
    navigate('/');
  };
  const shareWhatsApp = () => {
    const items = lastOrderItems
      .map(
        (i) =>
          `• ${i.name} ×${i.qty} = Rs.${(i.price * i.qty).toLocaleString()}`,
      )
      .join('\n');
    const msg = `Assalam o Alaikum!\n\nMera order confirm karna hai:\n\n${items}\n\nTotal: Rs. ${lastOrderAmount.toLocaleString()}\n\nPayment: EasyPaisa ${EP_DISPLAY}\n\nCashback: ${BASE_CASHBACK_PERCENTAGE}% (Rs. ${orderCashbackTotal.toLocaleString()})\n\nInvestment: Earn ${INVESTMENT_RETURN_PERCENTAGE}% on cashback!`;
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
          Cash<span>back</span> Store
        </div>
        <div className="nav-right">
          <div>
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
        </div>
      </nav>
      <LiveBalanceMarquee
        userStats={userStats}
        loadingStats={loadingStats}
        currentUser={currentUser}
      />
      <InfoCards onNavigate={navigate} />
      <div
        id="toast"
        className={toast ? 'show' : ''}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:id" element={<DetailPage />} />
        <Route
          path="/payment/:id"
          element={
            <PaymentPage
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
              setCurrentUser={setCurrentUser}
              loadUserStats={loadUserStats}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <SignupPage
              onSignupComplete={() => navigate('/')}
              setCurrentUser={setCurrentUser}
              loadUserStats={loadUserStats}
            />
          }
        />
        <Route
          path="/investment"
          element={
            <InvestmentPage
              currentUser={currentUser}
              userStats={userStats}
              loadUserStats={loadUserStats}
              showToast={showToast}
            />
          }
        />
        <Route
          path="/withdraw"
          element={
            <WithdrawalPage
              currentUser={currentUser}
              userStats={userStats}
              loadUserStats={loadUserStats}
              showToast={showToast}
            />
          }
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
        {orderModalOpen && (
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
              <br />
              <br />
              💡 Tip: Invest your cashback to earn{' '}
              {INVESTMENT_RETURN_PERCENTAGE}% extra returns!
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
        )}
      </div>
      <footer>
        <span>© {new Date().getFullYear()} Cashback Store Pakistan</span>
        <span>💚 {BASE_CASHBACK_PERCENTAGE}% Cashback on Every Purchase!</span>
        <span>📈 {INVESTMENT_RETURN_PERCENTAGE}% Returns on Investment</span>
      </footer>
    </>
  );

  // ── Page components ────────────────────────────────────────────
  function HomePage() {
    const [filter, setFilter] = useState('all');
    const list = useMemo(
      () =>
        filter === 'all'
          ? PRODUCTS
          : PRODUCTS.filter((p) => p.category === filter),
      [filter],
    );
    const navigate = useNavigate();
    const userPhone = currentUser?.phone || 'Not Logged In';
    const maskedPhone =
      userPhone !== 'Not Logged In'
        ? userPhone.replace(/(\+92\d{3})\d{6}/, '$1******')
        : 'Not Logged In';
    const totalBalance = (userStats?.totalCashback || 0).toLocaleString();
    return (
      <div className="page active">
        <section className="hero">
          <div className="cb-banner">
            <span className="dot"></span> Cashback Store official portal
          </div>
          <div
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: 16,
              padding: '12px 20px',
              margin: '15px 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '15px',
            }}
          >
            <div>
              <span style={{ fontSize: '15px', color: '#0d0c0c' }}>
                User ID:
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  marginLeft: '8px',
                  color: '#ff6b35',
                }}
              >
                {maskedPhone}
              </span>
            </div>
            <div>
              <span style={{ fontSize: '15px', color: '#000000' }}>
                Total Balance:
              </span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginLeft: '8px',
                  color: '#22a06b',
                }}
              >
                Rs. {totalBalance}
              </span>
            </div>
          </div>
          <h1>
            Smart Products.
            <br />
            <em>Direct Payment.</em>
          </h1>
          <p>
            Premium product collection, fast checkout, secure login/signup, and
            rewards on every order. Keep shopping and grow your cashback balance
            with every purchase.
          </p>
        </section>
        <section className="home-highlights">
          <div className="highlight-card">
            <div className="h-title">Secure Account</div>
            <p>Phone-based signup, login, and logout already active.</p>
          </div>
          <div className="highlight-card">
            <div className="h-title">Instant Rewards</div>
            <p>
              {BASE_CASHBACK_PERCENTAGE}% cashback credited after purchase flow.
            </p>
          </div>
          <div className="highlight-card">
            <div className="h-title">Growth Potential</div>
            <p>
              Reinvest cashback and target {INVESTMENT_RETURN_PERCENTAGE}%
              return opportunities.
            </p>
          </div>
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
          {list.map((p) => (
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
                  className="add-cart-btn"
                  style={{ width: '100%', padding: 9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/payment/${p.id}`);
                  }}
                >
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function DetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const p = useMemo(
      () => PRODUCTS.find((x) => String(x.id) === String(id)) || null,
      [id],
    );
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
    const { dailyProfit, totalProfit, cycleDays, returnPercentage } =
      p.profitDetails;
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
              <div
                style={{
                  background: '#1a1a27',
                  borderRadius: 16,
                  padding: 20,
                  marginTop: 20,
                }}
              >
                <h3 style={{ marginBottom: 15, fontSize: 16 }}>
                  📈 Investment Details
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: '#888' }}>Cycle</div>
                    <div style={{ fontWeight: 600 }}>{cycleDays} Days</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      Rate of Return
                    </div>
                    <div style={{ fontWeight: 600, color: '#22a06b' }}>
                      {returnPercentage}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      Daily Profit (est.)
                    </div>
                    <div style={{ fontWeight: 600, color: '#ff6b35' }}>
                      Rs. {dailyProfit.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#888' }}>
                      Total Profit
                    </div>
                    <div style={{ fontWeight: 600, color: '#22a06b' }}>
                      Rs. {totalProfit.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 15,
                    height: 8,
                    background: '#333',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(dailyProfit / ((p.price * returnPercentage) / 100 / cycleDays)) * 100}%`,
                      height: '100%',
                      background: '#ff6b35',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
              <button
                className="detail-add-btn"
                onClick={() => navigate(`/payment/${p.id}`)}
              >
                Buy Now
              </button>
              <button
                className="btn btn-outline"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  marginTop: 10,
                }}
                onClick={() => navigate(`/payment/${p.id}`)}
              >
                Go to Payment →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function PaymentPage({
    epDisplay,
    referLink,
    onCopyEP,
    onCopyRefer,
    onPlaceOrder,
    currentUser,
  }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState('easypaisa');
    const [paymentDetails, setPaymentDetails] = useState({});
    const product = useMemo(
      () => PRODUCTS.find((x) => String(x.id) === String(id)) || null,
      [id],
    );

    if (!product)
      return (
        <div id="cart-page" className="page active">
          <div style={{ padding: '0', maxWidth: 780, margin: '0 auto' }}>
            <div className="back-btn" onClick={() => navigate('/')}>
              ← Back to Products
            </div>
            <div className="cart-empty">
              <div className="big">❌</div>
              <p>Product not found.</p>
            </div>
          </div>
        </div>
      );

    const subtotal = product.price;
    const cashbackTotal = product.cashback;
    const { dailyProfit, totalProfit, cycleDays, returnPercentage } =
      product.profitDetails;

    const handlePaymentMethodChange = (method) => {
      setPaymentMethod(method);
      if (method === 'easypaisa') setPaymentDetails({ name: '', number: '' });
      else if (method === 'jazzcash')
        setPaymentDetails({ name: '', number: '' });
      else if (method === 'bank_card')
        setPaymentDetails({ cardNumber: '', expiry: '', cvv: '', name: '' });
    };

    const handlePlaceOrder = () => {
      let isValid = false;
      if (paymentMethod === 'easypaisa')
        isValid =
          paymentDetails.name &&
          paymentDetails.number &&
          paymentDetails.number.length >= 10;
      else if (paymentMethod === 'jazzcash')
        isValid =
          paymentDetails.name &&
          paymentDetails.number &&
          paymentDetails.number.length >= 10;
      else if (paymentMethod === 'bank_card')
        isValid =
          paymentDetails.cardNumber &&
          paymentDetails.cardNumber.length >= 15 &&
          paymentDetails.expiry &&
          paymentDetails.cvv &&
          paymentDetails.name;
      if (!isValid) {
        alert('Please fill all payment details correctly');
        return;
      }
      onPlaceOrder(product, paymentMethod, paymentDetails);
    };

    return (
      <div id="cart-page" className="page active">
        <div style={{ padding: '0', maxWidth: 780, margin: '0 auto' }}>
          <div className="back-btn" onClick={() => navigate('/')}>
            ← Back to Products
          </div>
          <div className="cart-item" style={{ marginBottom: 14 }}>
            <div className="ci-img">
              <img
                src={product.img}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK;
                }}
              />
            </div>
            <div className="ci-info">
              <div className="ci-name">{product.name}</div>
              <div className="ci-price">
                Rs. {product.price.toLocaleString()}
              </div>
              <div
                style={{ color: '#22a06b', fontSize: '.86rem', marginTop: 6 }}
              >
                Cashback: Rs. {product.cashback.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="order-summary">
            <div className="os-title">Payment Summary</div>
            <div className="os-row">
              <span className="lbl">Price</span>
              <span className="val">Rs. {subtotal.toLocaleString()}</span>
            </div>
            <div className="os-row">
              <span className="lbl">Cycle</span>
              <span className="val">{cycleDays} Days</span>
            </div>
            <div className="os-row">
              <span className="lbl">Rate of Return</span>
              <span className="val green">{returnPercentage}%</span>
            </div>
            <div className="os-row">
              <span className="lbl">Daily Profit</span>
              <span className="val gold">
                Rs. {dailyProfit.toLocaleString()}
              </span>
            </div>
            <div className="os-row">
              <span className="lbl">Total Profit</span>
              <span className="val green">
                Rs. {totalProfit.toLocaleString()}
              </span>
            </div>
            <div className="os-row">
              <span className="lbl">Cashback</span>
              <span className="val green">
                Rs. {cashbackTotal.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="ep-pay-box">
            <h3>Select Payment Method</h3>
            <div style={{ display: 'grid', gap: 8, marginBottom: 14 }}>
              {[
                { id: 'easypaisa', label: '📱 EasyPaisa' },
                { id: 'jazzcash', label: '💳 JazzCash' },
                { id: 'bank_card', label: '💳 Bank Card' },
              ].map((m) => (
                <button
                  key={m.id}
                  className={`tab ${paymentMethod === m.id ? 'active' : ''}`}
                  onClick={() => handlePaymentMethodChange(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {paymentMethod === 'easypaisa' && (
              <div
                style={{
                  background: '#1a1a27',
                  borderRadius: 16,
                  padding: 20,
                  marginTop: 15,
                }}
              >
                <h4 style={{ marginBottom: 15, color: '#22a06b' }}>
                  EasyPaisa Payment
                </h4>
                <div
                  style={{
                    background: '#000',
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 15,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#888' }}>
                    Send payment to
                  </div>
                  <div
                    style={{ fontSize: 24, fontWeight: 700, color: '#ff6b35' }}
                  >
                    Mubariz
                  </div>
                  <div
                    style={{ fontSize: 20, fontWeight: 600, color: '#22a06b' }}
                  >
                    0318-9023001
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                    After payment, take screenshot
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={paymentDetails.name || ''}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        name: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 10,
                      padding: '12px',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="EasyPaisa Number"
                    value={paymentDetails.number || ''}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        number: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 10,
                      padding: '12px',
                      color: '#fff',
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 15,
                    background: '#0f0f1a',
                    borderRadius: 10,
                    padding: 15,
                    border: '1px dashed #ff6b35',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>
                    📸 Upload Payment Screenshot
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ width: '100%', color: '#fff' }}
                    onChange={(e) => {
                      if (e.target.files[0])
                        alert('Screenshot selected: ' + e.target.files[0].name);
                    }}
                  />
                </div>
              </div>
            )}
            {paymentMethod === 'jazzcash' && (
              <div
                style={{
                  background: '#1a1a27',
                  borderRadius: 16,
                  padding: 20,
                  marginTop: 15,
                }}
              >
                <h4 style={{ marginBottom: 15, color: '#ff6b35' }}>
                  JazzCash Payment
                </h4>
                <div
                  style={{
                    background: '#000',
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 15,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 12, color: '#888' }}>
                    Send payment to
                  </div>
                  <div
                    style={{ fontSize: 24, fontWeight: 700, color: '#ff6b35' }}
                  >
                    Mubariz
                  </div>
                  <div
                    style={{ fontSize: 20, fontWeight: 600, color: '#ff6b35' }}
                  >
                    0318-9023001
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                    After payment, take screenshot
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={paymentDetails.name || ''}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        name: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 10,
                      padding: '12px',
                      color: '#fff',
                    }}
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="JazzCash Number"
                    value={paymentDetails.number || ''}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        number: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 10,
                      padding: '12px',
                      color: '#fff',
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 15,
                    background: '#0f0f1a',
                    borderRadius: 10,
                    padding: 15,
                    border: '1px dashed #ff6b35',
                  }}
                >
                  <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>
                    📸 Upload Payment Screenshot
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ width: '100%', color: '#fff' }}
                    onChange={(e) => {
                      if (e.target.files[0])
                        alert('Screenshot selected: ' + e.target.files[0].name);
                    }}
                  />
                </div>
              </div>
            )}
            {paymentMethod === 'bank_card' && (
              <div
                style={{
                  background: '#1a1a27',
                  borderRadius: 16,
                  padding: 20,
                  marginTop: 15,
                }}
              >
                <h4 style={{ marginBottom: 15, color: '#3b82f6' }}>
                  Bank Card Payment
                </h4>
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Cardholder Name"
                    value={paymentDetails.name || ''}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        name: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 10,
                      padding: '12px',
                      color: '#fff',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <input
                    type="text"
                    placeholder="Card Number (16 digits)"
                    value={paymentDetails.cardNumber || ''}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        cardNumber: e.target.value,
                      })
                    }
                    style={{
                      width: '100%',
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 10,
                      padding: '12px',
                      color: '#fff',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    value={paymentDetails.expiry || ''}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        expiry: e.target.value,
                      })
                    }
                    style={{
                      flex: 1,
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 10,
                      padding: '12px',
                      color: '#fff',
                    }}
                  />
                  <input
                    type="password"
                    placeholder="CVV"
                    value={paymentDetails.cvv || ''}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        cvv: e.target.value,
                      })
                    }
                    style={{
                      flex: 1,
                      background: '#0f0f1a',
                      border: '1px solid #333',
                      borderRadius: 10,
                      padding: '12px',
                      color: '#fff',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="refer-box">
            <h3>Invite & Earn</h3>
            <div className="refer-link-row">
              <input className="refer-link-input" readOnly value={referLink} />
              <button
                className="btn btn-green"
                onClick={onCopyRefer}
                style={{
                  borderRadius: 9,
                  fontSize: '.82rem',
                  whiteSpace: 'nowrap',
                }}
              >
                Copy Link
              </button>
            </div>
          </div>
          <button className="place-order-btn" onClick={handlePlaceOrder}>
            Buy now
          </button>
          {!currentUser && (
            <p
              style={{
                marginTop: 10,
                color: '#888',
                fontSize: '.78rem',
                textAlign: 'center',
              }}
            >
              Payment confirm karne ke liye login zaroori hai.
            </p>
          )}
        </div>
      </div>
    );
  }

  function LoginPage({
    onLoginComplete,
    currentUser,
    setCurrentUser,
    loadUserStats,
  }) {
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
        await loadUserStats(uid);
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
            Cash<span>back</span> Store
          </div>
          <p className="login-sub">Phone number + password se login karo.</p>
          <form onSubmit={submit}>
            <div className="inp-group">
              <label>📱 Phone Numbers</label>
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
              <strong style={{ color: '#ff6b35' }}>+923001234567</strong>
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

  function SignupPage({ onSignupComplete, setCurrentUser, loadUserStats }) {
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
          totalInvested: 0,
        });
        await set(ref(rtdb, `usersByPhone/${phoneKey}`), uid);
        localStorage.setItem('cbUid', uid);
        localStorage.setItem('cbPhone', normalizedPhone);
        setCurrentUser({ uid, phone: normalizedPhone });
        await loadUserStats(uid);
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
            Cash<span>back</span> Store
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
              <strong style={{ color: '#ff6b35' }}>+923001234567</strong>
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
