
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { Page, Product, CartItem, CheckoutStep, Atmosphere, Order } from './types';
import { PRODUCTS, ATMOSPHERES } from './constants';
import Navbar from './components/Navbar';
import ProductModal from './components/ProductModal';
import AdminPage from './components/AdminPage';
import { GoogleGenAI, Modality } from "@google/genai";
import { supabase } from './services/supabase';
import {
  ShoppingBag, ChevronRight, Wind, MapPin, Clock, Phone, Mail, ShoppingCart,
  Check, Trash2, CreditCard, Smartphone, ArrowLeft, Wallet, Plus, Minus,
  QrCode, Volume2, VolumeX, Search, Sparkles, Shield, Droplets, Heart,
  Brain, Zap, Filter, XCircle, X, AlertTriangle, Play, Truck, Package,
  ArrowUpDown, Facebook, Instagram, Music2, BookOpen, Quote, Award, History,
  Beaker, MessageSquare, MessageCircle, ExternalLink
} from 'lucide-react';

// Casting motion to any to bypass environment-specific TypeScript prop errors
const M = motion as any;

const VIRTUE_CATEGORIES = [
  { id: 'Ouverture & Succes', label: 'Ouverture & Succes', icon: Zap, color: 'text-amber-400', desc: 'Attire la clientele et la reussite.' },
  { id: 'Protection Totale', label: 'Protection Totale', icon: Shield, color: 'text-blue-400', desc: 'Barriere contre le mauvais oeil.' },
  { id: 'Bain de Purification', label: 'Purification', icon: Droplets, color: 'text-cyan-400', desc: "Nettoie l'aura et la chance." },
  { id: 'Bien-etre', label: 'Bien-etre', icon: Sparkles, color: 'text-lime-400', desc: 'Vitalite et apaisement.' },
  { id: 'Harmonie & Couple', label: 'Harmonie & Couple', icon: Heart, color: 'text-rose-400', desc: 'Renforce les liens du foyer.' },
  { id: 'Memoire & Examens', label: 'Memoire & Examens', icon: Brain, color: 'text-purple-400', desc: 'Concentration intellectuelle.' },
];

const SHIPPING_COST = 5.90;

