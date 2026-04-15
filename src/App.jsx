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
import emailjs from '@emailjs/browser';
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

// Updated Payment Numbers and Names
const EASYPAISA_NUMBER = '03480954733';
const JAZZCASH_NUMBER = '03135259363';
const SUPPORT_NUMBER = '03340397691';
const EASYPAISA_NAME = 'Mubaraz aqaldad';
const JAZZCASH_NAME = 'Mubariz aqaldad';

// EmailJS Configuration
const EMAILJS_SERVICE_ID = 'service_7h2936w';
const EMAILJS_TEMPLATE_ID = 'template_t6mxgmw';
const EMAILJS_PUBLIC_KEY = 'OPt_6PEWJLbXNmfFY';
const ADMIN_EMAIL = 'abbasihariskhurshid@gmail.com';

// Investment Plans - Updated with percentage only
const INVESTMENT_PLANS = [
  {
    id: 1,
    name: 'Basic Plan',
    minAmount: 500,
    returnPercentage: 20,
    duration: '12 hours',
  },
  {
    id: 2,
    name: 'Standard Plan',
    minAmount: 1000,
    returnPercentage: 25,
    duration: '24 hours',
  },
  {
    id: 3,
    name: 'Premium Plan',
    minAmount: 2000,
    returnPercentage: 30,
    duration: '48 hours',
  },
  {
    id: 4,
    name: 'Gold Plan',
    minAmount: 4000,
    returnPercentage: 35,
    duration: '72 hours',
  },
];

const calculateCashback = (price) =>
  Math.round((price * BASE_CASHBACK_PERCENTAGE) / 100);
const calculateInvestmentReturn = (amount, percentage) =>
  Math.round((amount * percentage) / 100);
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
  desc: `Hello! ${p.description} When you buy this product, you will get Rs. ${calculateCashback(p.price).toLocaleString()} cashback (within 24 hours). If you refer a friend, you will get ${REFER_BONUS} extra cashback.`,
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

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Send email notification function
const sendWithdrawalEmail = async (
  userPhone,
  amount,
  paymentMethod,
  paymentDetails,
) => {
  try {
    const methodName =
      paymentMethod === 'easypaisa'
        ? 'EasyPaisa'
        : paymentMethod === 'jazzcash'
          ? 'JazzCash'
          : 'Bank Transfer';

    let detailsText = '';
    if (paymentMethod === 'easypaisa') {
      detailsText = `EasyPaisa Number: ${paymentDetails.number}\nAccount Holder: ${paymentDetails.name}`;
    } else if (paymentMethod === 'jazzcash') {
      detailsText = `JazzCash Number: ${paymentDetails.number}\nAccount Holder: ${paymentDetails.name}`;
    } else {
      detailsText = `Bank: ${paymentDetails.bank}\nAccount Number: ${paymentDetails.accountNumber}\nAccount Title: ${paymentDetails.accountTitle}`;
    }

    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: 'Admin',
      to_email: ADMIN_EMAIL,
      from_name: 'Cashback Store',
      reply_to: ADMIN_EMAIL,
      subject: `New Withdrawal Request - Rs. ${amount.toLocaleString()}`,
      message: `NEW WITHDRAWAL REQUEST\n\nUser Phone: ${userPhone}\nAmount: Rs. ${amount.toLocaleString()}\nPayment Method: ${methodName}\n\nPayment Details:\n${detailsText}\n\nTime: ${new Date().toLocaleString()}\n\nPlease process this withdrawal request.`,
    });

    console.log('Email sent successfully');
    return true;
  } catch (error) {
    console.error('EmailJS error:', error);
    return false;
  }
};

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
        className="profile-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#2a2a3a',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          padding: '7px 13px',
          borderRadius: '9px',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#ff6b35',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '11px',
            color: '#fff',
          }}
        >
          {initials}
        </div>
        <span className="profile-phone">📱 {shortPhone}</span>
        <span style={{ fontSize: '9px', opacity: 0.7 }}>▼</span>
      </button>
      {open && (
        <div
          className="profile-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: '#ffffff',
            border: '0.5px solid #e0e0e0',
            borderRadius: '14px',
            width: '280px',
            maxWidth: 'calc(100vw - 20px)',
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
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#ff6b35',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '16px',
                color: '#fff',
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 500, fontSize: '14px' }}>
                My Account
              </div>
              <div
                style={{
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: '12px',
                  marginTop: '2px',
                }}
              >
                {currentUser?.phone}
              </div>
            </div>
          </div>
          <div
            className="stats-grid"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}
          >
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
            label="My Orders"
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
            label="Refer a Friend"
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
          <MenuItem
            icon="📞"
            label="Contact Us"
            onClick={() => {
              setOpen(false);
              onNavigate('/contact');
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
          fontSize: '13px',
          fontWeight: 500,
          color: color || '#000',
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>
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
        gap: '10px',
        cursor: 'pointer',
        fontSize: '13px',
        color: danger ? '#c0392b' : '#000',
        background: hover ? '#f5f5f5' : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>
        {icon}
      </span>
      {label}
    </div>
  );
}

function Divider() {
  return <div style={{ height: '0.5px', background: '#eee' }} />;
}

