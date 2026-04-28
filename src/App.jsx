import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogIn, 
  LogOut, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ArrowRightLeft, 
  Database, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  X,
  ChevronRight,
  Info,
  Save,
  Image as ImageIcon,
  Coins,
  Loader2,
  ChevronDown,
  User,
  Users,
  Shield,
  Chrome,
  Upload
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  signInAnonymously,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from 'firebase/firestore';

// --- Firebase Configuration ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA0lXbSn63gZ2u8EvTwA9z0f0AQ-ArGrTY",
  authDomain: "costrader-d5ced.firebaseapp.com",
  projectId: "costrader-d5ced",
  storageBucket: "costrader-d5ced.firebasestorage.app",
  messagingSenderId: "367686176870",
  appId: "1:367686176870:web:ad1f90a7b83e4ab372dda7",
  measurementId: "G-XZN8N8R0CQ"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'cos-trade-companion';

const CATEGORIES = ['Species', 'Tokens', 'Plushies', 'Materials', 'Palettes'];
const DEMAND_TYPES = ['High', 'Stable', 'Unstable'];

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('trade'); 
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Species');
  
  // Trade State
  const [userOffer, setUserOffer] = useState({ items: [], mush: 0 });
  const [otherOffer, setOtherOffer] = useState({ items: [], mush: 0 });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    name: '',
    minVal: 0,
    maxVal: 0,
    demand: 'Stable',
    category: 'Species',
    image: ''
  });

  // Authentication Logic
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (error) {
        console.error("Auth init failed:", error);
      } finally {
        setAuthLoading(false);
      }
    };
    initAuth();

    useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (u) => {
    setUser(u);
    setLoading(false); // This line is what kills the green spinner
  });
  return () => unsubscribe();
}, []);

  const handleGoogleLogin = async () => {
  const provider = new GoogleAuthProvider();
  setLoading(true); // Start spinner
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google Auth Error:", error);
    setLoading(false); // Stop spinner if they close the popup
  }
};

