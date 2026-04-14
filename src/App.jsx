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
import {
  child,
  get,
  ref,
  set,
  push,
  update,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import bcrypt from 'bcryptjs';
import { rtdb } from './firebase';
import { normalizePakistanPhone, phoneDigitsForQuery } from './lib/phoneAuth';
import './styles/cashback.css';

const FALLBACK = 'https://placehold.co/600x400/1a1a27/ff6b35?text=Product';

const EP_NUM = '03001234567';
const EP_DISPLAY = '0300-1234567';

const BASE_CASHBACK_PERCENTAGE = 15;
const REFER_BONUS = 1500;
const INVESTMENT_RETURN_PERCENTAGE = 12;
const MIN_WITHDRAWAL_AMOUNT = 500;

// Investment Plans
const INVESTMENT_PLANS = [
  {
    id: 1,
    name: 'Basic Plan',
    minAmount: 500,
    returnAmount: 700,
    duration: '12 hours',
    returnPercentage: 40,
  },
  {
    id: 2,
    name: 'Standard Plan',
    minAmount: 1000,
    returnAmount: 1500,
    duration: '24 hours',
    returnPercentage: 50,
  },
  {
    id: 3,
    name: 'Premium Plan',
    minAmount: 2000,
    returnAmount: 3200,
    duration: '48 hours',
    returnPercentage: 60,
  },
  {
    id: 4,
    name: 'Gold Plan',
    minAmount: 5000,
    returnAmount: 8500,
    duration: '72 hours',
    returnPercentage: 70,
  },
];

const calculateCashback = (price) =>
  Math.round((price * BASE_CASHBACK_PERCENTAGE) / 100);
const calculateInvestmentReturn = (amount) =>
  Math.round((amount * INVESTMENT_RETURN_PERCENTAGE) / 100);
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

const compressImage = (file, maxWidth = 800, quality = 0.6) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
};

const PAYMENT_METHODS = { EASYPAISA: 'easypaisa', JAZZCASH: 'jazzcash' };