// Audio Decoding Helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*');
        if (error) throw error;
        
        let dbProducts: Product[] = [];
        if (data && data.length > 0) {
          dbProducts = data.map(p => ({
            ...p,
            scientificName: p.scientific_name || p.scientificName || ''
          }));
        }

        // Merge with static PRODUCTS so we keep the initial catalog + new items
        const currentProductsMap = new Map();
        PRODUCTS.forEach(p => currentProductsMap.set(p.id, p));
        dbProducts.forEach(p => currentProductsMap.set(p.id, p));
        
        setProducts(Array.from(currentProductsMap.values()));
      } catch (err) {
        console.error("Erreur Supabase, chargement fallback", err);
        setProducts(PRODUCTS);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      if (window.location.pathname.toLowerCase().includes('/admin')) {
        setCurrentPage('admin');
      }
    };

    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);

    };
  }, []);

  const [currentPage, setCurrentPage] = useState<Page>(() => {
    if (window.location.pathname.toLowerCase().includes('/admin')) {
      return 'admin';
    }
    return 'home';
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVirtues, setSelectedVirtues] = useState<string[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('name-asc');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('diarra_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Si on a besoin de charger les commandes (pour AdminPage ça se fera là-bas)
    // Ici on vide le localstorage et on utilisera la db si besoin
  }, []);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'shipping'>('pickup');
  const [shippingAddress, setShippingAddress] = useState({ street: '', city: '', zip: '' });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wave' | 'orange' | null>(null);
  const WHATSAPP_NUMBER = "33749718309";
  const CONTACT_EMAIL = "Senpixelstudio@gmail.com";
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const checkoutPromptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(false);
  const [atmIndex, setAtmIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [showExitCheckoutConfirm, setShowExitCheckoutConfirm] = useState(false);
  const [isCartBouncing, setIsCartBouncing] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Trigger TTS Greeting once per session to save quota and handle 429 errors
  useEffect(() => {
    const hasBeenGreeted = sessionStorage.getItem('diarra_greeted');
    if (hasBeenGreeted) return;

    const timer = setTimeout(async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: "Bienvenue chez Diarra Plante de Vie. Commencez par chercher ce que vous voulez. En cas de besoin, je suis la juste en bas a droite." }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: 'Kore' },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
          const context = new AudioContextClass({ sampleRate: 24000 });
          const audioBuffer = await decodeAudioData(
            decodeBase64(base64Audio),
            context,
            24000,
            1
          );
          const source = context.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(context.destination);
          source.start();
          sessionStorage.setItem('diarra_greeted', 'true');
        }
      } catch (err: any) {
        // Handle Quota exceeded or other API errors silently for the user
        if (err?.message?.includes('quota') || err?.status === 429) {
          console.warn("L'accueil vocal est indisponible pour le moment (quota atteint).");
        } else {
          console.error("Erreur TTS:", err);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('diarra_cart', JSON.stringify(cart));
  }, [cart]);

  // Ancien code retiré


  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Trigger header cart bounce when item count changes
  useEffect(() => {
    if (totalItems > 0) {
      setIsCartBouncing(true);
      const timer = setTimeout(() => setIsCartBouncing(false), 400);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAtmIndex((prev) => (prev + 1) % ATMOSPHERES.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (audioRef.current && !isMuted) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        console.debug("Autoplay blocked or audio error", e);
      });
    }
  }, [atmIndex, isMuted]);

  const currentAtm = ATMOSPHERES[atmIndex];
  const { scrollY } = useScroll();

  const heroY = useSpring(useTransform(scrollY, [0, 500], [0, -100]), { stiffness: 100, damping: 30 });
  const descY = useSpring(useTransform(scrollY, [0, 500], [0, -60]), { stiffness: 100, damping: 30 });
  const buttonsY = useSpring(useTransform(scrollY, [0, 500], [0, -40]), { stiffness: 100, damping: 30 });
  const cardsY = useSpring(useTransform(scrollY, [200, 1000], [100, -100]), { stiffness: 100, damping: 30 });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (currentPage !== 'catalog') {
      setSearchTerm('');
      setSelectedVirtues([]);
      setSelectedSymptoms([]);
    }
  }, [currentPage]);

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) {
      alert("Ce produit est en rupture de stock.");
      return;
    }

    let limitReached = false;
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing) {
        if (existing.quantity >= product.stock) {
          limitReached = true;
          return prev;
        }
        return prev.map(item => item.id === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id: productId, quantity: 1 }];
    });

    if (limitReached) {
      alert("Stock maximum atteint pour ce produit.");
      return;
    }

    setLastAddedId(productId);
    setShowCheckoutPrompt(true);
    if (checkoutPromptTimer.current) clearTimeout(checkoutPromptTimer.current);
    checkoutPromptTimer.current = setTimeout(() => {
      setLastAddedId(null);
      setShowCheckoutPrompt(false);
    }, 5000);
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          if (newQty > product.stock) {
            alert("Stock maximum atteint.");
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const removeFromCart = (productId: string) => {
    const updated = cart.filter(item => item.id !== productId);
    setCart(updated);
    if (updated.length === 0) {
      setCheckoutStep('cart');
      setIsCartOpen(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setIsClearingCart(false);
    setIsCartOpen(false);
    setCheckoutStep('cart');
  };

  const cancelCheckout = () => {
    setCheckoutStep('cart');
    setShowExitCheckoutConfirm(false);
    setSelectedPaymentMethod(null);
  };

  const handleConfirmOrder = async () => {
    // N'est plus utilisé en principe (remplacé par handleWhatsAppCheckout)
    setCart([]);
    setCheckoutStep('success');
  };

  const itemsTotal = cart.reduce((acc, item) => {
    const product = products.find(p => p.id === item.id);
    if (!product) return acc;
    const priceValue = parseFloat(product.price.replace(',', '.').replace('€', ''));
    return acc + (priceValue * item.quantity);
  }, 0);

  const finalTotal = itemsTotal + (deliveryMethod === 'shipping' ? SHIPPING_COST : 0);

  const allSymptoms = useMemo(() => {
    const symptoms = new Set<string>();
    products.forEach(p => p.symptoms?.forEach(s => symptoms.add(s)));
    return Array.from(symptoms).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products.filter(p => {
      const matchesSearch =
        (p.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.scientificName?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesVirtues = selectedVirtues.length === 0 ||
        selectedVirtues.some(v => p.virtues?.includes(v));

      const matchesSymptoms = selectedSymptoms.length === 0 ||
        selectedSymptoms.some(s => p.symptoms?.includes(s));

      return matchesSearch && matchesVirtues && matchesSymptoms;
    });

    return [...result].sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);

      const priceA = parseFloat(a.price.replace(',', '.').replace('€', ''));
      const priceB = parseFloat(b.price.replace(',', '.').replace('€', ''));

      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;

      return 0;
    });
  }, [products, searchTerm, selectedVirtues, selectedSymptoms, sortBy]);

  const handlePaymentSelect = (method: 'wave' | 'orange') => {
    setSelectedPaymentMethod(method);
    setCheckoutStep('payment-qr');
  };

  const handleWhatsAppCheckout = async () => {
    // Save to Supabase
    const newOrder = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      total: finalTotal,
      status: 'pending',
      delivery_method: deliveryMethod,
      shipping_address: deliveryMethod === 'shipping' ? shippingAddress : null,
      payment_method: selectedPaymentMethod || 'whatsapp',
      date: new Date().toISOString()
    };

    try {
      const { error: orderError } = await supabase.from('orders').insert([newOrder]);
      if (orderError) throw orderError;

      const orderItems = cart.map(item => ({
        order_id: newOrder.id,
        product_id: item.id,
        quantity: item.quantity
      }));
      
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de la commande", err);
    }

    const itemsList = cart.map(item => {
      const product = products.find(p => p.id === item.id);
      return product ? `• ${product.name} x${item.quantity} (${product.price})` : '';
    }).filter(Boolean).join('%0A');
    const delivery = deliveryMethod === 'shipping' ? 'Livraison à domicile' : 'Retrait en boutique';
    const address = deliveryMethod === 'shipping' && shippingAddress.street
      ? `%0AAdresse : ${shippingAddress.street}, ${shippingAddress.zip} ${shippingAddress.city}`
      : '';
    const message = `Bonjour, je souhaite confirmer ma commande :%0A%0A${itemsList}%0A%0AMode : ${delivery}${address}%0ATotal : ${finalTotal.toFixed(2)}€`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    setCart([]);
    setCheckoutStep('success');
    setIsCartOpen(false);
  };

  const toggleVirtue = (id: string) => {
    setSelectedVirtues(prev =>
      prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
    );
  };

  const toggleSymptom = (symptom: string) => {
    if (!symptom) return;
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const renderHome = () => (
    <M.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-[120vh] flex flex-col items-center justify-start px-6 pt-32 pb-32 text-center relative z-10">
      <M.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6 flex items-center gap-2 px-4 py-2 liquid-glass rounded-full text-lime-400 text-sm font-bold tracking-[0.3em] uppercase">
        <Wind size={16} />
        {currentAtm.name}
      </M.div>
      <M.h1 style={{ y: heroY }} className="text-6xl md:text-8xl lg:text-9xl font-bold mb-8 tracking-tight">
        Diarra <span className="text-lime-500 font-serif italic text-glow">Plante de Vie</span>
      </M.h1>
      <M.p style={{ y: descY }} className="text-xl md:text-2xl text-zinc-100 max-w-2xl mb-12 leading-relaxed drop-shadow-lg">
        L'excellence herboristique au coeur de Paris. Redecouvrez la puissance ancestrale des racines et des plantes pour une vitalite retrouvee.
      </M.p>
      <M.div style={{ y: buttonsY }} className="flex flex-col sm:flex-row gap-6 mb-24">
        <button onClick={() => setCurrentPage('catalog')} className="group px-10 py-5 bg-lime-500 text-black font-bold rounded-2xl flex items-center gap-3 hover:bg-lime-400 transition-all shadow-[0_0_30px_rgba(132,204,22,0.4)] active:scale-95">
          Decouvrir nos racines
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <button onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=Bonjour, je souhaiterais un conseil`, '_blank')} className="px-10 py-5 liquid-glass font-bold rounded-2xl flex items-center gap-3 hover:bg-white/10 transition-all border border-white/20 active:scale-95">
          Demander Conseil
        </button>
      </M.div>

      <M.div style={{ y: cardsY }} className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 text-left mt-12 mb-32">
        <div className="p-8 liquid-glass rounded-3xl border-t border-lime-500/20">
          <h4 className="font-bold text-lime-400 mb-2 uppercase tracking-widest text-xs">Purete</h4>
          <p className="text-zinc-200 text-sm">Plantes sauvages recoltees a la main dans le respect des cycles lunaires.</p>
        </div>
        <div className="p-8 liquid-glass rounded-3xl border-t border-emerald-500/20">
          <h4 className="font-bold text-emerald-400 mb-2 uppercase tracking-widest text-xs">Sagesse</h4>
          <p className="text-zinc-200 text-sm">Un savoir transmis de generation en generation depuis plus de 40 ans.</p>
        </div>
        <div className="p-8 liquid-glass rounded-3xl border-t border-cyan-500/20">
          <h4 className="font-bold text-cyan-400 mb-2 uppercase tracking-widest text-xs">Paris</h4>
          <p className="text-zinc-200 text-sm">Une boutique historique situee au 42 Rue Marcadet, coeur du 18eme.</p>
        </div>
      </M.div>

      {/* Video Showcase Section - INTEGRATED TIKTOK VIDEO */}
      <M.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-6xl mb-32"
      >
        <div className="mb-12 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-4">L'Ame de notre Boutique</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto italic">
            Entrez dans un sanctuaire de sante ou chaque racine raconte une histoire de guerison. Une immersion visuelle au coeur de notre savoir-faire.
          </p>
        </div>
        <div className="relative aspect-[9/16] md:aspect-video max-h-[800px] mx-auto rounded-[3rem] overflow-hidden liquid-glass border-4 border-white/5 shadow-2xl group bg-black">
          <iframe
            src="https://www.tiktok.com/embed/v2/7587132007625297174"
            className="w-full h-full border-0 absolute inset-0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
          <div className="absolute bottom-12 left-12 text-left pointer-events-none">
            <div className="flex items-center gap-3 text-lime-400 mb-2">
              <Sparkles size={24} />
              <span className="uppercase tracking-[0.4em] font-bold text-xs">Tradition Herboristique</span>
            </div>
            <h3 className="text-3xl font-bold">L'Excellence des Racines</h3>
          </div>
        </div>
      </M.section>
    </M.div>
  );

  const renderCatalog = () => (
    <M.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="min-h-screen pt-28 pb-40 px-6 max-w-7xl mx-auto relative z-10">
      <div className="mb-12">
        <h2 className="text-5xl md:text-7xl font-bold mb-4">L'Herboristerie</h2>
        <p className="text-zinc-200 text-lg max-w-2xl drop-shadow-md">
          Explorez nos gammes traditionnelles. Selectionnez plusieurs vertus ou symptomes pour affiner votre recherche.
        </p>
      </div>

      {/* Multi-select Virtues Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
        {VIRTUE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedVirtues.includes(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => toggleVirtue(cat.id)}
              className={`p-6 liquid-glass rounded-3xl flex flex-col items-center text-center gap-3 transition-all group border-2 ${isActive ? 'border-lime-500 bg-lime-500/10 scale-105 shadow-[0_0_20px_rgba(132,204,22,0.2)]' : 'border-white/5 hover:border-white/20'
                }`}
            >
              <div className={`p-3 rounded-2xl ${isActive ? 'bg-lime-500 text-black' : 'bg-white/5 ' + cat.color} group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest leading-tight">{cat.label}</span>
              <p className="text-[8px] text-zinc-500 hidden md:block">{cat.desc}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mb-8 items-stretch">
        <div className="relative flex-1">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 text-lime-400">
            <Search size={24} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher une plante (ex: Moringa)..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-16 pr-6 focus:outline-none focus:border-lime-500/50 transition-all text-lg liquid-glass placeholder:text-zinc-500 h-full"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors">
              <XCircle size={20} />
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {/* Multi-select Symptom Trigger */}
          <div className="relative min-w-[200px]">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none">
              <Filter size={20} />
            </div>
            <select
              onChange={(e) => { toggleSymptom(e.target.value); (e.target as any).value = ''; }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-14 pr-6 focus:outline-none focus:border-emerald-500/50 transition-all text-sm liquid-glass appearance-none cursor-pointer h-full"
            >
              <option value="" className="bg-zinc-900">Ajouter un symptome...</option>
              {allSymptoms.filter(s => !selectedSymptoms.includes(s)).map(s => (
                <option key={s} value={s} className="bg-zinc-900">{s}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative min-w-[200px]">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-400 pointer-events-none">
              <ArrowUpDown size={20} />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-14 pr-6 focus:outline-none focus:border-amber-500/50 transition-all text-sm liquid-glass appearance-none cursor-pointer h-full font-bold uppercase tracking-widest"
            >
              <option value="name-asc" className="bg-zinc-900">Alphabetique (A-Z)</option>
              <option value="price-asc" className="bg-zinc-900">Prix : Croissant</option>
              <option value="price-desc" className="bg-zinc-900">Prix : Decroissant</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {(selectedVirtues.length > 0 || selectedSymptoms.length > 0 || searchTerm) && (
        <M.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 mb-12">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mr-2">Filtres actifs :</span>

          {selectedVirtues.map(v => (
            <button key={v} onClick={() => toggleVirtue(v)} className="px-4 py-2 bg-lime-500/10 border border-lime-500/30 rounded-full text-[10px] font-bold text-lime-400 flex items-center gap-2 hover:bg-lime-500/20 transition-all">
              {v} <X size={12} />
            </button>
          ))}

          {selectedSymptoms.map(s => (
            <button key={s} onClick={() => toggleSymptom(s)} className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[10px] font-bold text-emerald-400 flex items-center gap-2 hover:bg-emerald-500/20 transition-all">
              {s} <X size={12} />
            </button>
          ))}

          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-white flex items-center gap-2 hover:bg-white/10 transition-all">
              {searchTerm} <X size={12} />
            </button>
          )}

          <button
            onClick={() => { setSelectedVirtues([]); setSelectedSymptoms([]); setSearchTerm(''); }}
            className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors ml-auto"
          >
            Reinitialiser tout
          </button>
        </M.div>
      )}

      {/* Product Results Info */}
      <div className="mb-6 flex justify-between items-center">
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{filteredProducts.length} plantes trouvees</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <M.div
              key={product.id}
              layout
              whileHover={{ scale: 1.02, y: -5 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="group liquid-glass rounded-[2rem] overflow-hidden flex flex-col hover:border-lime-500/40 hover:shadow-[0_0_25px_rgba(132,204,22,0.2)] transition-all"
            >
              <div className="h-80 overflow-hidden relative cursor-pointer" onClick={() => setSelectedProduct(product)}>
                <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-6 left-6 px-4 py-1.5 liquid-glass rounded-full text-[10px] font-bold uppercase tracking-widest text-lime-400">
                  {product.category}
                </div>
                {product.virtues?.[0] && (
                  <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[8px] font-bold text-white uppercase flex items-center gap-1 border border-white/10">
                    <Sparkles size={10} className="text-lime-400" />
                    {product.virtues[0]}
                  </div>
                )}
              </div>
              <div className="p-8 flex-1 flex flex-col">
                <h3 className="text-2xl font-bold mb-2 group-hover:text-lime-400 transition-colors cursor-pointer" onClick={() => setSelectedProduct(product)}>{product.name}</h3>
                <p className="text-zinc-200 text-sm line-clamp-2 mb-4 italic leading-relaxed">{product.description}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.symptoms?.slice(0, 2).map(s => (
                    <span key={s} className="px-2 py-1 bg-white/5 rounded text-[8px] text-zinc-400 uppercase font-bold">{s}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-2xl font-bold">{product.price}</span>
                  <M.button
                    animate={lastAddedId === product.id ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); addToCart(product.id); }}
                    className={`p-3 rounded-xl transition-all flex items-center gap-2 group/btn ${lastAddedId === product.id ? 'bg-emerald-500 text-white' : 'bg-white/5 hover:bg-lime-500 hover:text-black hover:shadow-lg'}`}
                  >
                    <AnimatePresence mode="wait">
                      {lastAddedId === product.id ? (
                        <M.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check size={20} />
                        </M.div>
                      ) : (
                        <M.div key="bag" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <ShoppingBag size={20} />
                        </M.div>
                      )}
                    </AnimatePresence>
                  </M.button>
                </div>
              </div>
            </M.div>
          ))}
        </AnimatePresence>
        {filteredProducts.length === 0 && (
          <M.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 text-center">
            <div className="inline-block p-6 bg-white/5 rounded-full mb-6">
              <Search size={48} className="text-zinc-600" />
            </div>
            <p className="text-zinc-400 text-xl font-medium">Aucune plante ne correspond a cette selection.</p>
            <button onClick={() => { setSelectedVirtues([]); setSelectedSymptoms([]); setSearchTerm(''); }} className="mt-6 text-lime-400 font-bold hover:underline">Voir tout le catalogue</button>
          </M.div>
        )}
      </div>
    </M.div>
  );

  const renderAbout = () => (
    <M.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="pt-32 pb-40 px-6 max-w-5xl mx-auto relative z-10">
      <M.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-20">
        <h2 className="text-6xl md:text-7xl font-bold mb-6">L'Heritage Diarra</h2>
        <div className="w-24 h-1 bg-lime-500 mx-auto rounded-full mb-8" />
        <p className="text-xl md:text-2xl text-zinc-300 italic font-serif leading-relaxed max-w-4xl mx-auto">
          "Au Coeur de la Guerison Ancestrale"
        </p>
      </M.div>

      <div className="space-y-32">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <M.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="liquid-glass p-8 rounded-[2rem] border-white/10 relative">
              <Quote className="absolute -top-6 -left-6 text-lime-500 opacity-20" size={80} />
              <p className="text-lg text-zinc-200 leading-relaxed relative z-10">
                Bienvenue dans un sanctuaire dedie a la pharmacopee africaine, une boutique ou chaque racine et chaque ecorce raconte une story de guerison transmise depuis des generations. Ici, nous ne vendons pas simplement des plantes ; nous perpetuons un savoir sacre, capable de soulager les maux du corps et de l'esprit grace aux vertus oubliees de la nature.
              </p>
            </div>
          </M.div>
          <M.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="aspect-square rounded-[3rem] overflow-hidden liquid-glass border-4 border-white/5">
            <img src="https://i.imgur.com/hBCfOWn.jpeg" className="w-full h-full object-cover" alt="Héritage Diarra" />
          </M.div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <M.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="order-2 md:order-1 aspect-square rounded-[3rem] overflow-hidden liquid-glass border-4 border-white/5">
            <img src="https://i.imgur.com/yFKolAL.jpeg" className="w-full h-full object-cover" alt="Issa Diarra" />
          </M.div>
          <M.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 md:order-2">
            <div className="flex items-center gap-4 text-lime-400 mb-6">
              <Award size={32} />
              <h3 className="text-3xl font-bold font-serif">Le Gardien du Temple : Issa Diarra</h3>
            </div>
            <p className="text-lg text-zinc-300 leading-relaxed mb-6">
              L'ame de cette boutique reside en son proprietaire, <strong>Issa Diarra</strong>. Ne en 1992 et originaire de Kothiary, Issa n'est pas devenu guerisseur par hasard ; il l'est par essence.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed italic">
              Fils du grand Ibrahima Diarra, figure respectee de Kothiary, Issa a grandi berce par les effluves des plantes medicinales et les enseignements rigoureux de la tradition.
            </p>
          </M.div>
        </section>

        <M.section initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="liquid-glass p-12 rounded-[4rem] border-white/10 text-center">
          <h3 className="text-4xl font-bold mb-8 font-serif">Une Lignee de Guerisseurs</h3>
          <p className="text-xl text-zinc-200 leading-relaxed max-w-4xl mx-auto mb-8">
            Le savoir d'Issa est le fruit d'une transmission ininterrompue : forme des son plus jeune age par son pere Ibrahima, qui fut lui-meme initie par son propre pere. Cette chaine de savoir, reliant le pere au fils, garantit l'authenticite et la puissance des remedes proposes.
          </p>
          <div className="flex justify-center gap-4 text-lime-400">
            <div className="p-4 rounded-full bg-lime-500/10"><Sparkles size={24} /></div>
            <div className="p-4 rounded-full bg-lime-500/10"><Sparkles size={24} /></div>
            <div className="p-4 rounded-full bg-lime-500/10"><Sparkles size={24} /></div>
          </div>
        </M.section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-3xl font-bold font-serif">Le Voyage et le Retour aux Racines</h3>
            <p className="text-lg text-zinc-300 leading-relaxed">
              L'histoire d'Issa est aussi celle d'une ouverture au monde. Il y a 11 ans, son chemin l'a mene en Europe, une experience qui a enrichi sa vision du monde sans jamais effacer ses origines.
            </p>
            <p className="text-lg text-zinc-300 leading-relaxed">
              Aujourd'hui, il a fait le choix noble de garder la boutique de son pere, honorant la promesse de preserver cet heritage inestimable. Ce parcours unique, entre tradition profonde et experience internationale, fait d'Issa un interlocuteur attentif.
            </p>
          </div>
          <M.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="liquid-glass p-10 rounded-[3rem] border-lime-500/20 bg-lime-500/5">
            <p className="text-zinc-200 italic leading-relaxed text-lg">
              "Capable de comprendre les besoins modernes tout en y repondant par la sagesse ancienne."
            </p>
          </M.div>
        </section>

        <M.section initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold font-serif mb-4">Nos Services</h3>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">L'expertise a votre service</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 liquid-glass rounded-3xl border-t border-lime-500/20 text-center">
              <Package size={40} className="text-lime-500 mx-auto mb-6" />
              <h4 className="font-bold mb-4 uppercase tracking-widest text-sm">Racines Rares</h4>
              <p className="text-zinc-400 text-sm">Recoltees et preparees selon les rites traditionnels pour garantir leur efficacite.</p>
            </div>
            <div className="p-8 liquid-glass rounded-3xl border-t border-emerald-500/20 text-center">
              <Beaker size={40} className="text-emerald-500 mx-auto mb-6" />
              <h4 className="font-bold mb-4 uppercase tracking-widest text-sm">Remedes Cibles</h4>
              <p className="text-zinc-400 text-sm">Des preparations specifiques basees sur les recettes secretes de la famille.</p>
            </div>
            <div className="p-8 liquid-glass rounded-3xl border-t border-cyan-500/20 text-center">
              <MessageSquare size={40} className="text-cyan-500 mx-auto mb-6" />
              <h4 className="font-bold mb-4 uppercase tracking-widest text-sm">Consultation</h4>
              <p className="text-zinc-400 text-sm">L'ecoute et l'expertise d'Issa pour vous guider vers le traitement naturel adapte.</p>
            </div>
          </div>
        </M.section>

        <M.section initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center py-20">
          <p className="text-3xl md:text-4xl font-bold font-serif italic text-white max-w-3xl mx-auto leading-tight">
            "Pousser la porte de chez Issa Diarra, c'est faire confiance a trois generations de savoir-faire pour retrouver la sante par la voie naturelle."
          </p>
        </M.section>
      </div>
    </M.div>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0c120c]">
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <M.div key={currentAtm.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 2.5 }} className="absolute inset-0 w-full h-full overflow-hidden">
            <video autoPlay muted loop playsInline className="w-full h-full object-cover scale-105" src={currentAtm.video} onCanPlay={(e: any) => e.target.play()} />
            <div className="absolute inset-0 bg-black/30" />
            <M.div className="absolute inset-0 transition-colors duration-[3000ms]" style={{ backgroundColor: currentAtm.color }} />
          </M.div>
        </AnimatePresence>
        <div className="absolute inset-0 backdrop-blur-[4px] bg-gradient-to-b from-transparent via-black/10 to-black/60 z-[1]" />
      </div>

      <audio ref={audioRef} src={currentAtm.audio} loop muted={isMuted} />

      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-4">
        <button onClick={() => { setIsMuted(!isMuted); if (isMuted) audioRef.current?.play().catch(() => { }); }} className="p-4 liquid-glass rounded-full text-white hover:text-lime-400 transition-all hover:scale-110 shadow-2xl active:scale-90">
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isCartOpen && (
          <M.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex justify-end">
            <M.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="w-full max-w-md liquid-glass border-l border-white/10 h-full flex flex-col shadow-2xl overflow-hidden">
              <div className="p-8 flex items-center justify-between border-b border-white/5">
                <div>
                  <h2 className="text-3xl font-bold">Votre Panier</h2>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mt-1">{totalItems} articles selectionnes</p>
                </div>
                <button onClick={() => { setIsCartOpen(false); setIsClearingCart(false); setShowExitCheckoutConfirm(false); setCheckoutStep('cart'); setShippingAddress({ street: '', city: '', zip: '' }); }} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cart.length > 0 ? (
                  checkoutStep === 'cart' ? (
                    cart.map((item) => {
                      const product = products.find(p => p.id === item.id);
                      if (!product) return null;
                      return (
                        <M.div layout key={item.id} className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
                          <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded-xl" />
                          <div className="flex-1">
                            <h4 className="font-bold text-sm">{product.name}</h4>
                            <p className="text-xs text-zinc-400 mb-2">{product.price}</p>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2 bg-black/20 rounded-lg px-2">
                                <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-lime-400"><Minus size={14} /></button>
                                <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-lime-400"><Plus size={14} /></button>
                              </div>
                              <button onClick={() => removeFromCart(item.id)} className="text-zinc-500 hover:text-rose-400 transition-colors"><Trash2 size={16} /></button>
                            </div>
                          </div>
                        </M.div>
                      );
                    })
                  ) : checkoutStep === 'delivery' ? (
                    <M.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                      <p className="text-xs uppercase tracking-[0.3em] font-bold text-zinc-400 text-center">Choisissez votre mode de livraison</p>

                      <button
                        onClick={() => setDeliveryMethod('pickup')}
                        className={`w-full p-6 rounded-2xl border transition-all text-left ${deliveryMethod === 'pickup' ? 'liquid-glass border-lime-500/50 bg-lime-500/5' : 'border-white/5 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`p-3 rounded-xl ${deliveryMethod === 'pickup' ? 'bg-lime-500 text-black' : 'bg-white/5 text-zinc-400'}`}>
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-bold">Retrait en boutique</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Gratuit • Pret en 2h</p>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed italic">Venez recuperer votre commande au 42 Rue Marcadet, Paris 18e.</p>
                      </button>

                      <button
                        onClick={() => setDeliveryMethod('shipping')}
                        className={`w-full p-6 rounded-2xl border transition-all text-left ${deliveryMethod === 'shipping' ? 'liquid-glass border-lime-500/50 bg-lime-500/5' : 'border-white/5 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`p-3 rounded-xl ${deliveryMethod === 'shipping' ? 'bg-lime-500 text-black' : 'bg-white/5 text-zinc-400'}`}>
                            <Truck size={20} />
                          </div>
                          <div>
                            <p className="font-bold">Livraison a domicile</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">5.90€ • 48h a 72h</p>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed italic">Expedition rapide et securisee dans toute la France.</p>
                      </button>

                      <AnimatePresence>
                        {deliveryMethod === 'shipping' && (
                          <M.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                            <input
                              type="text"
                              placeholder="Adresse complete"
                              value={shippingAddress.street}
                              onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-sm focus:outline-none focus:border-lime-500/50"
                            />
                            <div className="flex gap-3">
                              <input
                                type="text"
                                placeholder="Code postal"
                                value={shippingAddress.zip}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                                className="w-1/3 bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-sm focus:outline-none focus:border-lime-500/50"
                              />
                              <input
                                type="text"
                                placeholder="Ville"
                                value={shippingAddress.city}
                                onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl py-4 px-5 text-sm focus:outline-none focus:border-lime-500/50"
                              />
                            </div>
                          </M.div>
                        )}
                      </AnimatePresence>
                    </M.div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4">
                      <Check size={48} className="text-lime-500 mb-4" />
                      <p className="font-bold mb-2">Presque fini !</p>
                      <p className="text-xs text-zinc-400">Veuillez finaliser le paiement ci-dessous.</p>
                    </div>
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-50">
                    <ShoppingBag size={64} className="mb-4 text-zinc-700" />
                    <p className="text-lg">Votre panier est vide</p>
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-8 bg-black/40 border-t border-white/5 space-y-4">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Sous-total</span>
                      <span className="font-bold text-zinc-200">{itemsTotal.toFixed(2)}€</span>
                    </div>
                    {deliveryMethod === 'shipping' && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Livraison</span>
                        <span className="font-bold text-zinc-200">{SHIPPING_COST.toFixed(2)}€</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-zinc-400 uppercase tracking-widest text-[10px] font-bold">Total a regler</span>
                      <span className="text-3xl font-bold text-lime-400">{finalTotal.toFixed(2)}€</span>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {checkoutStep === 'cart' && (
                      <M.div key="step-cart" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                        <button
                          onClick={() => setCheckoutStep('delivery')}
                          className="w-full py-4 bg-lime-500 text-black font-bold rounded-2xl hover:bg-lime-400 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(132,204,22,0.3)] active:scale-95"
                        >
                          Suivant : Livraison <ChevronRight size={20} />
                        </button>

                        <div className="relative pt-2">
                          <AnimatePresence mode="wait">
                            {!isClearingCart ? (
                              <M.button
                                key="clear-init"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsClearingCart(true)}
                                className="w-full py-3 bg-white/5 text-zinc-400 text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all border border-transparent hover:border-rose-500/30 flex items-center justify-center gap-2"
                              >
                                <Trash2 size={14} /> Vider le panier
                              </M.button>
                            ) : (
                              <M.div
                                key="clear-confirm"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full p-4 liquid-glass rounded-xl border border-rose-500/30 flex flex-col gap-3"
                              >
                                <p className="text-[10px] font-bold uppercase tracking-widest text-center text-rose-400">Confirmer la suppression ?</p>
                                <div className="flex gap-2">
                                  <button onClick={clearCart} className="flex-1 py-2 bg-rose-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-colors">Oui, vider</button>
                                  <button onClick={() => setIsClearingCart(false)} className="flex-1 py-2 bg-white/10 text-white font-bold rounded-lg text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors">Annuler</button>
                                </div>
                              </M.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </M.div>
                    )}

                    {checkoutStep === 'delivery' && (
                      <M.div key="step-delivery" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
                        <button
                          onClick={handleWhatsAppCheckout}
                          className="w-full py-4 bg-[#25D366] text-white font-bold rounded-2xl hover:bg-[#20b958] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(37,211,102,0.4)] active:scale-95"
                        >
                          <MessageCircle size={20} /> Confirmer via WhatsApp
                        </button>
                        <p className="text-[10px] text-zinc-500 text-center italic px-2">Vous serez redirigé vers WhatsApp pour finaliser et confirmer votre commande avec nous.</p>
                        <button
                          onClick={() => setCheckoutStep('cart')}
                          className="w-full py-3 text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                        >
                          <ArrowLeft size={14} /> Retour au panier
                        </button>
                      </M.div>
                    )}

                    {checkoutStep === 'success' && (
                      <M.div key="checkout-success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center text-center py-8">
                        <div className="w-20 h-20 bg-[#25D366] rounded-full flex items-center justify-center text-white mb-6 shadow-[0_0_30px_rgba(37,211,102,0.4)]">
                          <MessageCircle size={40} />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Commande envoyée !</h3>
                        <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                          Votre commande a été transmise via WhatsApp. Nous reviendrons vers vous très rapidement pour confirmer et finaliser.
                        </p>
                        <button
                          onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }}
                          className="w-full py-4 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all uppercase text-xs tracking-widest"
                        >
                          Retourner à la boutique
                        </button>
                      </M.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </M.div>
          </M.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckoutPrompt && (
          <M.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm">
            <div className="liquid-glass p-6 rounded-2xl flex flex-col gap-4 border-lime-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center text-black"><Check size={20} /></div>
                <div><p className="font-bold text-sm">Produit ajoute !</p><p className="text-xs text-zinc-400">Finaliser votre commande ?</p></div>
              </div>
              <button onClick={() => { setIsCartOpen(true); setShowCheckoutPrompt(false); setCheckoutStep('cart'); }} className="w-full py-3 bg-lime-500 text-black font-bold rounded-xl text-sm">Passer au paiement ({finalTotal.toFixed(2)}€)</button>
            </div>
          </M.div>
        )}
      </AnimatePresence>

      <header className="fixed top-0 left-0 w-full z-50 p-6 flex justify-between items-center pointer-events-none">
        <div className="liquid-glass px-6 py-3 rounded-full pointer-events-auto cursor-pointer" onClick={() => setCurrentPage('home')}>
          <span className="font-bold tracking-[0.2em] text-sm uppercase">Diarra <span className="text-lime-400">Plante de Vie</span></span>
        </div>
        <M.button
          animate={isCartBouncing ? { scale: [1, 1.1, 1], y: [0, -5, 0] } : {}}
          onClick={() => setIsCartOpen(true)}
          className="liquid-glass px-6 py-3 rounded-full flex items-center gap-3 pointer-events-auto group hover:border-lime-500/50 transition-all active:scale-95 shadow-xl"
        >
          <div className="relative">
            <ShoppingCart size={20} className="text-lime-400" />
            <AnimatePresence>
              {totalItems > 0 && (
                <M.span
                  key={totalItems}
                  initial={{ scale: 0, y: 5 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-lime-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-900"
                >
                  {totalItems}
                </M.span>
              )}
            </AnimatePresence>
          </div>
          <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Panier ({finalTotal.toFixed(2)}€)</span>
        </M.button>
      </header>

      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} />

      <main className="relative z-10">
        <AnimatePresence mode="wait">
          {currentPage === 'home' && renderHome()}
          {currentPage === 'catalog' && renderCatalog()}
          {currentPage === 'about' && renderAbout()}
          {currentPage === 'admin' && <AdminPage products={products} setProducts={setProducts} />}
          {currentPage === 'contact' && (
            <M.div variants={pageVariants} initial="initial" animate="animate" exit="exit" className="pt-28 pb-40 px-6 text-center max-w-4xl mx-auto">
              <h2 className="text-6xl font-bold mb-8">Nous Trouver</h2>
              <div className="liquid-glass p-12 rounded-[3rem] space-y-8 border-white/10">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.5em] text-lime-400 font-bold">Localisation</p>
                  <p className="text-2xl font-bold">42 Rue Marcadet, 75018 Paris</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.5em] text-emerald-400 font-bold">Horaires</p>
                  <p className="text-lg text-zinc-200">Lundi - Samedi : 09h30 - 19h30</p>
                </div>
                <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <a href={`tel:+${WHATSAPP_NUMBER}`} className="flex items-center justify-center gap-3 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                    <Phone size={20} className="text-lime-400" />
                    <span className="font-bold text-sm">+33 7 49 71 83 09</span>
                  </a>
                  <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 p-4 bg-[#25D366]/10 rounded-2xl hover:bg-[#25D366]/20 transition-colors border border-[#25D366]/30">
                    <MessageCircle size={20} className="text-[#25D366]" />
                    <span className="font-bold text-sm text-[#25D366]">Discuter sur WhatsApp (+33 7 49 71 83 09)</span>
                  </a>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center justify-center gap-3 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors sm:col-span-2">
                    <Mail size={20} className="text-lime-400" />
                    <span className="font-bold text-sm">{CONTACT_EMAIL}</span>
                  </a>
                </div>
              </div>
            </M.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="relative z-10 py-16 px-6 border-t border-white/5 bg-black/60 flex flex-col items-center gap-8">
        <div className="flex gap-6">
          <M.a
            whileHover={{ y: -5, scale: 1.1 }}
            href="https://facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 liquid-glass rounded-full text-zinc-400 hover:text-blue-500 hover:border-blue-500/30 transition-all border border-white/5"
          >
            <Facebook size={22} />
          </M.a>
          <M.a
            whileHover={{ y: -5, scale: 1.1 }}
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 liquid-glass rounded-full text-zinc-400 hover:text-pink-500 hover:border-pink-500/30 transition-all border border-white/5"
          >
            <Instagram size={22} />
          </M.a>
          <M.a
            whileHover={{ y: -5, scale: 1.1 }}
            href="https://www.tiktok.com/@diarra.plante?is_from_webapp=1&sender_device=pc"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 liquid-glass rounded-full text-zinc-400 hover:text-white hover:border-white/30 transition-all border border-white/5"
          >
            <Music2 size={22} />
          </M.a>
        </div>
        <div className="text-center text-zinc-500 text-[10px] tracking-[0.4em] uppercase font-bold">
          © {new Date().getFullYear()} Diarra Plante de Vie — Paris Herboristerie d'Exception
        </div>
      </footer>
    </div>
  );
};

export default App;
