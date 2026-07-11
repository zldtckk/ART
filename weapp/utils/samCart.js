const STORAGE_KEY = 'samCart';
const MAX_QTY = 50;

function getCart() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

function saveCart(cart) {
  wx.setStorageSync(STORAGE_KEY, cart);
  return cart;
}

function addToCart(dish) {
  const cart = getCart();
  const existing = cart.find(i => i.dish_id === dish._id);
  const next = existing
    ? cart.map(i => (i.dish_id === dish._id ? { ...i, qty: Math.min(MAX_QTY, i.qty + 1) } : i))
    : [...cart, { dish_id: dish._id, name: dish.name, price: dish.price, unit: dish.unit || '份', image: dish.image || '', qty: 1 }];
  return saveCart(next);
}

function setQty(dishId, qty) {
  const cart = getCart();
  const capped = Math.min(MAX_QTY, qty);
  const next = capped <= 0
    ? cart.filter(i => i.dish_id !== dishId)
    : cart.map(i => (i.dish_id === dishId ? { ...i, qty: capped } : i));
  return saveCart(next);
}

function removeFromCart(dishId) {
  return saveCart(getCart().filter(i => i.dish_id !== dishId));
}

function clearCart() {
  return saveCart([]);
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function getCartTotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.qty, 0);
}

module.exports = {
  getCart,
  addToCart,
  setQty,
  removeFromCart,
  clearCart,
  getCartCount,
  getCartTotal,
  MAX_QTY,
};