// Profile Dropdown Component
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
          background: '#2a2a3a',
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
          <MenuItem
            icon="👥"
            label="My Referrals"
            onClick={() => {
              setOpen(false);
              onNavigate('/my-referrals');
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

// Investment Plans Page Component
function InvestmentPlansPage({ currentUser, showToast, onInvest }) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInvest = async () => {
    if (!currentUser) {
      showToast('Pehle login karo!');
      navigate('/login');
      return;
    }
    if (!selectedPlan) {
      showToast('Please select an investment plan');
      return;
    }
    if (!address) {
      showToast('Please enter your address');
      return;
    }
    if (!screenshot) {
      showToast('Please upload payment screenshot');
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = await compressImage(screenshot);

        const investmentId = push(
          ref(rtdb, `investments/${currentUser.uid}`),
        ).key;
        await set(ref(rtdb, `investments/${currentUser.uid}/${investmentId}`), {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.minAmount,
          expectedReturn: selectedPlan.returnAmount,
          address,
          screenshotUrl: base64Image,
          timestamp: Date.now(),
          status: 'pending',
          expectedReturnDate:
            Date.now() +
            (selectedPlan.duration === '12 hours'
              ? 12
              : selectedPlan.duration === '24 hours'
                ? 24
                : selectedPlan.duration === '48 hours'
                  ? 48
                  : 72) *
              60 *
              60 *
              1000,
        });

        await set(
          ref(rtdb, `cashbackHistory/${currentUser.uid}/${investmentId}`),
          {
            type: 'investment',
            amount: -selectedPlan.minAmount,
            description: `Investment in ${selectedPlan.name} of Rs. ${selectedPlan.minAmount.toLocaleString()}`,
            timestamp: Date.now(),
            status: 'pending',
          },
        );

        showToast(
          `✅ Investment submitted! You will receive Rs. ${selectedPlan.returnAmount.toLocaleString()} in ${selectedPlan.duration}`,
        );
        setSelectedPlan(null);
        setAddress('');
        setScreenshot(null);
        setScreenshotPreview('');
        setLoading(false);
      };
      reader.readAsDataURL(screenshot);
    } catch (error) {
      console.error('Error submitting investment:', error);
      showToast('Investment submission failed');
      setLoading(false);
    }
  };
  return (
    <div id="investment-plans-page" className="page active">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>
        <div className="cart-header">💰 Investment Plans</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            marginBottom: 30,
          }}
        >
          {INVESTMENT_PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => handlePlanSelect(plan)}
              style={{
                background:
                  selectedPlan?.id === plan.id
                    ? 'linear-gradient(135deg, #ff6b35, #ff8c5a)'
                    : '#1a1a27',
                borderRadius: 20,
                padding: 20,
                textAlign: 'center',
                cursor: 'pointer',
                border:
                  selectedPlan?.id === plan.id
                    ? '2px solid #ff6b35'
                    : '1px solid #333',
                transition: 'all 0.3s',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>📈</div>
              <h3 style={{ color: '#fff', marginBottom: 10 }}>{plan.name}</h3>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#22a06b',
                  marginBottom: 5,
                }}
              >
                Rs. {plan.minAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: 14, color: '#ccc', marginBottom: 5 }}>
                Get Rs. {plan.returnAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: 12, color: '#ff6b35', marginBottom: 5 }}>
                +{plan.returnPercentage}% Return
              </div>
              <div style={{ fontSize: 12, color: '#aaa' }}>
                Duration: {plan.duration}
              </div>
            </div>
          ))}
        </div>
        {selectedPlan && (
          <div
            style={{
              background: '#1a1a27',
              borderRadius: 24,
              padding: 30,
              marginBottom: 30,
            }}
          >
            <h3
              style={{
                color: '#ff6b35',
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              Invest in {selectedPlan.name}
            </h3>
            <div
              style={{
                background: '#000',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 14, color: '#aaa', marginBottom: 5 }}>
                Send payment to (EasyPaisa / JazzCash)
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#ff6b35' }}>
                Mubariz
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#22a06b' }}>
                0318-9023001
              </div>
              <div style={{ fontSize: 16, color: '#ff6b35', marginTop: 10 }}>
                Amount: Rs. {selectedPlan.minAmount.toLocaleString()}
              </div>
            </div>
            <div style={{ marginBottom: 15 }}>
              <label
                style={{ display: 'block', marginBottom: 8, color: '#ccc' }}
              >
                Complete Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your complete address"
                style={{
                  width: '100%',
                  background: '#0f0f1a',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: '14px 16px',
                  color: '#fff',
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{ display: 'block', marginBottom: 8, color: '#ccc' }}
              >
                Upload Payment Screenshot
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                style={{ width: '100%', color: '#fff' }}
              />
              {screenshotPreview && (
                <img
                  src={screenshotPreview}
                  alt="Preview"
                  style={{
                    marginTop: 10,
                    width: '100%',
                    maxHeight: 200,
                    objectFit: 'cover',
                    borderRadius: 8,
                  }}
                />
              )}
            </div>
            <button
              onClick={handleInvest}
              disabled={loading}
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
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? 'Submitting...'
                : `Invest Rs. ${selectedPlan.minAmount.toLocaleString()}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Investment Page Component
function InvestmentPage({ currentUser, userStats, loadUserStats, showToast }) {
  const navigate = useNavigate();
  return (
    <div id="investment-page" className="page active">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>
        <div className="cart-header">💰 Investment Options</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            marginBottom: 30,
          }}
        >
          <div
            onClick={() => navigate('/investment-plans')}
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: 24,
              padding: 30,
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid #ff6b35',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 15 }}>📊</div>
            <h3 style={{ color: '#ff6b35', marginBottom: 10 }}>
              Investment Plans
            </h3>
            <p style={{ color: '#ccc', fontSize: 14 }}>
              Invest minimum Rs. 500 and get up to 70% return
            </p>
            <div style={{ marginTop: 15, fontSize: 12, color: '#22a06b' }}>
              Click to View Plans →
            </div>
          </div>
          <div
            onClick={() => navigate('/my-investments')}
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: 24,
              padding: 30,
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid #22a06b',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 15 }}>📋</div>
            <h3 style={{ color: '#22a06b', marginBottom: 10 }}>
              My Investments
            </h3>
            <p style={{ color: '#ccc', fontSize: 14 }}>
              Track your active and completed investments
            </p>
            <div style={{ marginTop: 15, fontSize: 12, color: '#ff6b35' }}>
              Click to View →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// My Investments Page
function MyInvestmentsPage({ currentUser, showToast }) {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
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
            expectedReturnDate: inv.expectedReturnDate
              ? new Date(inv.expectedReturnDate)
              : null,
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
      case 'active':
        return {
          text: 'Active',
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
        return {
          text: status || 'Pending',
          color: '#aaa',
          bg: 'rgba(136, 136, 136, 0.1)',
        };
    }
  };

  if (!currentUser)
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
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login Karein
          </button>
        </div>
      </div>
    );

  return (
    <div id="my-investments-page" className="page active">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/investment')}>
          ← Wapas Jao
        </div>
        <div className="cart-header">📋 My Investments</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
            Loading investments...
          </div>
        ) : investments.length === 0 ? (
          <div className="cart-empty">
            <div className="big">📭</div>
            <p>Abhi tak koi investment nahi ki</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/investment-plans')}
            >
              Invest Now
            </button>
          </div>
        ) : (
          investments.map((inv) => {
            const statusBadge = getStatusBadge(inv.status);
            return (
              <div
                key={inv.id}
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
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 15,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 18,
                        color: '#ff6b35',
                      }}
                    >
                      {inv.planName || 'Investment'}
                    </div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      {inv.date.toLocaleDateString()}
                    </div>
                  </div>
                  <span
                    style={{
                      background: statusBadge.bg,
                      color: statusBadge.color,
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    {statusBadge.text}
                  </span>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 15,
                    marginBottom: 15,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      Invested Amount
                    </div>
                    <div
                      style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}
                    >
                      Rs. {inv.amount?.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      Expected Return
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: '#22a06b',
                      }}
                    >
                      Rs. {inv.expectedReturn?.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 15 }}>
                  <div style={{ fontSize: 12, color: '#aaa', marginBottom: 5 }}>
                    Address
                  </div>
                  <div style={{ fontSize: 13, color: '#ccc' }}>
                    📍 {inv.address}
                  </div>
                </div>
                {inv.screenshotUrl && (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{ fontSize: 12, color: '#aaa', marginBottom: 5 }}
                    >
                      Payment Screenshot:
                    </div>
                    <img
                      src={inv.screenshotUrl}
                      alt="Screenshot"
                      style={{
                        maxWidth: '100%',
                        maxHeight: 150,
                        borderRadius: 8,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Withdrawal Page Component
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
      const currentCashback = userSnap.exists()
        ? userSnap.val().totalCashback || 0
        : 0;
      await update(ref(rtdb, `users/${currentUser.uid}`), {
        totalCashback: currentCashback - amount,
        ...userUpdateData,
      });
      await set(
        ref(rtdb, `cashbackHistory/${currentUser.uid}/${withdrawalId}`),
        {
          type: 'withdrawal',
          amount: -amount,
          description: `Withdrawal of Rs. ${amount.toLocaleString()}`,
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
        `✅ Withdrawal request of Rs. ${amount.toLocaleString()} submitted!`,
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
        return { text: status, color: '#aaa', bg: 'rgba(136, 136, 136, 0.1)' };
    }
  };

  if (!currentUser)
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
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login Karein
          </button>
        </div>
      </div>
    );

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
            <p style={{ color: '#ccc' }}>
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
            <div style={{ fontSize: 14, color: '#aaa', marginBottom: 5 }}>
              Available Balance
            </div>
            <div style={{ fontSize: 42, fontWeight: 700, color: '#22a06b' }}>
              Rs. {(userStats?.totalCashback || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#aaa', marginTop: 5 }}>
              Minimum withdrawal: Rs. {MIN_WITHDRAWAL_AMOUNT.toLocaleString()}
            </div>
          </div>
          <div style={{ marginBottom: 25 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 10,
                fontSize: 14,
                color: '#ccc',
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
                    color: paymentMethod === method.id ? '#fff' : '#ccc',
                    cursor: 'pointer',
                    fontWeight: 500,
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
                    color: '#ccc',
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
                    color: '#ccc',
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
                    color: '#ccc',
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
                    color: '#ccc',
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
                    color: '#ccc',
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
                    color: '#ccc',
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
                    color: '#ccc',
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
                color: '#ccc',
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
              color: '#fff',
            }}
          >
            📋 Withdrawal History
          </h3>
          {loadingWithdrawals ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
              Loading history...
            </div>
          ) : withdrawals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
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
                      <div
                        style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}
                      >
                        Rs. {wd.amount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 12, color: '#aaa' }}>
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
                  <div style={{ fontSize: 13, color: '#ccc', marginTop: 8 }}>
                    📱{' '}
                    {wd.paymentMethod === 'easypaisa'
                      ? `EasyPaisa: ${wd.easyPaisaNumber}`
                      : wd.paymentMethod === 'jazzcash'
                        ? `JazzCash: ${wd.jazzCashNumber}`
                        : `${wd.bankName}: ${wd.bankAccountNumber}`}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Referral Page Component
function ReferralPage({ currentUser, onCopyRefer, referLink }) {
  const navigate = useNavigate();
  const [copySuccess, setCopySuccess] = useState(false);
  const shareOnWhatsApp = () => {
    const message = `Assalam o Alaikum! 🎉\n\nJoin CashBack Shop and earn ${BASE_CASHBACK_PERCENTAGE}% cashback on every purchase! Use my referral link:\n\n${referLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };
  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referLink)}`,
      '_blank',
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
  if (!currentUser)
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
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login Karein
          </button>
        </div>
      </div>
    );
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
          <p style={{ color: '#ccc', marginBottom: 25 }}>
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
                color: '#aaa',
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
      </div>
    </div>
  );
}

// My Referrals Page - Enhanced with login tracking
function MyReferralsPage({ currentUser }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveTracking, setLiveTracking] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchReferrals();

    // Set up real-time listener for referral updates
    const referralsRef = ref(rtdb, `referrals/${currentUser.uid}`);
    const unsubscribe = () => {
      // Cleanup function
    };

    // Using onValue for real-time updates
    import('firebase/database')
      .then(({ onValue }) => {
        const ref = referralsRef;
        const listener = onValue(ref, (snapshot) => {
          if (snapshot.exists()) {
            const referralsData = snapshot.val();
            const referralsList = Object.entries(referralsData).map(
              ([id, refData]) => ({
                id,
                ...refData,
                date: new Date(refData.timestamp),
                lastLoginAt: refData.lastLoginAt
                  ? new Date(refData.lastLoginAt)
                  : null,
                orderDate: refData.orderDate
                  ? new Date(refData.orderDate)
                  : null,
              }),
            );
            referralsList.sort((a, b) => b.timestamp - a.timestamp);
            setReferrals(referralsList);
            setLiveTracking(true);
          } else {
            setReferrals([]);
          }
          setLoading(false);
        });

        return () => listener();
      })
      .catch(() => {
        // Fallback to single fetch if onValue is not available
        setLoading(false);
      });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser, navigate]);

  const fetchReferrals = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const referralsRef = ref(rtdb, `referrals/${currentUser.uid}`);
      const snapshot = await get(referralsRef);
      if (snapshot.exists()) {
        const referralsData = snapshot.val();
        const referralsList = Object.entries(referralsData).map(
          ([id, ref]) => ({
            id,
            ...ref,
            date: new Date(ref.timestamp),
            lastLoginAt: ref.lastLoginAt ? new Date(ref.lastLoginAt) : null,
            orderDate: ref.orderDate ? new Date(ref.orderDate) : null,
          }),
        );
        referralsList.sort((a, b) => b.timestamp - a.timestamp);
        setReferrals(referralsList);
      } else {
        setReferrals([]);
      }
    } catch (error) {
      console.error('Error fetching referrals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReferralStatus = (referral) => {
    if (referral.orderCompleted && referral.bonusEarned) {
      return { text: 'Order Completed', color: '#22a06b', icon: '✅' };
    } else if (referral.orderCompleted === false && referral.lastLoginAt) {
      return { text: 'Logged In - No Order', color: '#cf7808', icon: '👤' };
    } else if (referral.lastLoginAt) {
      return { text: 'Account Created', color: '#3b82f6', icon: '📱' };
    } else if (referral.orderDate) {
      return { text: 'Order Placed', color: '#22a06b', icon: '📦' };
    } else {
      return { text: 'Pending Signup', color: '#aaa', icon: '⏳' };
    }
  };

  if (!currentUser)
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
          <div className="big">👥</div>
          <h2>Pehle Login Karo</h2>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login Karein
          </button>
        </div>
      </div>
    );

  const completedReferrals = referrals.filter((r) => r.bonusEarned).length;
  const pendingReferrals = referrals.filter(
    (r) => !r.bonusEarned && r.referredUser,
  ).length;
  const totalBonus = referrals.reduce(
    (sum, r) => sum + (r.bonusEarned || 0),
    0,
  );

  return (
    <div id="my-referrals-page" className="page active">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>
        <div className="cart-header">👥 My Referrals</div>

        {/* Stats Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 15,
            marginBottom: 25,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: 16,
              padding: 20,
              textAlign: 'center',
              border: '1px solid #ff6b35',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ff6b35' }}>
              {referrals.length}
            </div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Total Referrals</div>
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: 16,
              padding: 20,
              textAlign: 'center',
              border: '1px solid #22a06b',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#22a06b' }}>
              {completedReferrals}
            </div>
            <div style={{ fontSize: 13, color: '#aaa' }}>Completed Orders</div>
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: 16,
              padding: 20,
              textAlign: 'center',
              border: '1px solid #cf7808',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#cf7808' }}>
              {pendingReferrals}
            </div>
            <div style={{ fontSize: 13, color: '#aaa' }}>
              Pending Signup/Order
            </div>
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: 16,
              padding: 20,
              textAlign: 'center',
              border: '1px solid #3b82f6',
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>
              Rs. {totalBonus.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, color: '#aaa' }}>
              Total Bonus Earned
            </div>
          </div>
        </div>

        {liveTracking && (
          <div
            style={{
              background: 'rgba(34, 160, 107, 0.1)',
              borderRadius: 12,
              padding: '10px 15px',
              marginBottom: 20,
              textAlign: 'center',
              border: '1px solid #22a06b',
            }}
          >
            <span style={{ color: '#22a06b', fontSize: 13 }}>
              🟢 Live Tracking Active - Real-time updates enabled!
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
            Loading referrals...
          </div>
        ) : referrals.length === 0 ? (
          <div className="cart-empty">
            <div className="big">👥</div>
            <p>Abhi tak kisi ne aapka referral link use nahi kiya</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/refer')}
            >
              Share Referral Link
            </button>
          </div>
        ) : (
          <div
            style={{
              background: '#1a1a27',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    background: '#0f0f1a',
                    borderBottom: '1px solid #333',
                  }}
                >
                  <th
                    style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#ff6b35',
                    }}
                  >
                    Referred User
                  </th>
                  <th
                    style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#ff6b35',
                    }}
                  >
                    Signup Date
                  </th>
                  <th
                    style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#ff6b35',
                    }}
                  >
                    Last Login
                  </th>
                  <th
                    style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#ff6b35',
                    }}
                  >
                    Order Date
                  </th>
                  <th
                    style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#ff6b35',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: '15px',
                      textAlign: 'left',
                      color: '#ff6b35',
                    }}
                  >
                    Bonus Earned
                  </th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => {
                  const status = getReferralStatus(ref);
                  return (
                    <tr key={ref.id} style={{ borderBottom: '1px solid #333' }}>
                      <td style={{ padding: '15px', color: '#fff' }}>
                        {ref.referredPhone ||
                          ref.referredUser?.slice(0, 8) ||
                          'Unknown'}
                      </td>
                      <td style={{ padding: '15px', color: '#aaa' }}>
                        {ref.date.toLocaleDateString()}{' '}
                        {ref.date.toLocaleTimeString()}
                      </td>
                      <td
                        style={{
                          padding: '15px',
                          color: ref.lastLoginAt ? '#ff6b35' : '#aaa',
                        }}
                      >
                        {ref.lastLoginAt
                          ? `${ref.lastLoginAt.toLocaleDateString()} ${ref.lastLoginAt.toLocaleTimeString()}`
                          : 'Not logged in yet'}
                      </td>
                      <td
                        style={{
                          padding: '15px',
                          color: ref.orderDate ? '#22a06b' : '#aaa',
                        }}
                      >
                        {ref.orderDate
                          ? `${ref.orderDate.toLocaleDateString()} ${ref.orderDate.toLocaleTimeString()}`
                          : 'No order yet'}
                      </td>
                      <td style={{ padding: '15px' }}>
                        <span
                          style={{
                            background: status.bg || 'rgba(136,136,136,0.1)',
                            color: status.color,
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 12,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                          }}
                        >
                          {status.icon} {status.text}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '15px',
                          color: '#22a06b',
                          fontWeight: 600,
                        }}
                      >
                        {ref.bonusEarned
                          ? `+Rs. ${ref.bonusEarned.toLocaleString()}`
                          : ref.orderCompleted === false && ref.lastLoginAt
                            ? 'Pending Order'
                            : ref.lastLoginAt
                              ? 'Awaiting Order'
                              : 'Pending Signup'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Explanation Section */}
        <div
          style={{
            background: '#1a1a27',
            borderRadius: 16,
            padding: 20,
            marginTop: 25,
            border: '1px solid #333',
          }}
        >
          <h3 style={{ color: '#ff6b35', marginBottom: 15 }}>
            📌 How Referral Tracking Works
          </h3>
          <div
            style={{ display: 'grid', gap: 10, fontSize: 13, color: '#ccc' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>1️⃣</span>
              <span>
                When someone signs up using your referral link, their account is
                linked to you.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>2️⃣</span>
              <span>
                You can see when they{' '}
                <strong style={{ color: '#ff6b35' }}>login</strong> to their
                account.
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>3️⃣</span>
              <span>
                You can see when they{' '}
                <strong style={{ color: '#22a06b' }}>
                  place their first order
                </strong>
                .
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>4️⃣</span>
              <span>
                Once they complete their first order, you receive{' '}
                <strong style={{ color: '#22a06b' }}>
                  Rs. {REFER_BONUS.toLocaleString()} bonus
                </strong>
                .
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// About Us Page
function AboutUsPage({ onNavigate }) {
  const navigate = useNavigate();
  const teamMembers = [
    {
      name: 'Mubariz',
      role: 'Founder & CEO',
      icon: '👨‍💼',
      description: 'Visionary leader behind Cashback Store',
    },
    {
      name: 'Ali Raza',
      role: 'CTO',
      icon: '💻',
      description: 'Technology and platform development',
    },
    {
      name: 'Sara Khan',
      role: 'Operations Manager',
      icon: '📊',
      description: 'Managing daily operations',
    },
    {
      name: 'Usman Ahmed',
      role: 'Customer Support Lead',
      icon: '🎧',
      description: '24/7 customer support',
    },
  ];
  return (
    <div id="about-us-page" className="page active">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 20px' }}>
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Wapas Jao
        </div>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 15 }}>🏪</div>
          <h1 style={{ color: '#ff6b35', marginBottom: 10 }}>
            About Cashback Store
          </h1>
          <p style={{ color: '#ccc', maxWidth: 700, margin: '0 auto' }}>
            Pakistan's most trusted cashback platform offering premium products
            with guaranteed returns
          </p>
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: 24,
            padding: 30,
            marginBottom: 30,
          }}
        >
          <h2
            style={{ color: '#ff6b35', marginBottom: 20, textAlign: 'center' }}
          >
            Our Mission
          </h2>
          <p style={{ color: '#ccc', lineHeight: 1.6, textAlign: 'center' }}>
            At Cashback Store, we believe in making every purchase rewarding.
            Our mission is to provide high-quality products while giving our
            customers the best cashback rewards and investment opportunities in
            Pakistan.
          </p>
        </div>
        <div style={{ marginBottom: 30 }}>
          <h2
            style={{ color: '#ff6b35', marginBottom: 20, textAlign: 'center' }}
          >
            Meet Our Team
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                style={{
                  background: '#1a1a27',
                  borderRadius: 20,
                  padding: 25,
                  textAlign: 'center',
                  border: '1px solid #333',
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 10 }}>
                  {member.icon}
                </div>
                <h3 style={{ color: '#ff6b35', marginBottom: 5 }}>
                  {member.name}
                </h3>
                <div
                  style={{ fontSize: 14, color: '#22a06b', marginBottom: 10 }}
                >
                  {member.role}
                </div>
                <p style={{ fontSize: 12, color: '#aaa' }}>
                  {member.description}
                </p>
              </div>
            ))}
          </div>
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
          <div style={{ fontSize: 40, marginBottom: 15 }}>🎧</div>
          <h2 style={{ color: '#ff6b35', marginBottom: 10 }}>
            24/7 Customer Support
          </h2>
          <p style={{ color: '#ccc', marginBottom: 20 }}>
            Have questions? We're here to help!
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                background: '#000000',
                borderRadius: 12,
                padding: '15px 25px',
              }}
            >
              <div style={{ fontSize: 12, color: '#aaa' }}>Call / WhatsApp</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: '#22a06b' }}>
                0318-9023001
              </div>
            </div>
            <div
              style={{
                background: '#000000',
                borderRadius: 12,
                padding: '15px 25px',
              }}
            >
              <div style={{ fontSize: 12, color: '#aaa' }}>Email</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#ff6b35' }}>
                support@cashbackstore.pk
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            background: '#1a1a27',
            borderRadius: 24,
            padding: 30,
            marginBottom: 30,
          }}
        >
          <h2
            style={{ color: '#ff6b35', marginBottom: 20, textAlign: 'center' }}
          >
            Share Cashback Store
          </h2>
          <p style={{ color: '#ccc', textAlign: 'center', marginBottom: 20 }}>
            Help your friends earn cashback too!
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 15,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent('Check out Cashback Store - Pakistan best cashback platform! https://cashbackstore.pk')}`,
                  '_blank',
                )
              }
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
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://cashbackstore.pk')}`,
                  '_blank',
                )
              }
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
            <button
              onClick={() =>
                navigator.clipboard.writeText('https://cashbackstore.pk')
              }
              style={{
                background: '#ff6b35',
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
              📋 Copy Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Orders Page Component
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
  if (loading)
    return (
      <div
        className="page active"
        style={{ textAlign: 'center', padding: 40, color: '#aaa' }}
      >
        Loading orders...
      </div>
    );
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
                  <div style={{ fontSize: 12, color: '#aaa' }}>Order ID</div>
                  <div style={{ fontSize: 13, color: '#fff' }}>
                    {order.id?.slice(0, 8)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#aaa' }}>Date</div>
                  <div style={{ fontSize: 13, color: '#fff' }}>
                    {order.date.toLocaleDateString()}
                  </div>
                </div>
              </div>
              {order.items?.map((item, idx) => (
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
                    <div style={{ fontWeight: 500, color: '#fff' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: 13, color: '#aaa' }}>
                      Qty: {item.qty} × Rs.{item.price.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff' }}>
                      Rs.{(item.price * item.qty).toLocaleString()}
                    </div>
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
                    color: '#fff',
                  }}
                >
                  <span>Total Amount:</span>
                  <span>Rs.{order.totalAmount?.toLocaleString()}</span>
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
                  <span>+Rs.{order.cashbackEarned?.toLocaleString()}</span>
                </div>
                {order.paymentDetails?.address && (
                  <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
                    📍 Delivery Address: {order.paymentDetails.address}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Cashback History Page
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
  if (loading)
    return (
      <div
        className="page active"
        style={{ textAlign: 'center', padding: 40, color: '#aaa' }}
      >
        Loading history...
      </div>
    );
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
                <div style={{ fontWeight: 500, color: '#fff' }}>
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
                <div style={{ fontSize: 12, color: '#aaa' }}>
                  {entry.date.toLocaleDateString()}
                </div>
                {entry.description && (
                  <div style={{ fontSize: 11, color: '#aaa' }}>
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

// Live Balance Marquee Component
function LiveBalanceMarquee() {
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
          <span key={idx} style={{ color: '#fff' }}>
            👤 {item.user} withdrew Rs {item.amount.toLocaleString()}
          </span>
        ))}
      </div>
      <style>{`@keyframes marquee { 0% { transform: translateX(0%); } 100% { transform: translateX(-50%); } } .marquee-track:hover { animation-play-state: paused; } @media (max-width: 768px) { .marquee-track { animation-duration: 35s; gap: 25px; } }`}</style>
    </div>
  );
}

// Info Cards Component
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
      link: '/about',
    },
    {
      icon: '👥',
      title: 'Our Team',
      description: 'Meet the team behind Cashback Store',
      color: '#3b82f6',
      link: '/about',
    },
    {
      icon: '🛡️',
      title: 'Support',
      description: '24/7 customer support',
      color: '#a855f7',
      link: '/about',
    },
    {
      icon: '💰',
      title: 'Investment',
      description: 'Invest and earn high returns',
      color: '#ff6b35',
      link: '/investment',
    },
    {
      icon: '🔗',
      title: 'Refer & Earn',
      description: 'Get Rs.1500 per referral',
      color: '#22a06b',
      link: '/refer',
    },
  ];
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        margin: '30px 20px',
        padding: '0',
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          onClick={() => onNavigate(card.link)}
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
              fontSize: '16px',
              fontWeight: 600,
              color: card.color,
              marginBottom: '8px',
            }}
          >
            {card.title}
          </div>
          <div style={{ fontSize: '11px', color: '#ccc', lineHeight: 1.4 }}>
            {card.description}
          </div>
        </div>
      ))}
    </div>
  );
}

