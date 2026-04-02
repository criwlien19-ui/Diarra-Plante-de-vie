
export interface Product {
  id: string;
  name: string;
  scientificName: string;
  description: string;
  benefits: string[];
  usage: string;
  origin: string;
  image: string;
  category: 'Roots' | 'Leaves' | 'Seeds' | 'Blends';
  price: string;
  virtues: string[];
  symptoms: string[];
  stock: number;
}

export interface Review {
  id: string;
  productId: string;
  rating: number;
  text: string;
  userName: string;
  date: string;
}

export interface CartItem {
  id: string;
  quantity: number;
}

export type Page = 'home' | 'catalog' | 'wisdom' | 'contact' | 'about' | 'admin';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface Atmosphere {
  id: string;
  video: string;
  audio: string;
  name: string;
  color: string;
}

export type CheckoutStep = 'cart' | 'delivery' | 'payment' | 'payment-qr' | 'success';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  deliveryMethod: 'pickup' | 'shipping';
  shippingAddress: { street: string; city: string; zip: string };
  paymentMethod: 'wave' | 'orange' | null;
  date: string;
}
