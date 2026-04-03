import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { child, get, ref, set } from 'firebase/database'
import bcrypt from 'bcryptjs'
import { rtdb } from './firebase'
import { normalizePakistanPhone, phoneDigitsForQuery } from './lib/phoneAuth'
import './styles/cashback.css'

const FALLBACK = 'https://placehold.co/600x400/1a1a27/ff6b35?text=Product'

const EP_NUM = '03001234567'
const EP_DISPLAY = '0300-1234567'

// Your requirement:
// - Buy product: 1000 cashback
// - Refer friend: 1500 cashback
const BASE_CASHBACK = 1000
const REFER_BONUS = 1500

const PRODUCTS = [
  { id: 1, name: 'Ceiling Fan 56″', category: 'fans', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80', price: 4500 },
  { id: 2, name: 'Pedestal Stand Fan 18″', category: 'fans', img: 'https://images.unsplash.com/photo-1621619856624-42fd193a0661?w=600&q=80', price: 2800 },
  { id: 3, name: 'Table Fan 12″', category: 'fans', img: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=600&q=80', price: 1800 },
  { id: 4, name: 'Tower Fan 40″', category: 'fans', img: 'https://images.unsplash.com/photo-1591206369811-4eeb2f03bc95?w=600&q=80', price: 6500 },
  { id: 5, name: 'Dumbbells Set 20kg', category: 'gym', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80', price: 5500 },
  { id: 6, name: 'Resistance Bands Set', category: 'gym', img: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&q=80', price: 1200 },
  { id: 7, name: 'Speed Jump Rope', category: 'gym', img: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=600&q=80', price: 650 },
  { id: 8, name: 'Yoga Mat 6mm', category: 'gym', img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80', price: 1400 },
  { id: 9, name: 'Ab Wheel Roller', category: 'gym', img: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80', price: 850 },
  { id: 10, name: 'Electric Kettle 1.7L', category: 'kitchen', img: 'https://images.unsplash.com/photo-1594049908254-a5789c3f3eba?w=600&q=80', price: 2200 },
  { id: 11, name: 'Non-Stick Fry Pan 28cm', category: 'kitchen', img: 'https://images.unsplash.com/photo-1585664811087-47f65abbad64?w=600&q=80', price: 1800 },
  { id: 12, name: 'Air Fryer 4 Litre', category: 'kitchen', img: 'https://images.unsplash.com/photo-1648565606624-39f0c3c8e738?w=600&q=80', price: 7500 },
  { id: 13, name: 'Wireless Earbuds ANC', category: 'electronics', img: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600&q=80', price: 3200 },
  { id: 14, name: 'Power Bank 20000mAh', category: 'electronics', img: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600&q=80', price: 2800 },
  { id: 15, name: 'Smart LED Strip 5m', category: 'electronics', img: 'https://images.unsplash.com/photo-1586105449897-20b5efeb3233?w=600&q=80', price: 1200 },
  { id: 16, name: 'USB-C Hub 7-in-1', category: 'electronics', img: 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=600&q=80', price: 2100 },
].map((p) => ({
  ...p,
  cashback: BASE_CASHBACK,
  desc:
    'Assalam o Alaikum! ' +
    'Is product ko buy karne par aapko ' +
    `Rs. ${BASE_CASHBACK} cashback milega (24 ghante ke andar).\n` +
    `Agar aap kisi dost ko refer karte hain, to aapko ${REFER_BONUS} extra cashback milega.`,
}))

function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()

  const [currentUser, setCurrentUser] = useState(null) // { uid, phone }
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cbCart') || '[]')
    } catch {
      return []
    }
  })

  const [toast, setToast] = useState('')
  const toastTimerRef = useRef(null)
  const showToast = (msg) => {
    setToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3200)
  }

  const [orderModalOpen, setOrderModalOpen] = useState(false)
  const [orderCashbackTotal, setOrderCashbackTotal] = useState(0)

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart])

  useEffect(() => {
    localStorage.setItem('cbCart', JSON.stringify(cart))
  }, [cart])

  // Save referral param (ref=...) in localStorage so it can be used later on order placement.
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const ref = sp.get('ref')
    if (ref) localStorage.setItem('cbRef', ref)
  }, [location.search])

  // Firestore-only "session" (simple demo).
  useEffect(() => {
    const uid = localStorage.getItem('cbUid')
    const phone = localStorage.getItem('cbPhone')
    if (uid && phone) setCurrentUser({ uid, phone })
    else setCurrentUser(null)
  }, [])

  const logout = async () => {
    localStorage.removeItem('cbUid')
    localStorage.removeItem('cbPhone')
    setCurrentUser(null)
    showToast('Logout ho gaye!')
    navigate('/')
  }

  const addToCart = (id) => {
    const p = PRODUCTS.find((x) => x.id === id)
    if (!p) return
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.id === id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + 1 }
        return next
      }
      return [...prev, { id: p.id, name: p.name, img: p.img, price: p.price, cashback: p.cashback, qty: 1 }]
    })
    showToast(`✅ "${p.name}" cart mein!`)
  }

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((x) => x.id !== id))
  }

  const changeQty = (id, delta) => {
    setCart((prev) => {
      const it = prev.find((x) => x.id === id)
      if (!it) return prev
      const nextQty = it.qty + delta
      if (nextQty <= 0) return prev.filter((x) => x.id !== id)
      return prev.map((x) => (x.id === id ? { ...x, qty: nextQty } : x))
    })
  }

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart])
  const cashbackTotal = useMemo(() => cart.reduce((s, i) => s + i.cashback * i.qty, 0), [cart])

  const referLink = useMemo(() => {
    if (!currentUser?.phone) return 'Login karo link ke liye...'
    const digits = phoneDigitsForQuery(currentUser.phone) // 923001234567
    return `${window.location.origin}/?ref=${encodeURIComponent(digits)}`
  }, [currentUser])

  const copyText = async (text, okMsg) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(okMsg)
    } catch {
      showToast('Copy nahi ho saka')
    }
  }

  const copyEP = () => copyText(EP_NUM, `📋 ${EP_DISPLAY} copy ho gaya!`)

  const copyReferLink = () => {
    if (!currentUser) {
      showToast('Pehle login karo!')
      navigate('/login')
      return
    }
    copyText(referLink, '🔗 Refer link copy ho gaya!')
  }

  const placeOrder = () => {
    if (!currentUser) {
      showToast('Pehle login karo!')
      navigate('/login')
      return
    }
    if (cart.length === 0) {
      showToast('Cart khali hai!')
      return
    }
    setOrderCashbackTotal(cashbackTotal)
    setOrderModalOpen(true)
  }

  const closeOrderModal = () => {
    setOrderModalOpen(false)
    setCart([])
    navigate('/')
  }

  const shareWhatsApp = () => {
    const items = cart.map((i) => `• ${i.name} ×${i.qty} = Rs.${(i.price * i.qty).toLocaleString()}`).join('\n')
    const msg = `Assalam o Alaikum!\n\nMera order confirm karna hai:\n\n${items}\n\nTotal: Rs. ${subtotal.toLocaleString()}\n\nPayment: EasyPaisa ${EP_DISPLAY}\n`
    const ref = localStorage.getItem('cbRef')
    const extra = ref ? `\nReferral: ${ref}` : ''
    const url = `https://wa.me/923001234567?text=${encodeURIComponent(msg + extra)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    closeOrderModal()
  }

  return (
    <>
      <nav>
        <div className="logo" onClick={() => navigate('/')}>
          Cash<span>Back</span> Shop
        </div>
        <div className="nav-right">
          <button className="cart-btn" onClick={() => navigate('/cart')} aria-label="Cart">
            🛒 Cart
            <span className={`cart-count ${cartCount > 0 ? 'show' : ''}`}>{cartCount}</span>
          </button>

          <div id="user-info" style={{ display: currentUser ? 'flex' : 'none', alignItems: 'center', gap: 9 }}>
            <span className="user-badge">{currentUser?.phone ? `📱 ${currentUser.phone}` : 'User'}</span>
            <button className="btn btn-outline" onClick={logout}>
              Logout
            </button>
          </div>

          {!currentUser ? (
            <button className="btn btn-primary" onClick={() => navigate('/login')}>
              Login
            </button>
          ) : null}
        </div>
      </nav>

      <div id="toast" className={toast ? 'show' : ''} role="status" aria-live="polite">
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
        <Route path="/login" element={<LoginPage currentUser={currentUser} onLoginComplete={() => navigate('/')} />} />
        <Route
          path="/signup"
          element={<SignupPage onSignupComplete={() => navigate('/')} />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <div className={`modal-overlay ${orderModalOpen ? 'open' : ''}`} role="dialog" aria-modal="true">
        {orderModalOpen ? (
          <div className="modal">
            <div className="modal-icon">🎉</div>
            <h2>Order Confirm!</h2>
            <p>
              <strong style={{ color: 'var(--green)' }}>{EP_DISPLAY}</strong> pe EasyPaisa se payment bhejo.
              <br />
              <br />
              Screenshot WhatsApp pe bhejo: <strong style={{ color: 'var(--accent2)' }}>{EP_DISPLAY}</strong>
              <br />
              <br />
              Tumhara <strong style={{ color: 'var(--accent2)' }}>Rs. {orderCashbackTotal.toLocaleString()}</strong> cashback 24 ghante mein aa jayega! 💰
              <br />
              <br />
              Refer bonus: <strong style={{ color: 'var(--green)' }}>Rs. {REFER_BONUS.toLocaleString()}</strong> (jab dost order kare).
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
        <span>💚 EasyPaisa se Pay Karo — Cashback Kamao!</span>
      </footer>
    </>
  )

  function HomePage({ cart, onAddToCart }) {
    const [filter, setFilter] = useState('all')

    const list = useMemo(() => {
      if (filter === 'all') return PRODUCTS
      return PRODUCTS.filter((p) => p.category === filter)
    }, [filter])

    const navigate = useNavigate()

    return (
      <div className="page active">
        <section className="hero">
          <div className="cb-banner">
            <span className="dot"></span> Buy & Earn — Real Cash Back on Every Order!
          </div>
          <h1>
            Shop Smart.
            <br />
            <em>Earn Every Time.</em>
          </h1>
          <p>Top products khareedo, EasyPaisa se pay karo, aur instant cashback kamao!</p>
        </section>

        <div className="filter-tabs">
          <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All Products
          </button>
          <button className={`tab ${filter === 'fans' ? 'active' : ''}`} onClick={() => setFilter('fans')}>
            Fans
          </button>
          <button className={`tab ${filter === 'gym' ? 'active' : ''}`} onClick={() => setFilter('gym')}>
            Gym
          </button>
          <button
            className={`tab ${filter === 'kitchen' ? 'active' : ''}`}
            onClick={() => setFilter('kitchen')}
          >
            Kitchen
          </button>
          <button
            className={`tab ${filter === 'electronics' ? 'active' : ''}`}
            onClick={() => setFilter('electronics')}
          >
            Electronics
          </button>
        </div>

        <div className="products-grid">
          {list.map((p) => {
            const it = cart.find((x) => x.id === p.id)
            return (
              <div key={p.id} className="product-card">
                <div onClick={() => navigate(`/product/${p.id}`)}>
                  <div className="card-img">
                    <img
                      src={p.img}
                      alt={p.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null
                        e.currentTarget.src = FALLBACK
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
                      <span className="cb-tag">💰 Rs.{p.cashback} Cashback</span>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '0 14px 14px' }}>
                  <button
                    className={`add-cart-btn ${it ? 'added' : ''}`}
                    style={{ width: '100%', padding: 9 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddToCart(p.id)
                    }}
                  >
                    {it ? `✅ Cart Mein (${it.qty})` : '🛒 Add to Cart'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function DetailPage({ cart, onAddToCart }) {
    const { id } = useParams()
    const navigate = useNavigate()

    const p = useMemo(() => PRODUCTS.find((x) => String(x.id) === String(id)) || null, [id])
    const it = p ? cart.find((x) => x.id === p.id) : null

    if (!p) {
      return (
        <div className="page active">
          <div id="detail-page">
            <div className="back-btn" onClick={() => navigate('/')}>
              ← Wapas Jao
            </div>
            <div className="cart-empty">
              <div className="big">❌</div>
              <p style={{ fontFamily: 'var(--fh)', fontSize: '1.1rem', marginBottom: 8 }}>Product nahi mila.</p>
              <button className="btn btn-primary" onClick={() => navigate('/')}>
                Products Dekho
              </button>
            </div>
          </div>
        </div>
      )
    }

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
                  e.currentTarget.onerror = null
                  e.currentTarget.src = FALLBACK
                }}
              />
            </div>
            <div>
              <div className="det-cat">{p.category.toUpperCase()}</div>
              <div className="det-name">{p.name}</div>
              <div className="det-price">Rs. {p.price.toLocaleString()} PKR</div>
              <div className="det-desc">{p.desc}</div>
              <button
                className={`detail-add-btn ${it ? 'added' : ''}`}
                onClick={() => {
                  onAddToCart(p.id)
                }}
              >
                {it ? `✅ Cart Mein (${it.qty}) — Aur Add Karo` : '🛒 Add to Cart'}
              </button>
              <button
                className="btn btn-outline"
                style={{ width: '100%', padding: 12, borderRadius: 12, marginTop: 10 }}
                onClick={() => navigate('/cart')}
              >
                View Cart →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
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
    const navigate = useNavigate()
    const empty = cart.length === 0

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
              <p style={{ fontFamily: 'var(--fh)', fontSize: '1.1rem', marginBottom: 8 }}>Cart Khali Hai!</p>
              <p style={{ marginBottom: 20 }}>Koi product add nahi kiya abhi tak.</p>
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
                          e.currentTarget.onerror = null
                          e.currentTarget.src = FALLBACK
                        }}
                      />
                    </div>
                    <div className="ci-info">
                      <div className="ci-name">{it.name}</div>
                      <div className="ci-price">
                        Rs. {(it.price * it.qty).toLocaleString()}{' '}
                        <span style={{ color: 'var(--muted)', fontSize: '.76rem' }}>
                          ({it.qty}×Rs.{it.price.toLocaleString()})
                        </span>
                      </div>
                      <div className="ci-qty">
                        <button className="qty-btn" onClick={() => onChangeQty(it.id, -1)}>
                          −
                        </button>
                        <span className="qty-num">{it.qty}</span>
                        <button className="qty-btn" onClick={() => onChangeQty(it.id, +1)}>
                          +
                        </button>
                      </div>
                    </div>
                    <button className="ci-remove" onClick={() => onRemove(it.id)}>
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
                  <span className="lbl">Tumhara Cashback</span>
                  <span className="val green">Rs. {cashbackTotal.toLocaleString()}</span>
                </div>
                <div className="os-row total">
                  <span className="lbl">Aap Pay Karein</span>
                  <span className="val gold">Rs. {subtotal.toLocaleString()}</span>
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
                  <div className="ep-step">
                    <div className="num">1</div>
                    <span>
                      EasyPaisa app kholo ya <strong>*786#</strong> dial karo
                    </span>
                  </div>
                  <div className="ep-step">
                    <div className="num">2</div>
                    <span>
                      <strong>Send Money</strong> → Number: <strong>{epDisplay}</strong>
                    </span>
                  </div>
                  <div className="ep-step">
                    <div className="num">3</div>
                    <span>
                      Amount bhejo: <strong>{`Rs. ${subtotal.toLocaleString()}`}</strong>
                    </span>
                  </div>
                  <div className="ep-step">
                    <div className="num">4</div>
                    <span>
                      Payment screenshot WhatsApp pe bhejo: <strong>{epDisplay}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="cb-info-box">
                <div className="cb-info-title">💰 Tumhara CashBack — Guaranteed!</div>
                <div className="cb-row">
                  <span className="ic">🛒</span>
                  <span>
                    Aap jab ye product buy karte hain, aapko <strong>Rs. {BASE_CASHBACK.toLocaleString()} cashback</strong> milega — seedha EasyPaisa mein <strong>24 ghante ke andar!</strong>
                  </span>
                </div>
                <div className="cb-row">
                  <span className="ic">👥</span>
                  <span>
                    Kisi bhi dost ko <strong>refer karo</strong> — woh khareedega to aapko <strong>Rs. {REFER_BONUS.toLocaleString()} extra cashback</strong> milega!
                  </span>
                </div>
              </div>

              <div className="refer-box">
                <h3>🔗 Refer Karo — Rs. {REFER_BONUS.toLocaleString()} Kamao</h3>
                <div className="refer-link-row">
                  <input className="refer-link-input" readOnly value={referLink} />
                  <button
                    className="btn btn-green"
                    onClick={onCopyRefer}
                    style={{ borderRadius: 9, fontSize: '.82rem', whiteSpace: 'nowrap' }}
                  >
                    Copy 🔗
                  </button>
                </div>
                <p style={{ fontSize: '.73rem', color: 'var(--muted)', marginTop: 7 }}>
                  👆 Dosto ko bhejo — unke order pe <strong style={{ color: 'var(--green)' }}>Rs. {REFER_BONUS.toLocaleString()}</strong> tumhare EasyPaisa mein!
                </p>
              </div>

              <button className="place-order-btn" onClick={onPlaceOrder}>
                ✅ Order Confirm Karo
              </button>

              {!currentUser ? (
                <p style={{ marginTop: 10, color: 'var(--muted)', fontSize: '.78rem', textAlign: 'center' }}>
                  Payment confirm karne ke liye login zaroori hai.
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    )
  }

  function LoginPage({ onLoginComplete, currentUser }) {
    const navigate = useNavigate()
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')

    useEffect(() => {
      if (currentUser) navigate('/')
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser])

    const submit = async (e) => {
      e.preventDefault()
      setStatus('')

      const normalizedPhone = normalizePakistanPhone(phone)
      if (!normalizedPhone) {
        setStatus('⚠️ Number format galat — +923001234567 likho')
        return
      }
      if (!password || password.length < 6) {
        setStatus('⚠️ Password 6+ characters rakho')
        return
      }

      try {
        setLoading(true)
        const phoneKey = phoneDigitsForQuery(normalizedPhone) // 923001234567
        const uidSnap = await get(child(ref(rtdb), `usersByPhone/${phoneKey}`))
        if (!uidSnap.exists()) {
          setStatus('❌ Account nahi mila. Pehle signup karo.')
          return
        }
        const uid = uidSnap.val()
        const userSnap = await get(child(ref(rtdb), `users/${uid}`))
        const data = userSnap.exists() ? userSnap.val() : null
        if (!data) {
          setStatus('❌ Account data nahi mila. Dobara signup karo.')
          return
        }
        const ok = await bcrypt.compare(password, data.passwordHash || '')
        if (!ok) {
          setStatus('❌ Password galat hai')
          return
        }

        localStorage.setItem('cbUid', uid)
        localStorage.setItem('cbPhone', normalizedPhone)
        setCurrentUser({ uid, phone: normalizedPhone })
        setStatus('🎉 Login ho gaya!')
        onLoginComplete?.()
      } catch {
        setStatus('❌ Login failed. Number/password check karo.')
      } finally {
        setLoading(false)
      }
    }

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
              ⚠️ +92 ke saath likho — jaise <strong style={{ color: 'var(--accent2)' }}>+923001234567</strong>
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

            <div className={`status-msg ${status.includes('❌') || status.includes('⚠️') ? 'error' : ''}`}>{status}</div>
          </form>
        </div>
      </div>
    )
  }

  function SignupPage({ onSignupComplete }) {
    const navigate = useNavigate()

    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')

    const submit = async (e) => {
      e.preventDefault()
      setStatus('')

      const normalizedPhone = normalizePakistanPhone(phone)
      if (!normalizedPhone) {
        setStatus('⚠️ Number format galat — +923001234567 likho')
        return
      }
      if (!password || password.length < 6) {
        setStatus('⚠️ Password 6+ characters rakho')
        return
      }
      if (password !== confirmPassword) {
        setStatus('⚠️ Password match nahi kar rahe')
        return
      }

      try {
        setLoading(true)
        const phoneKey = phoneDigitsForQuery(normalizedPhone) // 923001234567

        // Prevent duplicate phone (fast lookup).
        const uidSnap = await get(child(ref(rtdb), `usersByPhone/${phoneKey}`))
        if (uidSnap.exists()) {
          setStatus('❌ Ye number pehle se registered hai. Login karo.')
          return
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const uid = crypto.randomUUID()
        await set(ref(rtdb, `users/${uid}`), {
          phone: normalizedPhone,
          passwordHash,
          createdAt: Date.now(),
        })
        await set(ref(rtdb, `usersByPhone/${phoneKey}`), uid)

        localStorage.setItem('cbUid', uid)
        localStorage.setItem('cbPhone', normalizedPhone)
        setCurrentUser({ uid, phone: normalizedPhone })

        setStatus('🎉 Account created!')
        onSignupComplete?.()
        navigate('/')
      } catch (err) {
        setStatus(err?.message || '❌ Signup failed.')
      } finally {
        setLoading(false)
      }
    }

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
              ⚠️ +92 ke saath likho — jaise <strong style={{ color: 'var(--accent2)' }}>+923001234567</strong>
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

            <button className="login-btn secondary" type="button" onClick={() => navigate('/login')}>
              Already have account? Login
            </button>

            <div className={`status-msg ${status.includes('❌') || status.includes('⚠️') ? 'error' : ''}`}>{status}</div>
          </form>
        </div>
      </div>
    )
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