// Main App Shell
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

  // Track referral from URL
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
      // Update last login time for referral tracking
      updateLastLoginTime(uid, phone);
    } else {
      setCurrentUser(null);
      setLoadingStats(false);
    }
  }, []);

  // Update last login time for referral tracking
  const updateLastLoginTime = async (uid, phone) => {
    try {
      // Find who referred this user
      const referralsQuery = query(
        ref(rtdb, 'referrals'),
        orderByChild('referredUser'),
        equalTo(uid),
      );
      const snapshot = await get(referralsQuery);
      if (snapshot.exists()) {
        // Update the referral record with login time
        snapshot.forEach((childSnapshot) => {
          const referrerUid = childSnapshot.key;
          const referralId = Object.keys(childSnapshot.val())[0];
          update(ref(rtdb, `referrals/${referrerUid}/${uid}`), {
            lastLoginAt: Date.now(),
          });
        });
      }
    } catch (error) {
      console.error('Error updating last login time:', error);
    }
  };

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

      // Update user stats
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

      // Update referral record with order info
      try {
        const referralsQuery = query(
          ref(rtdb, 'referrals'),
          orderByChild('referredUser'),
          equalTo(currentUser.uid),
        );
        const refSnapshot = await get(referralsQuery);
        if (refSnapshot.exists()) {
          refSnapshot.forEach((childSnapshot) => {
            const referrerUid = childSnapshot.key;
            update(ref(rtdb, `referrals/${referrerUid}/${currentUser.uid}`), {
              orderDate: Date.now(),
              orderCompleted: true,
            });
          });
        }
      } catch (err) {
        console.error('Error updating referral order:', err);
      }

      // Process referral bonus
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
          await set(ref(rtdb, `referrals/${referrerUid}/${currentUser.uid}`), {
            referredUser: currentUser.uid,
            referredPhone: currentUser.phone,
            timestamp: Date.now(),
            lastLoginAt: Date.now(),
            orderDate: Date.now(),
            orderCompleted: true,
            status: 'completed',
            bonusEarned: REFER_BONUS,
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
      <LiveBalanceMarquee />
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
          path="/investment-plans"
          element={
            <InvestmentPlansPage
              currentUser={currentUser}
              showToast={showToast}
              onInvest={() => loadUserStats(currentUser?.uid)}
            />
          }
        />
        <Route
          path="/my-investments"
          element={
            <MyInvestmentsPage
              currentUser={currentUser}
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
        <Route
          path="/my-referrals"
          element={<MyReferralsPage currentUser={currentUser} />}
        />
        <Route path="/about" element={<AboutUsPage onNavigate={navigate} />} />
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

  // HomePage Component
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
              <span style={{ fontSize: '15px', color: '#ccc' }}>User ID:</span>
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
              <span style={{ fontSize: '15px', color: '#ccc' }}>
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
            rewards on every order.
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
                    navigate(`/product/${p.id}`);
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

  // DetailPage Component
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
              <p>Product nahi mila.</p>
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
                <h3 style={{ marginBottom: 15, fontSize: 16, color: '#fff' }}>
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
                    <div style={{ fontSize: 12, color: '#aaa' }}>Cycle</div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>
                      {cycleDays} Days
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      Rate of Return
                    </div>
                    <div style={{ fontWeight: 600, color: '#22a06b' }}>
                      {returnPercentage}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      Daily Profit (est.)
                    </div>
                    <div style={{ fontWeight: 600, color: '#ff6b35' }}>
                      Rs. {dailyProfit.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>
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

  // PaymentPage Component
  function PaymentPage({
    epDisplay,
    referLink,
    onCopyRefer,
    onPlaceOrder,
    currentUser,
  }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [address, setAddress] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState('');
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

    const handleScreenshotChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setScreenshot(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setScreenshotPreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };

    const handlePlaceOrder = async () => {
      if (!address) {
        alert('Please enter your delivery address');
        return;
      }
      if (!screenshot) {
        alert('Please upload payment screenshot');
        return;
      }

      try {
        const base64Image = await compressImage(screenshot);
        onPlaceOrder(product, 'easypaisa', {
          address,
          screenshotUrl: base64Image,
        });
      } catch (error) {
        console.error('Error processing screenshot:', error);
        alert('Failed to process screenshot');
      }
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
            <div
              style={{
                background: '#000',
                borderRadius: 12,
                padding: 20,
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 14, color: '#aaa', marginBottom: 5 }}>
                Send payment to (EasyPaisa / JazzCash)
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#ff6b35' }}>
                Mubariz
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#22a06b' }}>
                0318-9023001
              </div>
              <div style={{ fontSize: 16, color: '#ff6b35', marginTop: 10 }}>
                Amount: Rs. {product.price.toLocaleString()}
              </div>
            </div>
            <div style={{ marginBottom: 15 }}>
              <label
                style={{ display: 'block', marginBottom: 8, color: '#ccc' }}
              >
                Complete Delivery Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your complete address for delivery"
                style={{
                  width: '100%',
                  background: '#0f0f1a',
                  border: '1px solid #333',
                  borderRadius: 12,
                  padding: '14px 16px',
                  color: '#fff',
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label
                style={{ display: 'block', marginBottom: 8, color: '#ccc' }}
              >
                Upload Payment Screenshot
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                style={{ width: '100%', color: '#fff' }}
              />
              {screenshotPreview && (
                <img
                  src={screenshotPreview}
                  alt="Preview"
                  style={{
                    marginTop: 10,
                    width: '100%',
                    maxHeight: 150,
                    objectFit: 'cover',
                    borderRadius: 8,
                  }}
                />
              )}
            </div>
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
                color: '#aaa',
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

  // LoginPage Component
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

        // Update last login time for referral tracking
        try {
          const referralsQuery = query(
            ref(rtdb, 'referrals'),
            orderByChild('referredUser'),
            equalTo(uid),
          );
          const refSnapshot = await get(referralsQuery);
          if (refSnapshot.exists()) {
            refSnapshot.forEach((childSnapshot) => {
              const referrerUid = childSnapshot.key;
              update(ref(rtdb, `referrals/${referrerUid}/${uid}`), {
                lastLoginAt: Date.now(),
              });
            });
          }
        } catch (err) {
          console.error('Error updating login time:', err);
        }

        localStorage.setItem('cbUid', uid);
        localStorage.setItem('cbPhone', normalizedPhone);
        setCurrentUser({ uid, phone: normalizedPhone });
        await loadUserStats(uid);
        setStatus('🎉 Login ho gaya!');
        onLoginComplete?.();
      } catch {
        setStatus('❌ Login failed.');
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

  // SignupPage Component
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

        // Track referral on signup
        const referrerPhone = localStorage.getItem('cbRef');
        if (referrerPhone) {
          const referrerPhoneKey = phoneDigitsForQuery(referrerPhone);
          const referrerUidSnap = await get(
            child(ref(rtdb), `usersByPhone/${referrerPhoneKey}`),
          );
          if (referrerUidSnap.exists()) {
            const referrerUid = referrerUidSnap.val();
            await set(ref(rtdb, `referrals/${referrerUid}/${uid}`), {
              referredUser: uid,
              referredPhone: normalizedPhone,
              timestamp: Date.now(),
              status: 'pending',
              bonusEarned: 0,
              orderCompleted: false,
            });
          }
        }

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