// Investment Plans Page Component - Updated with percentage only
function InvestmentPlansPage({ currentUser, showToast, onInvest }) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('easypaisa');

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
      showToast('Please login first!');
      navigate('/login');
      return;
    }
    if (!selectedPlan) {
      showToast('Please select an investment plan');
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
        const expectedReturn = calculateInvestmentReturn(
          selectedPlan.minAmount,
          selectedPlan.returnPercentage,
        );

        const investmentId = push(
          ref(rtdb, `investments/${currentUser.uid}`),
        ).key;
        await set(ref(rtdb, `investments/${currentUser.uid}/${investmentId}`), {
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          amount: selectedPlan.minAmount,
          expectedReturn: expectedReturn,
          returnPercentage: selectedPlan.returnPercentage,
          paymentMethod,
          screenshotUrl: base64Image,
          timestamp: Date.now(),
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
            description: `Investment in ${selectedPlan.name} of Rs. ${selectedPlan.minAmount.toLocaleString()} via ${paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}`,
            timestamp: Date.now(),
          },
        );

        showToast(
          `✅ Investment submitted! You will receive ${selectedPlan.returnPercentage}% return (Rs. ${expectedReturn.toLocaleString()}) in ${selectedPlan.duration}`,
        );
        setSelectedPlan(null);
        setScreenshot(null);
        setScreenshotPreview('');
        setLoading(false);
        if (onInvest) onInvest();
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
      <div
        className="page-container"
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/investment')}>
          ← Go Back
        </div>
        <div className="cart-header">💰 Investment Plans</div>
        <div
          className="investment-plans-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '30px',
          }}
        >
          {INVESTMENT_PLANS.map((plan) => (
            <div
              key={plan.id}
              onClick={() => handlePlanSelect(plan)}
              className="investment-plan-card"
              style={{
                background:
                  selectedPlan?.id === plan.id
                    ? 'linear-gradient(135deg, #ff6b35, #ff8c5a)'
                    : '#1a1a27',
                borderRadius: '20px',
                padding: '20px',
                textAlign: 'center',
                cursor: 'pointer',
                border:
                  selectedPlan?.id === plan.id
                    ? '2px solid #ff6b35'
                    : '1px solid #333',
                transition: 'all 0.3s',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📈</div>
              <h3
                style={{
                  color: '#fff',
                  marginBottom: '10px',
                  fontSize: 'clamp(16px, 4vw, 20px)',
                }}
              >
                {plan.name}
              </h3>
              <div
                style={{
                  fontSize: 'clamp(20px, 5vw, 24px)',
                  fontWeight: 700,
                  color: '#22a06b',
                  marginBottom: '5px',
                }}
              >
                Rs. {plan.minAmount.toLocaleString()}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#ede9e7',
                  marginBottom: '5px',
                }}
              >
                {plan.returnPercentage}% Return
              </div>
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                Duration: {plan.duration}
              </div>
            </div>
          ))}
        </div>
        {selectedPlan && (
          <div
            className="investment-form"
            style={{
              background: '#1a1a27',
              borderRadius: '24px',
              padding: 'clamp(20px, 5vw, 30px)',
              marginBottom: '30px',
            }}
          >
            <h3
              style={{
                color: '#ff6b35',
                marginBottom: '20px',
                textAlign: 'center',
                fontSize: 'clamp(18px, 4vw, 22px)',
              }}
            >
              Invest in {selectedPlan.name}
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}
              >
                Select Payment Method
              </label>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setPaymentMethod('easypaisa')}
                  className="payment-method-btn"
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    background:
                      paymentMethod === 'easypaisa' ? '#22a06b' : '#0f0f1a',
                    border:
                      paymentMethod === 'easypaisa' ? 'none' : '1px solid #333',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  📱 EasyPaisa
                </button>
                <button
                  onClick={() => setPaymentMethod('jazzcash')}
                  className="payment-method-btn"
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    background:
                      paymentMethod === 'jazzcash' ? '#ff6b35' : '#0f0f1a',
                    border:
                      paymentMethod === 'jazzcash' ? 'none' : '1px solid #333',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  💳 JazzCash
                </button>
              </div>
            </div>

            <div
              className="payment-details-box"
              style={{
                background: '#000',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}
              >
                Send payment to{' '}
                {paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
              </div>
              <div
                style={{
                  fontSize: 'clamp(22px, 6vw, 28px)',
                  fontWeight: 700,
                  color: '#ff6b35',
                }}
              >
                {paymentMethod === 'easypaisa' ? EASYPAISA_NAME : JAZZCASH_NAME}
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 5vw, 22px)',
                  fontWeight: 600,
                  color: '#22a06b',
                }}
              >
                {paymentMethod === 'easypaisa'
                  ? EASYPAISA_NUMBER
                  : JAZZCASH_NUMBER}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#ff6b35',
                  marginTop: '10px',
                }}
              >
                Amount: Rs. {selectedPlan.minAmount.toLocaleString()}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}
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
                    marginTop: '10px',
                    width: '100%',
                    maxHeight: '200px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                />
              )}
            </div>
            <button
              onClick={handleInvest}
              disabled={loading}
              className="invest-submit-btn"
              style={{
                width: '100%',
                background: '#ff6b35',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '16px',
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

function InvestmentPage({ currentUser, userStats, loadUserStats, showToast }) {
  const navigate = useNavigate();
  return (
    <div id="investment-page" className="page active">
      <div
        className="page-container"
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Go Back
        </div>
        <div className="cart-header">💰 Investment Options</div>
        <div
          className="investment-options-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '30px',
          }}
        >
          <div
            onClick={() => navigate('/investment-plans')}
            className="investment-option-card"
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: '24px',
              padding: 'clamp(20px, 5vw, 30px)',
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid #ff6b35',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📊</div>
            <h3
              style={{
                color: '#ff6b35',
                marginBottom: '10px',
                fontSize: 'clamp(18px, 4vw, 22px)',
              }}
            >
              Investment Plans
            </h3>
            <p style={{ color: '#ccc', fontSize: '14px' }}>
              Invest minimum Rs. 500 and get up to 35% return
            </p>
            <div
              style={{ marginTop: '15px', fontSize: '12px', color: '#22a06b' }}
            >
              Click to View Plans →
            </div>
          </div>
          <div
            onClick={() => navigate('/my-investments')}
            className="investment-option-card"
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: '24px',
              padding: 'clamp(20px, 5vw, 30px)',
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid #22a06b',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>📋</div>
            <h3
              style={{
                color: '#22a06b',
                marginBottom: '10px',
                fontSize: 'clamp(18px, 4vw, 22px)',
              }}
            >
              My Investments
            </h3>
            <p style={{ color: '#ccc', fontSize: '14px' }}>
              Track your active and completed investments
            </p>
            <div
              style={{ marginTop: '15px', fontSize: '12px', color: '#ff6b35' }}
            >
              Click to View →
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  if (!currentUser)
    return (
      <div className="page active">
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 16px',
            textAlign: 'center',
          }}
        >
          <div className="big">💰</div>
          <h2>Please Login First</h2>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </div>
      </div>
    );

  return (
    <div id="my-investments-page" className="page active">
      <div
        className="page-container"
        style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/investment')}>
          ← Go Back
        </div>
        <div className="cart-header">📋 My Investments</div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            Loading investments...
          </div>
        ) : investments.length === 0 ? (
          <div className="cart-empty">
            <div className="big">📭</div>
            <p>No investments yet</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/investment-plans')}
            >
              Invest Now
            </button>
          </div>
        ) : (
          investments.map((inv) => (
            <div
              key={inv.id}
              className="investment-item"
              style={{
                background: '#1a1a27',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '15px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 'clamp(16px, 4vw, 18px)',
                      color: '#ff6b35',
                    }}
                  >
                    {inv.planName || 'Investment Plan'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    {inv.date.toLocaleDateString()}{' '}
                    {inv.date.toLocaleTimeString()}
                  </div>
                </div>
                <div
                  style={{
                    background:
                      inv.paymentMethod === 'easypaisa'
                        ? 'rgba(34,160,107,0.2)'
                        : 'rgba(255,107,53,0.2)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    color:
                      inv.paymentMethod === 'easypaisa' ? '#22a06b' : '#ff6b35',
                  }}
                >
                  {inv.paymentMethod === 'easypaisa'
                    ? '📱 EasyPaisa'
                    : '💳 JazzCash'}
                </div>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '15px',
                  marginBottom: '15px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    Invested Amount
                  </div>
                  <div
                    style={{ fontSize: '20px', fontWeight: 600, color: '#fff' }}
                  >
                    Rs. {inv.amount?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    Return Percentage
                  </div>
                  <div
                    style={{
                      fontSize: '20px',
                      fontWeight: 600,
                      color: '#22a06b',
                    }}
                  >
                    {inv.returnPercentage || '?'}%
                  </div>
                </div>
              </div>
              {inv.screenshotUrl && (
                <div style={{ marginTop: '10px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#aaa',
                      marginBottom: '5px',
                    }}
                  >
                    Payment Screenshot:
                  </div>
                  <img
                    src={inv.screenshotUrl}
                    alt="Screenshot"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '150px',
                      borderRadius: '8px',
                    }}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Withdrawal Page Component - With Modal for Mobile
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
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
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
        `Withdrawal amount must be at least Rs. ${MIN_WITHDRAWAL_AMOUNT.toLocaleString()}`,
      );
      return false;
    }
    if (amount > (userStats?.totalCashback || 0)) {
      showToast('You do not have enough cashback balance!');
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
      showToast('Please login first!');
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
      };

      let userUpdateData = {};
      let paymentDetails = {};

      if (paymentMethod === 'easypaisa') {
        const normalizedNumber = normalizePakistanPhone(easyPaisaNumber);
        withdrawalData.easyPaisaNumber = normalizedNumber;
        withdrawalData.easyPaisaName = easyPaisaName;
        userUpdateData.easyPaisaNumber = normalizedNumber;
        userUpdateData.easyPaisaName = easyPaisaName;
        paymentDetails = { number: normalizedNumber, name: easyPaisaName };
      } else if (paymentMethod === 'jazzcash') {
        const normalizedNumber = normalizePakistanPhone(jazzCashNumber);
        withdrawalData.jazzCashNumber = normalizedNumber;
        withdrawalData.jazzCashName = jazzCashName;
        userUpdateData.jazzCashNumber = normalizedNumber;
        userUpdateData.jazzCashName = jazzCashName;
        paymentDetails = { number: normalizedNumber, name: jazzCashName };
      } else if (paymentMethod === 'bank') {
        withdrawalData.bankName = selectedBank;
        withdrawalData.bankAccountNumber = bankAccountNumber;
        withdrawalData.bankAccountTitle = bankAccountTitle;
        userUpdateData.bankName = selectedBank;
        userUpdateData.bankAccountNumber = bankAccountNumber;
        userUpdateData.bankAccountTitle = bankAccountTitle;
        paymentDetails = {
          bank: selectedBank,
          accountNumber: bankAccountNumber,
          accountTitle: bankAccountTitle,
        };
      }

      await set(
        ref(rtdb, `withdrawals/${currentUser.uid}/${withdrawalId}`),
        withdrawalData,
      );

      const userRef = ref(rtdb, `users/${currentUser.uid}`);
      const userSnap = await get(userRef);
      const currentCashback = userSnap.exists()
        ? userSnap.val().totalCashback || 0
        : userStats?.totalCashback || 0;

      const newCashback = currentCashback - amount;

      await update(ref(rtdb, `users/${currentUser.uid}`), {
        totalCashback: newCashback,
        ...userUpdateData,
      });

      await set(
        ref(rtdb, `cashbackHistory/${currentUser.uid}/${withdrawalId}`),
        {
          type: 'withdrawal',
          amount: -amount,
          description: `Withdrawal of Rs. ${amount.toLocaleString()}`,
          timestamp: Date.now(),
          paymentMethod,
        },
      );

      await sendWithdrawalEmail(
        currentUser.phone,
        amount,
        paymentMethod,
        paymentDetails,
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

      setShowWithdrawModal(false);
      showToast(
        `✅ Withdrawal of Rs. ${amount.toLocaleString()} successful! New balance: Rs. ${newCashback.toLocaleString()}`,
      );
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      showToast('Error processing withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setWithdrawAmount('');
    setEasyPaisaNumber('');
    setEasyPaisaName('');
    setJazzCashNumber('');
    setJazzCashName('');
    setSelectedBank('');
    setBankAccountNumber('');
    setBankAccountTitle('');
    setPaymentMethod('easypaisa');
  };

  const openWithdrawModal = () => {
    resetForm();
    setShowWithdrawModal(true);
  };

  const closeWithdrawModal = () => {
    setShowWithdrawModal(false);
    resetForm();
  };

  if (!currentUser)
    return (
      <div className="page active">
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 16px',
            textAlign: 'center',
          }}
        >
          <div className="big">🏦</div>
          <h2>Please Login First</h2>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </div>
      </div>
    );

  return (
    <div id="withdrawal-page" className="page active">
      <div
        className="page-container"
        style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Go Back
        </div>
        <div className="cart-header">🏦 Withdraw Cashback</div>

        {/* Withdrawal Button to Open Modal */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={openWithdrawModal}
            className="open-withdraw-modal-btn"
            style={{
              width: '100%',
              background: '#ff6b35',
              border: 'none',
              borderRadius: '16px',
              padding: '18px',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <span>💸</span> Start Withdrawal
          </button>
        </div>

        {/* Withdrawal Modal */}
        {showWithdrawModal && (
          <div
            className="withdraw-modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              overflowY: 'auto',
            }}
            onClick={closeWithdrawModal}
          >
            <div
              className="withdraw-modal-content"
              style={{
                background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
                borderRadius: '24px',
                padding: '24px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeWithdrawModal}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#fff',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>💸</div>
                <h2
                  style={{
                    marginBottom: '5px',
                    color: '#ff6b35',
                    fontSize: 'clamp(20px, 5vw, 28px)',
                  }}
                >
                  Withdraw Cashback
                </h2>
              </div>

              <div
                className="balance-box"
                style={{
                  background: '#000000',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '20px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    color: '#aaa',
                    marginBottom: '5px',
                  }}
                >
                  Available Balance
                </div>
                <div
                  style={{
                    fontSize: 'clamp(32px, 8vw, 42px)',
                    fontWeight: 700,
                    color: '#22a06b',
                  }}
                >
                  Rs. {(userStats?.totalCashback || 0).toLocaleString()}
                </div>
                <div
                  style={{ fontSize: '12px', color: '#aaa', marginTop: '5px' }}
                >
                  Minimum withdrawal: Rs.{' '}
                  {MIN_WITHDRAWAL_AMOUNT.toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '14px',
                    color: '#ccc',
                  }}
                >
                  Select Withdrawal Method
                </label>
                <div
                  className="method-buttons"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {[
                    {
                      id: 'easypaisa',
                      label: '📱 EasyPaisa',
                      color: '#22a06b',
                    },
                    { id: 'jazzcash', label: '💳 JazzCash', color: '#ff6b35' },
                    { id: 'bank', label: '🏦 Bank Transfer', color: '#3b82f6' },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className="method-btn"
                      style={{
                        background:
                          paymentMethod === method.id
                            ? method.color
                            : '#1a1a27',
                        border:
                          paymentMethod === method.id
                            ? 'none'
                            : '1px solid #333',
                        borderRadius: '12px',
                        padding: '12px',
                        color: paymentMethod === method.id ? '#fff' : '#ccc',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: 'clamp(12px, 3vw, 14px)',
                      }}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'easypaisa' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
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
                      className="withdraw-input"
                      style={{
                        width: '100%',
                        background: '#1a1a27',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
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
                      className="withdraw-input"
                      style={{
                        width: '100%',
                        background: '#1a1a27',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'jazzcash' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
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
                      className="withdraw-input"
                      style={{
                        width: '100%',
                        background: '#1a1a27',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
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
                      className="withdraw-input"
                      style={{
                        width: '100%',
                        background: '#1a1a27',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'bank' && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
                        color: '#ccc',
                      }}
                    >
                      🏦 Select Bank
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="withdraw-select"
                      style={{
                        width: '100%',
                        background: '#1a1a27',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '16px',
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
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
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
                      className="withdraw-input"
                      style={{
                        width: '100%',
                        background: '#1a1a27',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontSize: '14px',
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
                      className="withdraw-input"
                      style={{
                        width: '100%',
                        background: '#1a1a27',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '12px 14px',
                        color: '#fff',
                        fontSize: '16px',
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
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
                  className="withdraw-input"
                  style={{
                    width: '100%',
                    background: '#1a1a27',
                    border: '1px solid #333',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '16px',
                  }}
                />
              </div>

              <button
                onClick={handleWithdraw}
                disabled={
                  loading ||
                  (userStats?.totalCashback || 0) < MIN_WITHDRAWAL_AMOUNT
                }
                className="withdraw-submit-btn"
                style={{
                  width: '100%',
                  background: '#ff6b35',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '14px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '16px',
                  opacity:
                    loading ||
                    (userStats?.totalCashback || 0) < MIN_WITHDRAWAL_AMOUNT
                      ? 0.6
                      : 1,
                }}
              >
                {loading ? 'Processing...' : 'Confirm Withdrawal'}
              </button>
            </div>
          </div>
        )}

        {/* Withdrawal History Section */}
        <div
          style={{
            background: '#1a1a27',
            borderRadius: '16px',
            padding: 'clamp(16px, 4vw, 25px)',
            marginTop: '20px',
          }}
        >
          <h3
            style={{
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#fff',
              fontSize: 'clamp(16px, 4vw, 20px)',
            }}
          >
            📋 Withdrawal History
          </h3>
          {loadingWithdrawals ? (
            <div
              style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}
            >
              Loading history...
            </div>
          ) : withdrawals.length === 0 ? (
            <div
              style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}
            >
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📭</div>
              <p>No withdrawal requests yet</p>
            </div>
          ) : (
            withdrawals.map((wd) => (
              <div
                key={wd.id}
                className="withdrawal-item"
                style={{
                  background: '#000000',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '16px',
                        color: '#fff',
                      }}
                    >
                      Rs. {wd.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                      {wd.date.toLocaleDateString()}{' '}
                      {wd.date.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#ccc',
                    marginTop: '8px',
                    wordBreak: 'break-all',
                  }}
                >
                  📱{' '}
                  {wd.paymentMethod === 'easypaisa'
                    ? `EasyPaisa: ${wd.easyPaisaNumber}`
                    : wd.paymentMethod === 'jazzcash'
                      ? `JazzCash: ${wd.jazzCashNumber}`
                      : `${wd.bankName}: ${wd.bankAccountNumber}`}
                </div>
              </div>
            ))
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
    const message = `Hello! 🎉\n\nJoin CashBack Shop and earn ${BASE_CASHBACK_PERCENTAGE}% cashback on every purchase! Use my referral link:\n\n${referLink}`;
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
      alert('Failed to copy');
    }
  };
  if (!currentUser)
    return (
      <div className="page active">
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 16px',
            textAlign: 'center',
          }}
        >
          <div className="big">🔗</div>
          <h2>Please Login First</h2>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </div>
      </div>
    );
  return (
    <div id="referral-page" className="page active">
      <div
        className="page-container"
        style={{ maxWidth: '700px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Go Back
        </div>
        <div
          className="cart-header"
          style={{ marginBottom: '30px', fontSize: 'clamp(18px, 5vw, 24px)' }}
        >
          🔗 Refer a Friend — Earn Rs. {REFER_BONUS.toLocaleString()}!
        </div>
        <div
          className="referral-card"
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: '24px',
            padding: 'clamp(20px, 5vw, 30px)',
            marginBottom: '30px',
            textAlign: 'center',
            border: '1px solid rgba(255,107,53,0.2)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '15px' }}>🎁</div>
          <h2
            style={{
              marginBottom: '10px',
              color: '#ff6b35',
              fontSize: 'clamp(24px, 6vw, 32px)',
            }}
          >
            Rs. {REFER_BONUS.toLocaleString()} Bonus!
          </h2>
          <p style={{ color: '#ccc', marginBottom: '25px', fontSize: '14px' }}>
            When your friend registers and makes their first order, you will
            receive {REFER_BONUS} rupees extra cashback!
          </p>
          <div
            className="referral-link-box"
            style={{
              background: '#000000',
              borderRadius: '12px',
              padding: '15px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: '#aaa',
                marginBottom: '8px',
                textAlign: 'left',
              }}
            >
              Your Referral Link:
            </div>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <input
                type="text"
                value={referLink}
                readOnly
                className="referral-link-input"
                style={{
                  flex: 1,
                  minWidth: '200px',
                  background: '#1a1a27',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  padding: '12px 15px',
                  color: '#ff6b35',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
              <button
                onClick={copyToClipboard}
                className="copy-btn"
                style={{
                  background: copySuccess ? '#22a06b' : '#ff6b35',
                  border: 'none',
                  borderRadius: '8px',
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
            className="share-buttons"
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={shareOnWhatsApp}
              className="share-wa-btn"
              style={{
                background: '#25D366',
                border: 'none',
                borderRadius: '40px',
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'clamp(12px, 3vw, 14px)',
              }}
            >
              📱 Share on WhatsApp
            </button>
            <button
              onClick={shareOnFacebook}
              className="share-fb-btn"
              style={{
                background: '#1877F2',
                border: 'none',
                borderRadius: '40px',
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'clamp(12px, 3vw, 14px)',
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

// My Referrals Page - Simplified (only Referred User and Signup Date, no Bonus column)
function MyReferralsPage({ currentUser }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    fetchReferrals();
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

  if (!currentUser)
    return (
      <div className="page active">
        <div
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '40px 16px',
            textAlign: 'center',
          }}
        >
          <div className="big">👥</div>
          <h2>Please Login First</h2>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login')}
          >
            Login
          </button>
        </div>
      </div>
    );

  const totalReferrals = referrals.length;

  return (
    <div id="my-referrals-page" className="page active">
      <div
        className="page-container"
        style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Go Back
        </div>
        <div className="cart-header">👥 My Referrals</div>

        <div
          className="referral-stats"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '25px',
          }}
        >
          <div
            className="stat-card"
            style={{
              background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
              borderRadius: '16px',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid #ff6b35',
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
            <div
              style={{ fontSize: '28px', fontWeight: 700, color: '#ff6b35' }}
            >
              {totalReferrals}
            </div>
            <div style={{ fontSize: '13px', color: '#aaa' }}>
              Total Referrals
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}>
            Loading referrals...
          </div>
        ) : referrals.length === 0 ? (
          <div className="cart-empty">
            <div className="big">👥</div>
            <p>No one has used your referral link yet</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/refer')}
            >
              Share Referral Link
            </button>
          </div>
        ) : (
          <div
            className="referrals-table-container"
            style={{
              background: '#1a1a27',
              borderRadius: '16px',
              overflow: 'auto',
            }}
          >
            <table
              className="referrals-table"
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '400px',
              }}
            >
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
                </tr>
              </thead>
              <tbody>
                {referrals.map((ref) => (
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Contact Us Page
function ContactUsPage({ onNavigate }) {
  const navigate = useNavigate();
  return (
    <div id="contact-us-page" className="page active">
      <div
        className="page-container"
        style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Go Back
        </div>
        <div className="cart-header">📞 Contact Us</div>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: '24px',
            padding: 'clamp(30px, 6vw, 40px)',
            textAlign: 'center',
            marginBottom: '30px',
          }}
        >
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>📞</div>
          <h2
            style={{
              color: '#ff6b35',
              marginBottom: '20px',
              fontSize: 'clamp(24px, 5vw, 32px)',
            }}
          >
            Get in Touch
          </h2>
          <p
            style={{
              color: '#ccc',
              marginBottom: '30px',
              fontSize: '16px',
              lineHeight: 1.6,
            }}
          >
            Have questions? We're here to help! Reach out to us anytime.
          </p>

          <div
            className="contact-info"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxWidth: '400px',
              margin: '0 auto',
            }}
          >
            <div
              className="contact-card"
              style={{
                background: '#000000',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📱</div>
              <div
                style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}
              >
                Call / WhatsApp
              </div>
              <a
                href={`tel:${SUPPORT_NUMBER}`}
                style={{
                  fontSize: 'clamp(20px, 5vw, 28px)',
                  fontWeight: 700,
                  color: '#22a06b',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {SUPPORT_NUMBER}
              </a>
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={() => {
                    window.open(`https://wa.me/${SUPPORT_NUMBER}`, '_blank');
                  }}
                  style={{
                    background: '#25D366',
                    border: 'none',
                    borderRadius: '40px',
                    padding: '10px 20px',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 600,
                    marginTop: '10px',
                  }}
                >
                  WhatsApp Now 📲
                </button>
              </div>
            </div>

            <div
              className="contact-card"
              style={{
                background: '#000000',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📧</div>
              <div
                style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}
              >
                Email
              </div>
              <a
                href="mailto:support@cashbackstore.pk"
                style={{
                  fontSize: 'clamp(14px, 3vw, 18px)',
                  fontWeight: 600,
                  color: '#ff6b35',
                  textDecoration: 'none',
                  wordBreak: 'break-all',
                }}
              >
                support@cashbackstore.pk
              </a>
            </div>

            <div
              className="contact-card"
              style={{
                background: '#000000',
                borderRadius: '16px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏰</div>
              <div
                style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}
              >
                Support Hours
              </div>
              <div
                style={{ fontSize: '16px', fontWeight: 600, color: '#22a06b' }}
              >
                24/7 Customer Support
              </div>
              <div
                style={{ fontSize: '14px', color: '#ccc', marginTop: '5px' }}
              >
                Always available to help you!
              </div>
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
      <div
        className="page-container"
        style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Go Back
        </div>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>🏪</div>
          <h1
            style={{
              color: '#ff6b35',
              marginBottom: '10px',
              fontSize: 'clamp(28px, 6vw, 40px)',
            }}
          >
            About Cashback Store
          </h1>
          <p
            style={{
              color: '#ccc',
              maxWidth: '700px',
              margin: '0 auto',
              fontSize: '14px',
            }}
          >
            Pakistan's most trusted cashback platform offering premium products
            with guaranteed returns
          </p>
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: '24px',
            padding: 'clamp(20px, 5vw, 30px)',
            marginBottom: '30px',
          }}
        >
          <h2
            style={{
              color: '#ff6b35',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: 'clamp(22px, 5vw, 28px)',
            }}
          >
            Our Mission
          </h2>
          <p
            style={{
              color: '#ccc',
              lineHeight: 1.6,
              textAlign: 'center',
              fontSize: '14px',
            }}
          >
            At Cashback Store, we believe in making every purchase rewarding.
            Our mission is to provide high-quality products while giving our
            customers the best cashback rewards and investment opportunities in
            Pakistan.
          </p>
        </div>
        <div style={{ marginBottom: '30px' }}>
          <h2
            style={{
              color: '#ff6b35',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: 'clamp(22px, 5vw, 28px)',
            }}
          >
            Meet Our Team
          </h2>
          <div
            className="team-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            {teamMembers.map((member, idx) => (
              <div
                key={idx}
                className="team-card"
                style={{
                  background: '#1a1a27',
                  borderRadius: '20px',
                  padding: '25px',
                  textAlign: 'center',
                  border: '1px solid #333',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>
                  {member.icon}
                </div>
                <h3
                  style={{
                    color: '#ff6b35',
                    marginBottom: '5px',
                    fontSize: 'clamp(16px, 4vw, 20px)',
                  }}
                >
                  {member.name}
                </h3>
                <div
                  style={{
                    fontSize: '14px',
                    color: '#22a06b',
                    marginBottom: '10px',
                  }}
                >
                  {member.role}
                </div>
                <p style={{ fontSize: '12px', color: '#aaa' }}>
                  {member.description}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: '24px',
            padding: 'clamp(20px, 5vw, 30px)',
            marginBottom: '30px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '15px' }}>🎧</div>
          <h2
            style={{
              color: '#ff6b35',
              marginBottom: '10px',
              fontSize: 'clamp(22px, 5vw, 28px)',
            }}
          >
            24/7 Customer Support
          </h2>
          <p style={{ color: '#ccc', marginBottom: '20px', fontSize: '14px' }}>
            Have questions? We're here to help!
          </p>
          <div
            className="support-contacts"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                background: '#000000',
                borderRadius: '12px',
                padding: '15px 25px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#aaa' }}>
                Call / WhatsApp
              </div>
              <div
                style={{
                  fontSize: 'clamp(16px, 4vw, 20px)',
                  fontWeight: 600,
                  color: '#22a06b',
                }}
              >
                {SUPPORT_NUMBER}
              </div>
            </div>
            <div
              style={{
                background: '#000000',
                borderRadius: '12px',
                padding: '15px 25px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#aaa' }}>Email</div>
              <div
                style={{
                  fontSize: 'clamp(14px, 3vw, 16px)',
                  fontWeight: 600,
                  color: '#ff6b35',
                }}
              >
                support@cashbackstore.pk
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            background: '#1a1a27',
            borderRadius: '24px',
            padding: 'clamp(20px, 5vw, 30px)',
            marginBottom: '30px',
          }}
        >
          <h2
            style={{
              color: '#ff6b35',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: 'clamp(22px, 5vw, 28px)',
            }}
          >
            Share Cashback Store
          </h2>
          <p
            style={{
              color: '#ccc',
              textAlign: 'center',
              marginBottom: '20px',
              fontSize: '14px',
            }}
          >
            Help your friends earn cashback too!
          </p>
          <div
            className="share-buttons"
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '15px',
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
                borderRadius: '40px',
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'clamp(12px, 3vw, 14px)',
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
                borderRadius: '40px',
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'clamp(12px, 3vw, 14px)',
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
                borderRadius: '40px',
                padding: '12px 24px',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: 'clamp(12px, 3vw, 14px)',
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
        style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}
      >
        Loading orders...
      </div>
    );
  return (
    <div id="orders-page" className="page active">
      <div
        className="page-container"
        style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Go Back
        </div>
        <div className="cart-header">📦 My Orders</div>
        {orders.length === 0 ? (
          <div className="cart-empty">
            <div className="big">📦</div>
            <p>You haven't placed any orders yet</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Start Shopping
            </button>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="order-item"
              style={{
                background: '#1a1a27',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '15px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>
                    Order ID
                  </div>
                  <div style={{ fontSize: '13px', color: '#fff' }}>
                    {order.id?.slice(0, 8)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Date</div>
                  <div style={{ fontSize: '13px', color: '#fff' }}>
                    {order.date.toLocaleDateString()}
                  </div>
                </div>
              </div>
              {order.items?.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <img
                    src={item.img}
                    alt={item.name}
                    style={{
                      width: '60px',
                      height: '60px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <div style={{ fontWeight: 500, color: '#fff' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#aaa' }}>
                      Qty: {item.qty} × Rs.{item.price.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff' }}>
                      Rs.{(item.price * item.qty).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#22a06b' }}>
                      +Rs.{item.cashback * item.qty} cashback
                    </div>
                  </div>
                </div>
              ))}
              <div
                style={{
                  borderTop: '1px solid #333',
                  marginTop: '12px',
                  paddingTop: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 600,
                    color: '#fff',
                    flexWrap: 'wrap',
                    gap: '10px',
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
                    marginTop: '5px',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <span>Cashback Earned ({BASE_CASHBACK_PERCENTAGE}%):</span>
                  <span>+Rs.{order.cashbackEarned?.toLocaleString()}</span>
                </div>
                {order.paymentDetails?.address && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#aaa',
                      marginTop: '8px',
                      wordBreak: 'break-word',
                    }}
                  >
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
        style={{ textAlign: 'center', padding: '40px', color: '#aaa' }}
      >
        Loading history...
      </div>
    );
  return (
    <div id="cashback-history-page" className="page active">
      <div
        className="page-container"
        style={{ maxWidth: '900px', margin: '0 auto', padding: '0 16px' }}
      >
        <div className="back-btn" onClick={() => navigate('/')}>
          ← Go Back
        </div>
        <div className="cart-header">💰 Cashback History</div>
        {cashbackEntries.length === 0 ? (
          <div className="cart-empty">
            <div className="big">💰</div>
            <p>No cashback earned yet</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Start Shopping
            </button>
          </div>
        ) : (
          cashbackEntries.map((entry) => (
            <div
              key={entry.id}
              className="cashback-entry"
              style={{
                background: '#1a1a27',
                borderRadius: '12px',
                padding: '15px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
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
                <div style={{ fontSize: '12px', color: '#aaa' }}>
                  {entry.date.toLocaleDateString()}
                </div>
                {entry.description && (
                  <div style={{ fontSize: '11px', color: '#aaa' }}>
                    {entry.description}
                  </div>
                )}
              </div>
              <div
                style={{
                  fontSize: '18px',
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
      className="marquee-container"
      style={{
        background: 'linear-gradient(90deg, #1a1a27, #0f0f1a, #1a1a27)',
        padding: '12px 20px',
        borderRadius: '40px',
        margin: '0 16px 20px 16px',
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
          fontSize: 'clamp(12px, 3vw, 14px)',
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
      <style>{`
        @keyframes marquee { 
          0% { transform: translateX(0%); } 
          100% { transform: translateX(-50%); } 
        } 
        .marquee-track:hover { animation-play-state: paused; } 
        @media (max-width: 768px) { 
          .marquee-track { animation-duration: 35s; gap: 25px; } 
        }
        .profile-phone {
          display: inline-block;
        }
        @media (max-width: 480px) {
          .profile-phone {
            display: none;
          }
          .profile-btn {
            padding: 7px 10px !important;
          }
        }
      `}</style>
    </div>
  );
}

// Info Cards Component
function InfoCards({ onNavigate, showInfoCards, setShowInfoCards }) {
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
      icon: '📞',
      title: 'Contact Us',
      description: '24/7 customer support',
      color: '#a855f7',
      link: '/contact',
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
    {
      icon: '👥',
      title: 'My Referrals',
      description: 'View your referred friends',
      color: '#cf7808',
      link: '/my-referrals',
    },
  ];

  if (!showInfoCards) return null;

  return (
    <div
      className="info-cards"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '16px',
        margin: '30px 16px',
        padding: '0',
      }}
    >
      {cards.map((card, idx) => (
        <div
          key={idx}
          onClick={() => {
            setShowInfoCards(false);
            onNavigate(card.link);
          }}
          className="info-card"
          style={{
            background: 'linear-gradient(135deg, #1a1a27 0%, #0f0f1a 100%)',
            borderRadius: '20px',
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
              fontSize: 'clamp(14px, 4vw, 16px)',
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
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [showInfoCards, setShowInfoCards] = useState(true);

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
      updateLastLoginTime(uid, phone);
    } else {
      setCurrentUser(null);
      setLoadingStats(false);
    }
  }, []);

  // Show info cards when navigating to home page
  useEffect(() => {
    if (location.pathname === '/') {
      setShowInfoCards(true);
    }
  }, [location.pathname]);

  const updateLastLoginTime = async (uid, phone) => {
    try {
      const referralsQuery = query(
        ref(rtdb, 'referrals'),
        orderByChild('referredUser'),
        equalTo(uid),
      );
      const snapshot = await get(referralsQuery);
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const referrerUid = childSnapshot.key;
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
        const userCashback = userSnap.val().totalCashback || 0;
        totalCashback = userCashback;
      }
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
    showToast('Logged out successfully!');
    setShowInfoCards(true);
    navigate('/');
  };

  const referLink = useMemo(() => {
    if (!currentUser?.phone) return 'Login to get link...';
    const digits = phoneDigitsForQuery(currentUser.phone);
    return `${window.location.origin}/?ref=${encodeURIComponent(digits)}`;
  }, [currentUser]);

  const copyText = async (text, okMsg) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast(okMsg);
    } catch {
      showToast('Failed to copy');
    }
  };

  const copyReferLink = () => {
    if (!currentUser) {
      showToast('Please login first!');
      navigate('/login');
      return;
    }
    copyText(referLink, '🔗 Referral link copied!');
  };

  const placeOrder = async (product, paymentMethod, paymentDetails) => {
    if (!currentUser) {
      showToast('Please login first!');
      navigate('/login');
      return;
    }
    if (!product) {
      showToast('Please select a product');
      return;
    }

    if (isProcessingOrder) {
      showToast('Please wait, order is being processed...');
      return;
    }

    setIsProcessingOrder(true);
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

      showToast('✅ Order placed successfully!');
    } catch (error) {
      console.error('Error placing order:', error);
      showToast('Error placing order');
    } finally {
      setIsProcessingOrder(false);
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
    const msg = `Hello!\n\nMy order confirmation:\n\n${items}\n\nTotal: Rs. ${lastOrderAmount.toLocaleString()}\n\nPayment: EasyPaisa ${EP_DISPLAY}\n\nCashback: ${BASE_CASHBACK_PERCENTAGE}% (Rs. ${orderCashbackTotal.toLocaleString()})\n\nInvestment: Earn ${INVESTMENT_RETURN_PERCENTAGE}% on cashback!`;
    const r = localStorage.getItem('cbRef');
    const extra = r ? `\nReferral: ${r}` : '';
    window.open(
      `https://wa.me/923001234567?text=${encodeURIComponent(msg + extra)}`,
      '_blank',
    );
    closeOrderModal();
  };

  const handleNavigate = (path) => {
    setShowInfoCards(false);
    navigate(path);
  };

  return (
    <>
      <nav className="navbar">
        <div
          className="logo"
          onClick={() => {
            setShowInfoCards(true);
            navigate('/');
          }}
        >
          Cash<span>back</span> Store
        </div>
        <div className="nav-right">
          <div>
            {currentUser ? (
              <ProfileDropdown
                currentUser={currentUser}
                onLogout={logout}
                onNavigate={handleNavigate}
                userStats={userStats}
                loadingStats={loadingStats}
              />
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowInfoCards(false);
                  navigate('/login');
                }}
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>
      <LiveBalanceMarquee />
      <InfoCards
        onNavigate={handleNavigate}
        showInfoCards={showInfoCards}
        setShowInfoCards={setShowInfoCards}
      />
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
              isProcessingOrder={isProcessingOrder}
            />
          }
        />
        <Route
          path="/login"
          element={
            <LoginPage
              currentUser={currentUser}
              onLoginComplete={() => {
                setShowInfoCards(true);
                navigate('/');
              }}
              setCurrentUser={setCurrentUser}
              loadUserStats={loadUserStats}
            />
          }
        />
        <Route
          path="/signup"
          element={
            <SignupPage
              onSignupComplete={() => {
                setShowInfoCards(true);
                navigate('/');
              }}
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
        <Route
          path="/about"
          element={<AboutUsPage onNavigate={handleNavigate} />}
        />
        <Route
          path="/contact"
          element={<ContactUsPage onNavigate={handleNavigate} />}
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
            <h2>Order Confirmed!</h2>
            <p>
              Send payment to{' '}
              <strong style={{ color: 'var(--green)' }}>{EP_DISPLAY}</strong>{' '}
              via EasyPaisa.
              <br />
              <br />
              Send screenshot on WhatsApp:{' '}
              <strong style={{ color: 'var(--accent2)' }}>{EP_DISPLAY}</strong>
              <br />
              <br />
              Your{' '}
              <strong style={{ color: 'var(--accent2)' }}>
                Rs. {orderCashbackTotal.toLocaleString()}
              </strong>{' '}
              cashback ({BASE_CASHBACK_PERCENTAGE}% of total) will be credited
              within 24 hours! 💰
              <br />
              <br />
              Referral bonus:{' '}
              <strong style={{ color: 'var(--green)' }}>
                Rs. {REFER_BONUS.toLocaleString()}
              </strong>{' '}
              (when friend places order).
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
      <footer className="footer">
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
            <span className="dot"></span> Cashback Store Official Portal
          </div>
          <div
            className="user-info-bar"
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '16px',
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
                  style={{ width: '100%', padding: '9px' }}
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
              ← Go Back
            </div>
            <div className="cart-empty">
              <div className="big">❌</div>
              <p>Product not found.</p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                View Products
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
            ← Go Back
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
                style={{
                  color: '#22a06b',
                  marginBottom: '10px',
                  fontSize: '14px',
                }}
              >
                💰 Cashback: {BASE_CASHBACK_PERCENTAGE}% (Rs.{' '}
                {p.cashback.toLocaleString()})
              </div>
              <div className="det-desc">{p.desc}</div>
              <div
                style={{
                  background: '#1a1a27',
                  borderRadius: '16px',
                  padding: '20px',
                  marginTop: '20px',
                }}
              >
                <h3
                  style={{
                    marginBottom: '15px',
                    fontSize: '16px',
                    color: '#fff',
                  }}
                >
                  📈 Investment Details
                </h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>Cycle</div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>
                      {cycleDays} Days
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                      Rate of Return
                    </div>
                    <div style={{ fontWeight: 600, color: '#22a06b' }}>
                      {returnPercentage}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                      Daily Profit (est.)
                    </div>
                    <div style={{ fontWeight: 600, color: '#ff6b35' }}>
                      Rs. {dailyProfit.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                      Total Profit
                    </div>
                    <div style={{ fontWeight: 600, color: '#22a06b' }}>
                      Rs. {totalProfit.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '15px',
                    height: '8px',
                    background: '#333',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(dailyProfit / ((p.price * returnPercentage) / 100 / cycleDays)) * 100}%`,
                      height: '100%',
                      background: '#ff6b35',
                      borderRadius: '4px',
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
                  padding: '12px',
                  borderRadius: '12px',
                  marginTop: '10px',
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
    isProcessingOrder,
  }) {
    const { id } = useParams();
    const navigate = useNavigate();
    const [address, setAddress] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState('');
    const [orderLoading, setOrderLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('easypaisa');
    const product = useMemo(
      () => PRODUCTS.find((x) => String(x.id) === String(id)) || null,
      [id],
    );

    if (!product)
      return (
        <div id="cart-page" className="page active">
          <div style={{ padding: '0', maxWidth: '780px', margin: '0 auto' }}>
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
      if (orderLoading || isProcessingOrder) {
        alert('Please wait, order is being processed...');
        return;
      }

      setOrderLoading(true);
      try {
        const base64Image = await compressImage(screenshot);
        await onPlaceOrder(product, paymentMethod, {
          address,
          screenshotUrl: base64Image,
          paymentMethod,
        });
        navigate('/');
      } catch (error) {
        console.error('Error processing screenshot:', error);
        alert('Failed to process screenshot: ' + error.message);
      } finally {
        setOrderLoading(false);
      }
    };

    return (
      <div id="cart-page" className="page active">
        <div style={{ padding: '0', maxWidth: '780px', margin: '0 auto' }}>
          <div className="back-btn" onClick={() => navigate('/')}>
            ← Back to Products
          </div>
          <div className="cart-item" style={{ marginBottom: '14px' }}>
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
                style={{
                  color: '#22a06b',
                  fontSize: '.86rem',
                  marginTop: '6px',
                }}
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

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}
            >
              Select Payment Method
            </label>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setPaymentMethod('easypaisa')}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background:
                    paymentMethod === 'easypaisa' ? '#22a06b' : '#0f0f1a',
                  border:
                    paymentMethod === 'easypaisa' ? 'none' : '1px solid #333',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                📱 EasyPaisa
              </button>
              <button
                onClick={() => setPaymentMethod('jazzcash')}
                style={{
                  flex: 1,
                  minWidth: '120px',
                  background:
                    paymentMethod === 'jazzcash' ? '#ff6b35' : '#0f0f1a',
                  border:
                    paymentMethod === 'jazzcash' ? 'none' : '1px solid #333',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                💳 JazzCash
              </button>
            </div>
          </div>

          <div className="ep-pay-box">
            <div
              style={{
                background: '#000',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{ fontSize: '14px', color: '#aaa', marginBottom: '5px' }}
              >
                Send payment to{' '}
                {paymentMethod === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
              </div>
              <div
                style={{
                  fontSize: 'clamp(22px, 6vw, 28px)',
                  fontWeight: 700,
                  color: '#ff6b35',
                }}
              >
                {paymentMethod === 'easypaisa' ? EASYPAISA_NAME : JAZZCASH_NAME}
              </div>
              <div
                style={{
                  fontSize: 'clamp(18px, 5vw, 22px)',
                  fontWeight: 600,
                  color: '#22a06b',
                }}
              >
                {paymentMethod === 'easypaisa'
                  ? EASYPAISA_NUMBER
                  : JAZZCASH_NUMBER}
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: '#ff6b35',
                  marginTop: '10px',
                }}
              >
                Amount: Rs. {product.price.toLocaleString()}
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label
                style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}
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
                  borderRadius: '12px',
                  padding: '14px 16px',
                  color: '#fff',
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}
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
                    marginTop: '10px',
                    width: '100%',
                    maxHeight: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
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
                  borderRadius: '9px',
                  fontSize: '.82rem',
                  whiteSpace: 'nowrap',
                }}
              >
                Copy Link
              </button>
            </div>
          </div>
          <button
            className="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={orderLoading || isProcessingOrder}
            style={{
              opacity: orderLoading || isProcessingOrder ? 0.6 : 1,
              cursor:
                orderLoading || isProcessingOrder ? 'not-allowed' : 'pointer',
            }}
          >
            {orderLoading ? 'Processing...' : 'Buy now'}
          </button>
          {!currentUser && (
            <p
              style={{
                marginTop: '10px',
                color: '#aaa',
                fontSize: '.78rem',
                textAlign: 'center',
              }}
            >
              Login required to confirm payment.
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
        setStatus('⚠️ Invalid number format — Use +923001234567');
        return;
      }
      if (!password || password.length < 6) {
        setStatus('⚠️ Password must be at least 6 characters');
        return;
      }
      try {
        setLoading(true);
        const phoneKey = phoneDigitsForQuery(normalizedPhone);
        const uidSnap = await get(child(ref(rtdb), `usersByPhone/${phoneKey}`));
        if (!uidSnap.exists()) {
          setStatus('❌ Account not found. Please sign up first.');
          return;
        }
        const uid = uidSnap.val();
        const userSnap = await get(child(ref(rtdb), `users/${uid}`));
        const data = userSnap.exists() ? userSnap.val() : null;
        if (!data) {
          setStatus('❌ Account data not found. Please sign up again.');
          return;
        }
        const ok = await bcrypt.compare(password, data.passwordHash || '');
        if (!ok) {
          setStatus('❌ Incorrect password');
          return;
        }

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
        setStatus('🎉 Login successful!');
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
          <p className="login-sub">
            Login with your phone number and password.
          </p>
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
              ⚠️ Use format with +92 — e.g.,{' '}
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
        setStatus('⚠️ Invalid number format — Use +923001234567');
        return;
      }
      if (!password || password.length < 6) {
        setStatus('⚠️ Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setStatus('⚠️ Passwords do not match');
        return;
      }
      try {
        setLoading(true);
        const phoneKey = phoneDigitsForQuery(normalizedPhone);
        const uidSnap = await get(child(ref(rtdb), `usersByPhone/${phoneKey}`));
        if (uidSnap.exists()) {
          setStatus('❌ This number is already registered. Please login.');
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
        setStatus('🎉 Account created successfully!');
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
          <p className="login-sub">
            Sign up using your phone number and password.
          </p>
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
              ⚠️ Use format with +92 — e.g.,{' '}
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
              Already have an account? Login
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
