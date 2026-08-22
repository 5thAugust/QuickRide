export const formatCurrency = (amount) => `${Number(amount || 0).toLocaleString("vi-VN")} ₫`;

export default formatCurrency;
