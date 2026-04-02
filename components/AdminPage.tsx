import React, { useState, useEffect } from 'react';
import { Product, Order } from '../types';
import { Plus, Edit2, Trash2, Check, X, Shield, Lock, ChevronRight, Upload, Image as ImageIcon, ShoppingBag, TrendingUp, Package, Clock } from 'lucide-react';
import { supabase } from '../services/supabase';

interface AdminPageProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const AdminPage: React.FC<AdminPageProps> = ({ products, setProducts }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('diarra_admin_auth') === 'true';
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'finances'>('products');
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'finances') {
      const fetchOrders = async () => {
        const { data, error } = await supabase.from('orders').select('*, items:order_items(product_id, quantity)').order('date', { ascending: false });
        if (data && !error) {
           const mappedOrders = data.map(o => ({
             ...o,
             deliveryMethod: o.delivery_method,
             shippingAddress: o.shipping_address,
             paymentMethod: o.payment_method,
             items: o.items.map((i: any) => ({ id: i.product_id, quantity: i.quantity }))
           }));
           setOrders(mappedOrders as Order[]);
        }
      };
      fetchOrders();
    }
  }, [activeTab]);

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (!error) {
        setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
      }
    } catch(err) {
      console.error(err);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAdding, setIsAdding] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for localStorage
        alert("L'image est trop volumineuse (max 2MB pour le stockage local).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'Admin' && password === '@Senpixel0905') {
      setIsAuthenticated(true);
      sessionStorage.setItem('diarra_admin_auth', 'true');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('diarra_admin_auth');
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm(product);
  };

  const handleSave = async () => {
    if (editingId) {
      const { error } = await supabase.from('products').update({
        name: editForm.name,
        scientific_name: editForm.scientificName,
        description: editForm.description,
        benefits: editForm.benefits,
        usage: editForm.usage,
        origin: editForm.origin,
        category: editForm.category,
        price: editForm.price,
        virtues: editForm.virtues,
        symptoms: editForm.symptoms,
        image: editForm.image,
        stock: editForm.stock,
      }).eq('id', editingId);
      
      if (!error) {
        setProducts(products.map(p => p.id === editingId ? { ...p, ...editForm } as Product : p));
      } else {
        console.error("Erreur de modification du produit", error);
      }
    } else {
      const newProduct = {
        id: 'p' + Date.now().toString(),
        name: editForm.name || 'Nouveau Produit',
        scientific_name: editForm.scientificName || '',
        description: editForm.description || '',
        benefits: editForm.benefits || [],
        usage: editForm.usage || '',
        origin: editForm.origin || '',
        category: editForm.category || 'Roots',
        price: editForm.price || '0,00€',
        virtues: editForm.virtues || [],
        symptoms: editForm.symptoms || [],
        image: editForm.image || 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=800&auto=format&fit=crop',
        stock: editForm.stock || 0,
      };
      
      const { error } = await supabase.from('products').insert([newProduct]);
      if (!error) {
        setProducts([...products, { ...newProduct, scientificName: newProduct.scientific_name } as Product]);
      } else {
        console.error("Erreur d'ajout du produit", error);
      }
    }
    setEditingId(null);
    setIsAdding(false);
    setEditForm({});
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Voulez-vous vraiment supprimer ce produit ?')) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        setProducts(products.filter(p => p.id !== id));
      } else {
        console.error("Erreur de suppression du produit", error);
      }
    }
  };

  const handleAddNew = () => {
    setIsAdding(true);
    setEditingId(null);
    setEditForm({ category: 'Roots', stock: 50, price: '10,00€' });
  };

  if (!isAuthenticated) {
    return (
      <div className="pt-32 pb-40 px-6 max-w-md mx-auto relative z-10 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="w-full liquid-glass p-8 rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-lime-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-lime-500/20">
              <Lock size={32} className="text-lime-500" />
            </div>
            <h2 className="text-2xl font-bold font-serif mb-2">Accès Sécurisé</h2>
            <p className="text-sm text-zinc-400">Veuillez vous identifier pour accéder à l'espace administrateur.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Identifiant</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none transition-colors"
                placeholder="Identifiant"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Mot de passe</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
            
            {loginError && (
              <p className="text-rose-500 text-xs font-bold text-center mt-2 bg-rose-500/10 py-2 rounded-lg">Identifiant ou mot de passe incorrect.</p>
            )}

            <button type="submit" className="w-full py-4 mt-6 bg-lime-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-lime-400 transition-all shadow-[0_0_20px_rgba(132,204,22,0.2)] active:scale-95">
              Se connecter <ChevronRight size={18} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Admin layout when authenticated
  return (
    <div className="pt-28 pb-40 px-6 max-w-7xl mx-auto relative z-10">
      <div className="mb-12 flex items-center justify-between">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 flex items-center gap-4">
            <Shield className="text-lime-500" size={40} />
            Espace Administrateur
          </h2>
          <p className="text-zinc-400">Gérez vos produits, prix et stocks.</p>
        </div>
        <div className="flex gap-4">
          {!isAdding && !editingId && (
            <button 
              onClick={handleAddNew}
              className="flex items-center gap-2 px-6 py-3 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400 transition-colors"
            >
              <Plus size={20} />
              Ajouter un produit
            </button>
          )}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-8 overflow-x-auto pb-4 hide-scrollbar">
        <button 
          onClick={() => setActiveTab('products')}
          className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'products' ? 'bg-lime-500 text-black shadow-[0_0_20px_rgba(132,204,22,0.3)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
        >
          <Package size={18} /> Produits
        </button>
        <button 
          onClick={() => setActiveTab('orders')}
          className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'orders' ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
        >
          <ShoppingBag size={18} /> Commandes
        </button>
        <button 
          onClick={() => setActiveTab('finances')}
          className={`flex-shrink-0 flex items-center gap-2 px-6 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all ${activeTab === 'finances' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
        >
          <TrendingUp size={18} /> Finances
        </button>
      </div>

      {activeTab === 'products' && (
        <>
          {(isAdding || editingId) && (
        <div className="liquid-glass p-8 rounded-2xl mb-12 border border-lime-500/30 shadow-2xl">
          <h3 className="text-2xl font-bold mb-6">{isAdding ? 'Nouveau Produit' : 'Modifier le Produit'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nom */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Nom</label>
              <input type="text" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none" placeholder="Ex: Koundjé" />
            </div>
            {/* Prix */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Prix (avec devise)</label>
              <input type="text" value={editForm.price || ''} onChange={e => setEditForm({...editForm, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none" placeholder="Ex: 14,50€" />
            </div>
            {/* Nom scientifique */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Nom scientifique</label>
              <input type="text" value={editForm.scientificName || ''} onChange={e => setEditForm({...editForm, scientificName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none" placeholder="Ex: Commiphora africana" />
            </div>
            {/* Origine */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Origine</label>
              <input type="text" value={editForm.origin || ''} onChange={e => setEditForm({...editForm, origin: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none" placeholder="Ex: Mali, Sénégal..." />
            </div>
            {/* Stock */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Stock disponible</label>
              <input type="number" value={editForm.stock || 0} onChange={e => setEditForm({...editForm, stock: parseInt(e.target.value) || 0})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none" />
            </div>
            {/* Catégorie */}
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Catégorie</label>
              <select value={editForm.category || 'Roots'} onChange={e => setEditForm({...editForm, category: e.target.value as any})} className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none cursor-pointer">
                <option value="Roots">Racines (Roots)</option>
                <option value="Leaves">Feuilles (Leaves)</option>
                <option value="Seeds">Graines (Seeds)</option>
                <option value="Blends">Mélanges (Blends)</option>
              </select>
            </div>
            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Description</label>
              <textarea value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none" placeholder="Description complète de la plante..." />
            </div>
            {/* Usage */}
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Usage / Mode d'emploi</label>
              <textarea value={editForm.usage || ''} onChange={e => setEditForm({...editForm, usage: e.target.value})} rows={2} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none" placeholder="Ex: En infusion légère le soir ou en bain de vapeur..." />
            </div>
            {/* Bienfaits */}
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                Bienfaits <span className="text-zinc-600 normal-case font-normal">(tapez puis appuyez sur Entrée pour ajouter)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3 min-h-[36px] p-2 bg-white/3 rounded-xl border border-white/5">
                {(editForm.benefits || []).length === 0 && <span className="text-zinc-600 text-xs italic">Aucun bienfait ajouté</span>}
                {(editForm.benefits || []).map((b, i) => (
                  <span key={i} className="flex items-center gap-1 px-3 py-1 bg-lime-500/15 border border-lime-500/30 rounded-full text-xs text-lime-300 font-bold">
                    {b}
                    <button type="button" onClick={() => setEditForm({...editForm, benefits: (editForm.benefits || []).filter((_, idx) => idx !== i)})} className="hover:text-white transition-colors ml-1">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Ex: Détoxifiant naturel — puis Entrée"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-lime-500/50 outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setEditForm({...editForm, benefits: [...(editForm.benefits || []), val]});
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
            {/* Symptômes ciblés */}
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">
                Symptômes ciblés <span className="text-zinc-600 normal-case font-normal">(reliés aux filtres de la boutique — Entrée pour ajouter)</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3 min-h-[36px] p-2 bg-white/3 rounded-xl border border-white/5">
                {(editForm.symptoms || []).length === 0 && <span className="text-zinc-600 text-xs italic">Aucun symptôme ajouté</span>}
                {(editForm.symptoms || []).map((s, i) => (
                  <span key={i} className="flex items-center gap-1 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-xs text-emerald-300 font-bold">
                    {s}
                    <button type="button" onClick={() => setEditForm({...editForm, symptoms: (editForm.symptoms || []).filter((_, idx) => idx !== i)})} className="hover:text-white transition-colors ml-1">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Ex: Fatigue, Stress, Fièvre — puis Entrée"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50 outline-none"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      setEditForm({...editForm, symptoms: [...(editForm.symptoms || []), val]});
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
            {/* Image */}
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-2">Image du produit</label>
              <div className="flex gap-4 items-center">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center group flex-shrink-0">
                  {editForm.image ? (
                    <img src={editForm.image} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={32} className="text-zinc-600" />
                  )}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  >
                    <Upload size={20} />
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload size={14} /> Choisir une photo locale
                  </button>
                  <input 
                    type="text" 
                    value={editForm.image || ''} 
                    onChange={e => setEditForm({...editForm, image: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-[10px] focus:border-lime-500/50 outline-none" 
                    placeholder="Ou collez une URL d'image (https://...)" 
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 flex gap-4">
            <button onClick={handleSave} className="flex-1 py-3 bg-lime-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-lime-400">
              <Check size={20} /> Enregistrer
            </button>
            <button onClick={() => { setIsAdding(false); setEditingId(null); setEditForm({}); }} className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/20">
              <X size={20} /> Annuler
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map(product => (
          <div key={product.id} className="liquid-glass p-6 rounded-2xl flex flex-col border border-white/5 hover:border-lime-500/30 transition-colors">
            <div className="flex gap-4 items-start mb-4">
              <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-xl" />
              <div className="flex-1">
                <h4 className="font-bold text-lg leading-tight mb-1">{product.name}</h4>
                <p className="text-lime-400 font-bold">{product.price}</p>
                <p className="text-xs text-zinc-500 mt-1">Stock: {product.stock} unités</p>
              </div>
            </div>
            <p className="text-xs text-zinc-400 line-clamp-2 mb-4 flex-1">{product.description}</p>
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <button 
                onClick={() => handleEdit(product)}
                className="py-2 bg-white/5 text-zinc-300 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-bold hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
              >
                <Edit2 size={14} /> Éditer
              </button>
              <button 
                onClick={() => handleDelete(product.id)}
                className="py-2 bg-white/5 text-zinc-300 rounded-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest font-bold hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={14} /> Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>
        </>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">Gestion des Commandes</h3>
            <div className="text-sm text-zinc-400">Total: {orders.length} commande(s)</div>
          </div>
          
          {orders.length === 0 ? (
            <div className="text-center py-12 liquid-glass rounded-2xl border border-white/5">
              <ShoppingBag size={48} className="mx-auto text-zinc-600 mb-4" />
              <p className="text-zinc-400">Aucune commande pour le moment.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map(order => (
                <div key={order.id} className="liquid-glass p-6 rounded-2xl flex flex-col md:flex-row gap-6 border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-amber-400 font-bold">{order.id}</span>
                          <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${
                            order.status === 'completed' ? 'bg-lime-500/20 text-lime-400' : 
                            order.status === 'cancelled' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {order.status === 'completed' ? 'Terminée' : order.status === 'cancelled' ? 'Annulée' : 'En attente'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500">{new Date(order.date).toLocaleString('fr-FR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{order.total.toFixed(2)}€</p>
                        <p className="text-xs text-zinc-400 capitalize">{order.paymentMethod || 'Non spécifié'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Livraison</p>
                        <p className="text-sm font-bold capitalize">{order.deliveryMethod === 'pickup' ? 'Retrait sur place' : 'Livraison a domicile'}</p>
                        {order.deliveryMethod === 'shipping' && (
                          <p className="text-xs text-zinc-400 mt-1">{order.shippingAddress.street}, {order.shippingAddress.zip} {order.shippingAddress.city}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Articles ({order.items.reduce((acc, item) => acc + item.quantity, 0)})</p>
                        <ul className="text-xs text-zinc-400 space-y-1">
                          {order.items.map(item => {
                            const p = products.find(prod => prod.id === item.id);
                            return <li key={item.id}>{item.quantity}x {p?.name || 'Produit inconnu'}</li>
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'completed')}
                      disabled={order.status === 'completed'}
                      className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                        order.status === 'completed' ? 'bg-lime-500/10 text-lime-500/50 cursor-not-allowed' : 'bg-lime-500/20 text-lime-400 hover:bg-lime-500/30'
                      }`}
                    >
                      <Check size={14} /> Valider
                    </button>
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'pending')}
                      disabled={order.status === 'pending'}
                      className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                        order.status === 'pending' ? 'bg-amber-500/10 text-amber-500/50 cursor-not-allowed' : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      }`}
                    >
                      <Clock size={14} /> Attente
                    </button>
                    <button 
                      onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      disabled={order.status === 'cancelled'}
                      className={`py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                        order.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500/50 cursor-not-allowed' : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                      }`}
                    >
                      <X size={14} /> Annuler
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'finances' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-bold mb-6">Suivi Financier</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="liquid-glass p-6 rounded-2xl border border-emerald-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Recettes Totales</p>
                  <h4 className="text-3xl font-bold text-white">
                    {orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0).toFixed(2)}€
                  </h4>
                </div>
              </div>
            </div>

            <div className="liquid-glass p-6 rounded-2xl border border-blue-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl">
                  <ShoppingBag size={24} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Commandes Terminées</p>
                  <h4 className="text-3xl font-bold text-white">
                    {orders.filter(o => o.status === 'completed').length}
                  </h4>
                </div>
              </div>
            </div>

            <div className="liquid-glass p-6 rounded-2xl border border-purple-500/30">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Package size={24} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Panier Moyen</p>
                  <h4 className="text-3xl font-bold text-white">
                    {orders.filter(o => o.status === 'completed').length > 0 
                      ? (orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.total, 0) / orders.filter(o => o.status === 'completed').length).toFixed(2)
                      : '0.00'}€
                  </h4>
                </div>
              </div>
            </div>
          </div>
          
          <div className="liquid-glass p-8 rounded-2xl border border-amber-500/20 mt-8">
            <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
              <Clock size={20} className="text-amber-500" />
              Recettes en attente
            </h4>
            <div className="flex items-end gap-4">
              <p className="text-4xl font-bold text-amber-500">
                {orders.filter(o => o.status === 'pending').reduce((sum, o) => sum + o.total, 0).toFixed(2)}€
              </p>
              <p className="text-sm text-zinc-400 mb-1">
                ({orders.filter(o => o.status === 'pending').length} commandes à l'encaissement)
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