const handleGuestLogin = async () => {
  setLoading(true);
  try {
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Guest Auth Error:", error);
    setLoading(false); // STOP the spinner if it fails!
  }
};

  const handleLogout = () => signOut(auth);

  // Sync Items from Firestore
  useEffect(() => {
    if (!user) return;
    const itemsCol = collection(db, 'artifacts', appId, 'public', 'data', 'game_items');
    const unsubscribe = onSnapshot(itemsCol, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(data);
      }, 
      (err) => {
        console.error("Firestore Error:", err);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const saveItem = async () => {
    if (!user || !newItem.name) return;
    const itemsCol = collection(db, 'artifacts', appId, 'public', 'data', 'game_items');
    try {
      if (editingItem) {
        const itemDoc = doc(db, 'artifacts', appId, 'public', 'data', 'game_items', editingItem.id);
        await updateDoc(itemDoc, newItem);
      } else {
        await addDoc(itemsCol, newItem);
      }
      closeModal();
      setActiveTab('database'); 
    } catch (error) {
      console.error("Save error:", error);
    }
  };

  const deleteItem = async (id) => {
    if (!user || !id) return;
    try {
      const itemDoc = doc(db, 'artifacts', appId, 'public', 'data', 'game_items', id);
      await deleteDoc(itemDoc);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setNewItem({ ...item });
    } else {
      setEditingItem(null);
      setNewItem({ name: '', minVal: 0, maxVal: 0, demand: 'Stable', category: activeCategory, image: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const filteredItemsList = useMemo(() => {
    return items.filter(i => 
      i.category === activeCategory && 
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, activeCategory, searchTerm]);

  const filteredItemsGrouped = useMemo(() => {
    const groups = {};
    filteredItemsList.forEach(item => {
      const char = item.name[0]?.toUpperCase() || '#';
      if (!groups[char]) groups[char] = [];
      groups[char].push(item);
    });
    return groups;
  }, [filteredItemsList]);

  const addToTrade = (item, side) => {
    const target = side === 'user' ? setUserOffer : setOtherOffer;
    target(prev => ({ 
      ...prev, 
      items: prev.items.length < 9 ? [...prev.items, item] : prev.items 
    }));
  };

  const removeFromTrade = (index, side) => {
    const target = side === 'user' ? setUserOffer : setOtherOffer;
    target(prev => {
      const newItems = [...prev.items];
      newItems.splice(index, 1);
      return { ...prev, items: newItems };
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateTradeResult = () => {
    const userVal = userOffer.items.reduce((sum, i) => sum + (Number(i.minVal) + Number(i.maxVal)) / 2, 0) + Number(userOffer.mush);
    const otherVal = otherOffer.items.reduce((sum, i) => sum + (Number(i.minVal) + Number(i.maxVal)) / 2, 0) + Number(otherOffer.mush);
    if (userVal === 0 && otherVal === 0) return { label: 'Empty Trade', color: 'text-gray-400', bg: 'bg-slate-800' };
    const ratio = otherVal / (userVal || 1);
    if (ratio > 1.2) return { label: 'BIG PROFIT', color: 'text-green-400', bg: 'bg-green-950/30', icon: <TrendingUp className="inline ml-2" /> };
    if (ratio > 1.05) return { label: 'PROFIT', color: 'text-emerald-400', bg: 'bg-emerald-950/30', icon: <TrendingUp className="inline ml-2" /> };
    if (ratio > 0.95) return { label: 'FAIR', color: 'text-blue-400', bg: 'bg-blue-950/30', icon: <Minus className="inline ml-2" /> };
    if (ratio > 0.8) return { label: 'LOSS', color: 'text-orange-400', bg: 'bg-orange-950/30', icon: <TrendingDown className="inline ml-2" /> };
    return { label: 'BIG LOSS', color: 'text-red-500', bg: 'bg-red-950/30', icon: <TrendingDown className="inline ml-2" /> };
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      </div>
    );
  }

  // --- LOGIN INTERFACE ---
  if (!user) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
        {/* Visual Glows */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px]"></div>
        </div>

        <div className="max-w-md w-full z-10 text-center">
          <div className="mb-10">
            <div className="w-20 h-20 bg-emerald-600/20 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
              <ArrowRightLeft className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2 italic uppercase">
              CoS<span className="text-emerald-500 text-shadow-glow">Trader</span>
            </h1>
            <p className="text-slate-500 font-bold text-[10px] tracking-[0.4em] uppercase">Value Management Terminal</p>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 shadow-2xl space-y-4">
            <button 
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-4 bg-white hover:bg-slate-100 text-black font-black py-4 px-6 rounded-2xl transition-all transform active:scale-[0.98] shadow-lg"
            >
              <Chrome className="w-5 h-5" />
              LOGIN WITH GOOGLE
            </button>

            <button 
              onClick={handleGuestLogin}
              className="w-full flex items-center justify-center gap-4 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 px-6 rounded-2xl transition-all border border-white/5 transform active:scale-[0.98]"
            >
              <User className="w-5 h-5 text-emerald-500" />
              CONTINUE AS GUEST
            </button>

            <div className="pt-4 flex items-center gap-4 text-slate-600 text-[9px] font-black uppercase tracking-widest justify-center">
              <div className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-500/50" /> Encrypted Session</div>
              <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
              <div>Cloud Database</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP UI ---
  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans">
      <header className="sticky top-0 z-40 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/5 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg"><ArrowRightLeft className="text-blue-400" /></div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">CoS<span className="text-emerald-500">Trader</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-lg p-1 border border-white/5">
              <button 
                onClick={() => setActiveTab('database')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'database' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
              >
                DATABASE
              </button>
              <button 
                onClick={() => setActiveTab('trade')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === 'trade' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}
              >
                TRADE UI
              </button>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400" title="Sign Out"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 pb-24">
        {activeTab === 'database' ? (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-5 py-2 rounded-lg whitespace-nowrap text-xs font-black tracking-wider transition-all ${activeCategory === cat ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-900 text-slate-500 border border-white/5'}`}
                >
                  {cat.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder={`Search ${activeCategory}...`}
                  className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-xl font-bold transition-transform active:scale-95">
                <Plus size={20} />
              </button>
            </div>

            <div className="space-y-8">
              {Object.keys(filteredItemsGrouped).length === 0 ? (
                <div className="text-center py-20 opacity-30">
                  <Database size={48} className="mx-auto mb-4" />
                  <p className="font-bold">No items found.</p>
                </div>
              ) : (
                Object.keys(filteredItemsGrouped).map(letter => (
                  <div key={letter}>
                    <h3 className="text-xl font-black text-blue-400 mb-4 ml-2 border-l-4 border-blue-600 pl-3">{letter}</h3>
                    <div className="grid gap-2">
                      {filteredItemsGrouped[letter].map(item => (
                        <div key={item.id} className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex items-center justify-between group hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-4">
                            <img src={item.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.name}`} className="w-12 h-12 rounded-lg bg-slate-800 object-cover border border-white/5" alt="" />
                            <div>
                              <h4 className="font-bold text-slate-200">{item.name}</h4>
                              <div className="flex items-center gap-3 text-[10px] font-bold">
                                <span className="text-emerald-500 uppercase tracking-tighter">{item.minVal.toLocaleString()} - {item.maxVal.toLocaleString()} MUSH</span>
                                <span className={`${item.demand === 'High' ? 'text-green-400' : item.demand === 'Unstable' ? 'text-red-400' : 'text-blue-400'} opacity-70`}>
                                  • {item.demand.toUpperCase()} DEMAND
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2">
                            <button onClick={() => addToTrade(item, 'user')} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                              <Plus size={16} />
                            </button>
                            <button onClick={() => addToTrade(item, 'other')} className="p-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all">
                              <ArrowRightLeft size={16} />
                            </button>
                            <button onClick={() => openModal(item)} className="p-2 text-slate-500 hover:text-white"><Edit2 size={16} /></button>
                            <button onClick={() => deleteItem(item.id)} className="p-2 text-red-500 bg-red-500/5 hover:bg-red-500 hover:text-white rounded-lg transition-all" title="Delete from Database">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Trade Result Overlay */}
            <div className={`${calculateTradeResult().bg} ${calculateTradeResult().color} p-4 rounded-xl border border-white/5 text-center flex flex-col items-center shadow-2xl transition-all duration-500`}>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Trade Result Analysis</span>
              <div className="text-3xl font-black italic tracking-tighter flex items-center">
                {calculateTradeResult().label}
                {calculateTradeResult().icon}
              </div>
            </div>

            {/* Trade Grids */}
            <div className="grid grid-cols-2 gap-6">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs font-black text-emerald-500 tracking-[0.2em] flex items-center gap-2">
                    <User size={12} /> YOU
                  </h3>
                  <span className="text-[10px] font-mono opacity-50">VAL: {(userOffer.items.reduce((s, i) => s + (i.minVal + i.maxVal) / 2, 0) + Number(userOffer.mush)).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-2xl border-2 border-white/10 aspect-square">
                  {[...Array(9)].map((_, i) => {
                    const item = userOffer.items[i];
                    return (
                      <div key={i} className={`relative aspect-square rounded-xl border-2 flex items-center justify-center transition-all ${item ? 'bg-slate-700 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800/80 border-white/10 border-dashed'}`}>
                        {item ? (
                          <>
                            <img src={item.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.name}`} className="w-full h-full object-cover rounded-lg" alt="" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-[8px] text-center font-bold line-clamp-1 rounded-b-lg">{item.name}</div>
                            <button onClick={() => removeFromTrade(i, 'user')} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 text-white shadow-xl hover:scale-110 transition-transform"><X size={12} /></button>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-900/80 border-2 border-emerald-500/20 p-3 rounded-xl flex items-center gap-3 shadow-lg">
                  <div className="bg-emerald-500/20 p-2 rounded-lg"><Coins className="text-emerald-500" size={18} /></div>
                  <input 
                    type="number" 
                    placeholder="0 MUSH"
                    className="w-full bg-transparent text-emerald-400 font-black text-lg outline-none placeholder:opacity-30"
                    value={userOffer.mush || ''}
                    onChange={(e) => setUserOffer(prev => ({ ...prev, mush: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center px-2">
                  <h3 className="text-xs font-black text-blue-500 tracking-[0.2em] flex items-center gap-2">
                    <Users size={12} /> THEM
                  </h3>
                  <span className="text-[10px] font-mono opacity-50">VAL: {(otherOffer.items.reduce((s, i) => s + (i.minVal + i.maxVal) / 2, 0) + Number(otherOffer.mush)).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-3 rounded-2xl border-2 border-white/10 aspect-square">
                  {[...Array(9)].map((_, i) => {
                    const item = otherOffer.items[i];
                    return (
                      <div key={i} className={`relative aspect-square rounded-xl border-2 flex items-center justify-center transition-all ${item ? 'bg-slate-700 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-800/80 border-white/10 border-dashed'}`}>
                        {item ? (
                          <>
                            <img src={item.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.name}`} className="w-full h-full object-cover rounded-lg" alt="" />
                            <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 text-[8px] text-center font-bold line-clamp-1 rounded-b-lg">{item.name}</div>
                            <button onClick={() => removeFromTrade(i, 'other')} className="absolute -top-1 -right-1 bg-red-600 rounded-full p-1 text-white shadow-xl hover:scale-110 transition-transform"><X size={12} /></button>
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="bg-slate-900/80 border-2 border-blue-500/20 p-3 rounded-xl flex items-center gap-3 shadow-lg">
                  <div className="bg-blue-500/20 p-2 rounded-lg"><Coins className="text-blue-400" size={18} /></div>
                  <input 
                    type="number" 
                    placeholder="0 MUSH"
                    className="w-full bg-transparent text-blue-400 font-black text-lg outline-none placeholder:opacity-30"
                    value={otherOffer.mush || ''}
                    onChange={(e) => setOtherOffer(prev => ({ ...prev, mush: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button onClick={() => {setUserOffer({ items: [], mush: 0 }); setOtherOffer({ items: [], mush: 0 });}} className="flex-1 py-3 bg-red-950/20 text-red-500 font-black rounded-xl border border-red-500/20 uppercase tracking-widest text-[10px] hover:bg-red-900/40 transition-all">Clear All</button>
            </div>

            {/* Integrated Item Search within Trade UI */}
            <div className="mt-8 bg-slate-900/40 border border-white/10 rounded-3xl p-5 space-y-4">
              <div className="flex justify-between items-center px-1">
                <h2 className="text-xs font-black text-slate-400 tracking-[0.2em] uppercase">Add Items to Trade</h2>
                <div className="flex gap-1">
                  {CATEGORIES.slice(0, 3).map(cat => (
                    <button 
                      key={cat} 
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}
                    >
                      {cat}
                    </button>
                  ))}
                  <select 
                    className="bg-slate-800 text-slate-400 text-[9px] font-black uppercase rounded-full px-2 outline-none border-none"
                    value={CATEGORIES.includes(activeCategory) ? activeCategory : 'Species'}
                    onChange={(e) => setActiveCategory(e.target.value)}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="text" 
                  placeholder={`Search ${activeCategory}...`}
                  className="w-full bg-slate-950 border border-white/5 rounded-2xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {filteredItemsList.length === 0 ? (
                  <div className="text-center py-8 opacity-20 text-xs font-bold uppercase tracking-widest">No Matches</div>
                ) : (
                  filteredItemsList.map(item => (
                    <div key={item.id} className="bg-slate-900/60 border border-white/5 rounded-xl p-2 flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                        <img src={item.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.name}`} className="w-10 h-10 rounded-lg object-cover bg-slate-800" alt="" />
                        <div>
                          <p className="text-xs font-bold text-slate-200">{item.name}</p>
                          <p className="text-[9px] text-emerald-500 font-black tracking-tight">{item.minVal.toLocaleString()}-{item.maxVal.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => addToTrade(item, 'user')}
                          className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          + ME
                        </button>
                        <button 
                          onClick={() => addToTrade(item, 'other')}
                          className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-[9px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
                        >
                          + THEM
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Database Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="bg-[#0f172a] w-full max-w-sm rounded-2xl overflow-hidden border border-white/10">
            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-xs font-black tracking-widest text-blue-400 uppercase">{editingItem ? 'Edit Entry' : 'New Entry'}</h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Item Name</label>
                <input type="text" className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 outline-none focus:border-blue-500" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Boreal Warden" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Min Val</label>
                  <input type="number" className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 outline-none" value={newItem.minVal} onChange={(e) => setNewItem({...newItem, minVal: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Max Val</label>
                  <input type="number" className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 outline-none" value={newItem.maxVal} onChange={(e) => setNewItem({...newItem, maxVal: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Demand</label>
                <div className="flex gap-1">
                  {DEMAND_TYPES.map(d => (
                    <button key={d} onClick={() => setNewItem({...newItem, demand: d})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newItem.demand === d ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-950 text-slate-600 border border-white/5'}`}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Image (Upload or Link)</label>
                <div className="space-y-3">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-4 bg-slate-950 hover:bg-slate-900 transition-colors relative group cursor-pointer">
                    {newItem.image ? (
                      <div className="relative w-full aspect-video">
                        <img src={newItem.image} className="w-full h-full object-contain rounded-lg" alt="Preview" />
                        <button 
                          onClick={() => setNewItem({...newItem, image: ''})}
                          className="absolute -top-2 -right-2 bg-red-600 p-1 rounded-full shadow-xl"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="text-slate-500 mb-2 group-hover:text-blue-500 transition-colors" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Click to upload from gallery</p>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={handleImageUpload} 
                    />
                  </div>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
                    <input 
                      type="text" 
                      className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-[10px] outline-none" 
                      value={newItem.image} 
                      onChange={(e) => setNewItem({...newItem, image: e.target.value})} 
                      placeholder="Or paste external image URL..." 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-900/50 flex gap-2">
              <button onClick={closeModal} className="flex-1 py-3 text-[10px] font-black text-slate-500 uppercase hover:text-white">Discard</button>
              <button onClick={saveItem} className="flex-[2] py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg">Save Entry</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .text-shadow-glow {
          text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
        }
      `}</style>
    </div>
  );
};

import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
