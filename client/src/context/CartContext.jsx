import { useState, useEffect, useContext, createContext } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        try { return JSON.parse(localStorage.getItem('cart')) || []; }
        catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (brand, qty = 1) => {
        setCart(prev => {
            const existing = prev.find(i => i.brand_id === brand.id);
            if (existing) {
                return prev.map(i => i.brand_id === brand.id ? { ...i, quantity: i.quantity + qty } : i);
            }
            return [...prev, { brand_id: brand.id, name: brand.name, price_per_bag: brand.price_per_bag, quantity: qty }];
        });
    };

    const updateQty = (brand_id, qty) => {
        if (qty <= 0) return removeFromCart(brand_id);
        setCart(prev => prev.map(i => i.brand_id === brand_id ? { ...i, quantity: qty } : i));
    };

    const removeFromCart = (brand_id) => setCart(prev => prev.filter(i => i.brand_id !== brand_id));

    const clearCart = () => setCart([]);

    const total = cart.reduce((acc, i) => acc + i.price_per_bag * i.quantity, 0);
    const itemCount = cart.reduce((acc, i) => acc + i.quantity, 0);

    return (
        <CartContext.Provider value={{ cart, addToCart, updateQty, removeFromCart, clearCart, total, itemCount }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
