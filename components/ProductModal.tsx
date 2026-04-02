
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Review } from '../types';
import { X, Sparkles, MapPin, Beaker, ShoppingCart, Check, MessageCircle, Mail, ArrowLeft, Star, Send, User, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../services/supabase';

// Casting motion to any to bypass environment-specific TypeScript prop errors
const M = motion as any;

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (productId: string) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onAddToCart }) => {
  const [isAdded, setIsAdded] = useState(false);
  const [showContactOptions, setShowContactOptions] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  
  // Review form state
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [userName, setUserName] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  useEffect(() => {
    if (product) {
      const fetchReviews = async () => {
        try {
          const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('product_id', product.id)
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          if (data) {
            // Map the snake_case from DB back to camelCase for the frontend UI
            const mappedReviews = data.map((r: any) => ({
              id: r.id,
              productId: r.product_id,
              rating: r.rating,
              text: r.text,
              userName: r.user_name,
              date: r.date
            }));
            setReviews(mappedReviews);
          }
        } catch (err) {
          console.error("Erreur chargement des avis:", err);
          setReviews([]);
        }
      };
      
      fetchReviews();

      // Reset form
      setRating(5);
      setReviewText('');
      setUserName('');
    }
  }, [product]);

  const handleAddToCart = () => {
    if (product) {
      onAddToCart(product.id);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reviewText.trim() || !userName.trim()) return;

    const newId = Date.now().toString();
    const newDate = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const newReviewDb = {
      id: newId,
      product_id: product.id,
      rating,
      text: reviewText,
      user_name: userName,
      date: newDate
    };

    const newReviewFrontend: Review = {
      id: newId,
      productId: product.id,
      rating,
      text: reviewText,
      userName: userName,
      date: newDate
    };

    try {
      const { error } = await supabase.from('reviews').insert([newReviewDb]);
      if (error) throw error;
      setReviews([newReviewFrontend, ...reviews]);
    } catch (err) {
      console.error("Erreur lors de l'ajout de l'avis:", err);
      // Fallback local en cas d'erreur
      setReviews([newReviewFrontend, ...reviews]);
    }
    
    setReviewText('');
    setUserName('');
    setRating(5);
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  }, [reviews]);

  if (!product) return null;

  const whatsappNumber = "33749718309"; 
  const emailAddress = "Senpixelstudio@gmail.com";

  return (
    <AnimatePresence>
      <M.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-12 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      >
        <M.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative max-w-6xl w-full max-h-[90vh] overflow-y-auto liquid-glass rounded-[2rem] flex flex-col md:flex-row overflow-hidden shadow-2xl"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 p-2 bg-black/20 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={24} />
          </button>

          <div className="w-full md:w-1/2 h-64 md:h-auto overflow-hidden sticky top-0">
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lime-400 font-bold tracking-[0.2em] text-xs uppercase">
                {product.category}
              </span>
              {averageRating > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 liquid-glass rounded-full border-lime-500/20">
                  <Star size={14} className="fill-lime-500 text-lime-500" />
                  <span className="text-xs font-bold text-lime-400">{averageRating.toFixed(1)}</span>
                  <span className="text-[10px] text-zinc-500">({reviews.length})</span>
                </div>
              )}
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-1 leading-tight">{product.name}</h2>
            <p className="italic text-zinc-400 font-serif mb-6 text-xl">{product.scientificName}</p>

            <div className="space-y-8">
              <p className="text-lg text-zinc-300 leading-relaxed italic">
                "{product.description}"
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lime-400">
                    <Sparkles size={18} />
                    <span className="font-bold text-sm tracking-widest uppercase">Bienfaits</span>
                  </div>
                  <ul className="space-y-3">
                    {product.benefits.map((b, i) => (
                      <li key={i} className="text-zinc-400 text-sm flex items-start gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-lime-500 mt-1.5 flex-shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Beaker size={18} />
                    <span className="font-bold text-sm tracking-widest uppercase">Usage</span>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5 italic">
                    {product.usage}
                  </p>
                </div>

                {/* Symptoms Section */}
                <div className="space-y-4 sm:col-span-2">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Activity size={18} />
                    <span className="font-bold text-sm tracking-widest uppercase">Symptômes Ciblés</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {product.symptoms && product.symptoms.length > 0 ? (
                      product.symptoms.map(s => (
                        <span key={s} className="px-3 py-1.5 liquid-glass rounded-xl text-[10px] font-bold text-zinc-300 border-rose-500/20 uppercase tracking-widest">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-500 text-xs italic">Usage préventif et bien-être général.</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-zinc-400">
                  <MapPin size={16} className="text-lime-400" />
                  <span className="text-sm">Origine: {product.origin}</span>
                </div>
                <div className="text-3xl font-bold text-lime-400">
                  {product.price}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    onClick={handleAddToCart}
                    className={`flex-1 py-4 font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                      isAdded 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-lime-500 hover:bg-lime-400 text-black shadow-[0_0_20px_rgba(132,204,22,0.3)]'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check size={20} />
                        Ajouté au panier
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={20} />
                        Ajouter au panier
                      </>
                    )}
                  </button>
                  
                  {!showContactOptions ? (
                    <button 
                      onClick={() => setShowContactOptions(true)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl transition-all active:scale-95"
                    >
                      Conseil personnalisé
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowContactOptions(false)}
                      className="flex-1 py-4 bg-white/10 text-white border border-white/20 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={16} /> Retour
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showContactOptions && (
                    <M.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-hidden"
                    >
                      <a 
                        href={`https://wa.me/${whatsappNumber}?text=Bonjour, je souhaiterais un conseil concernant le produit : ${product.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] font-bold rounded-xl transition-all"
                      >
                        <MessageCircle size={20} />
                        WhatsApp (+33 7 49 71 83 09)
                      </a>
                      <a 
                        href={`mailto:${emailAddress}?subject=Conseil : ${product.name}`}
                        className="flex items-center justify-center gap-2 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold rounded-xl transition-all"
                      >
                        <Mail size={20} />
                        Envoyer un Email
                      </a>
                    </M.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reviews Section */}
              <div className="pt-12 border-t border-white/10">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold">Avis Clients</h3>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">{reviews.length} témoignages</p>
                </div>

                {/* Review Form */}
                <form onSubmit={submitReview} className="mb-12 p-6 liquid-glass rounded-3xl border border-white/5">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-lime-400 font-bold mb-6">Partagez votre expérience</p>
                  
                  <div className="flex gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        onClick={() => setRating(star)}
                        className="transition-transform active:scale-90"
                      >
                        <Star 
                          size={28} 
                          className={`${
                            (hoveredRating || rating) >= star 
                              ? 'fill-lime-500 text-lime-500' 
                              : 'text-zinc-700'
                          } transition-colors`} 
                        />
                      </button>
                    ))}
                    <span className="ml-4 text-xs font-bold text-zinc-400 self-center">
                      {rating === 5 ? 'Excellent' : rating === 4 ? 'Très bien' : rating === 3 ? 'Satisfaisant' : rating === 2 ? 'Moyen' : 'Déçu'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-4 mb-4">
                    <input
                      type="text"
                      placeholder="Votre nom"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-lime-500/50 transition-colors text-sm"
                    />
                    <textarea
                      placeholder="Quels sont les effets ressentis ? (ex: regain d'énergie, apaisement...)"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      required
                      rows={3}
                      className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 focus:outline-none focus:border-lime-500/50 transition-colors text-sm resize-none"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="w-full py-4 bg-white/5 hover:bg-lime-500 hover:text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 group"
                  >
                    <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Publier mon avis
                  </button>
                </form>

                {/* Reviews List */}
                <div className="space-y-6">
                  {reviews.length > 0 ? (
                    reviews.map((rev) => (
                      <M.div 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        key={rev.id} 
                        className="p-6 bg-white/5 rounded-2xl border border-white/5"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                              <User size={18} className="text-zinc-500" />
                            </div>
                            <div>
                              <p className="font-bold text-sm">{rev.userName}</p>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{rev.date}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} size={12} className={s <= rev.rating ? 'fill-lime-500 text-lime-500' : 'text-zinc-800'} />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed italic">"{rev.text}"</p>
                      </M.div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                      <Star size={32} className="mx-auto mb-4 text-zinc-800" />
                      <p className="text-zinc-500 text-sm italic">Aucun avis pour le moment. Soyez le premier à partager votre expérience.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </M.div>
      </M.div>
    </AnimatePresence>
  );
};

export default ProductModal;
