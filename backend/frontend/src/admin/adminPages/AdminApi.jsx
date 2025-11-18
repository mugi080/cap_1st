// src/api/AdminApi.js

export const fetchPendingOrders = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch('http://localhost:8000/api/orders', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch orders');

    const data = await res.json();
    const pending = data.filter((order) => order.status === 'Pending');
    return pending.length;
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    return null;
  }
};

export const fetchCompletedOrders = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch('http://localhost:8000/api/orders', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch orders');

    const data = await res.json();
    const completed = data.filter((order) => order.status === 'Completed');
    return completed.length;
  } catch (error) {
    console.error('Error fetching completed orders:', error);
    return null;
  }
};

export const fetchTotalUsers = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch('http://localhost:8000/api/total-users/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch total users');

    const data = await res.json();
    return data.total_users || 0;
  } catch (error) {
    console.error('Error fetching total users:', error);
    return null;
  }
};

export const fetchReviewStats = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch('http://localhost:8000/api/reviews/all/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch reviews');

    const data = await res.json();
    const count = data.length;
    const totalRating = data.reduce((sum, review) => sum + review.rating, 0);
    const average = count > 0 ? totalRating / count : 0;

    return { count, average };
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return null;
  }
};

// 🧾 Existing API Functions
export const fetchMonthlySalesReport = async () => {
  try {
    const res = await fetch('http://localhost:8000/api/admin/monthly-sales/', {
      method: 'GET',
    });

    if (!res.ok) throw new Error('Failed to load monthly sales');

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching monthly sales report:', error);
    return [];
  }
};

export const fetchBeverageSalesReport = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch('http://localhost:8000/api/admin/beverage-report/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to load beverage report');

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching beverage report:', error);
    return [];
  }
};

// 📊 NEW ANALYTICS API FUNCTIONS

// Fetch Monthly Sales Data for Charts
export const fetchMonthlySalesData = async (year = new Date().getFullYear()) => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch(`http://localhost:8000/analytics/monthly-sales/?year=${year}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch monthly sales data');

    const data = await res.json();
    return data; // { success: true, data: [...], year: 2025 }
  } catch (error) {
    console.error('Error fetching monthly sales data:', error);
    return { success: false, data: [], error: error.message };
  }
};

// Fetch Beverage Popularity by Barangay
export const fetchBeverageByBarangay = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch('http://localhost:8000/analytics/beverage-by-barangay/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch beverage by barangay data');

    const data = await res.json();
    return data; // { success: true, data: [...] }
  } catch (error) {
    console.error('Error fetching beverage by barangay:', error);
    return { success: false, data: [], error: error.message };
  }
};

// Fetch Top Selling Beverages
export const fetchTopBeverages = async (days = 30) => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch(`http://localhost:8000/analytics/top-beverages/?days=${days}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch top beverages data');

    const data = await res.json();
    return data; // { success: true, data: [...], period: "Last 30 days" }
  } catch (error) {
    console.error('Error fetching top beverages:', error);
    return { success: false, data: [], error: error.message };
  }
};

// Fetch Daily Sales Trend (for line charts)
export const fetchDailySalesTrend = async (days = 30) => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch(`http://localhost:8000/analytics/daily-trend/?days=${days}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch daily sales trend');

    const data = await res.json();
    return data; // { success: true, data: [...], period: "Last 30 days" }
  } catch (error) {
    console.error('Error fetching daily sales trend:', error);
    return { success: false, data: [], error: error.message };
  }
};

// Fetch Sales by Delivery Type (Pickup vs Delivered)
export const fetchSalesByDeliveryType = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch('http://localhost:8000/analytics/delivery-type/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch delivery type data');

    const data = await res.json();
    return data; // { success: true, data: [...] }
  } catch (error) {
    console.error('Error fetching delivery type data:', error);
    return { success: false, data: [], error: error.message };
  }
};

// Fetch Payment Method Analytics
export const fetchPaymentMethodAnalytics = async () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) throw new Error('No token found');

    const res = await fetch('http://localhost:8000/analytics/payment-methods/', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to fetch payment method data');

    const data = await res.json();
    return data; // { success: true, data: [...], total_orders: 200 }
  } catch (error) {
    console.error('Error fetching payment method data:', error);
    return { success: false, data: [], error: error.message };
  }
};

// 🎯 COMBINED DASHBOARD DATA FETCHER
export const fetchDashboardAnalytics = async () => {
  try {
    const [
      monthlySales,
      topBeverages,
      beverageByBarangay,
      dailyTrend,
      deliveryTypes,
      paymentMethods
    ] = await Promise.all([
      fetchMonthlySalesData(),
      fetchTopBeverages(30),
      fetchBeverageByBarangay(),
      fetchDailySalesTrend(30),
      fetchSalesByDeliveryType(),
      fetchPaymentMethodAnalytics()
    ]);

    return {
      monthlySales: monthlySales.data || [],
      topBeverages: topBeverages.data || [],
      beverageByBarangay: beverageByBarangay.data || [],
      dailyTrend: dailyTrend.data || [],
      deliveryTypes: deliveryTypes.data || [],
      paymentMethods: paymentMethods.data || [],
      loading: false,
      error: null
    };
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    return {
      monthlySales: [],
      topBeverages: [],
      beverageByBarangay: [],
      dailyTrend: [],
      deliveryTypes: [],
      paymentMethods: [],
      loading: false,
      error: error.message
    };
  }
};