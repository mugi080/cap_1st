// Base API configuration
const API_BASE_URL = 'http://localhost:8000/api/analytics';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('admin_token');
  if (!token) throw new Error('Authentication token not found. Please login again.');
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Helper function to handle API responses
const handleApiResponse = async (response, errorMessage) => {
  if (!response.ok) {
    // Try to get error details from response
    let errorDetail = errorMessage;
    try {
      const errorData = await response.json();
      errorDetail = errorData.detail || errorData.message || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
      errorDetail = `${errorMessage} (${response.status}: ${response.statusText})`;
    }
    throw new Error(errorDetail);
  }
  
  return await response.json();
};

// Fetch Monthly Sales Data for Charts
export const fetchMonthlySalesData = async (year = new Date().getFullYear()) => {
  try {
    const response = await fetch(`${API_BASE_URL}/monthly-sales/?year=${year}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleApiResponse(response, 'Failed to fetch monthly sales data');
    
    // Validate response structure
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from server');
    }
    
    return {
      success: true,
      data: data.data,
      year: data.year,
      metadata: {
        totalMonths: data.data.length,
        totalSales: data.data.reduce((sum, month) => sum + month.sales, 0),
        totalOrders: data.data.reduce((sum, month) => sum + month.orders, 0),
      }
    };
  } catch (error) {
    console.error('Error fetching monthly sales data:', error);
    return { 
      success: false, 
      data: [], 
      error: error.message,
      year: year 
    };
  }
};

// Fetch Beverage Popularity by Barangay
export const fetchBeverageByBarangay = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/beverage-by-barangay/`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleApiResponse(response, 'Failed to fetch beverage by barangay data');
    
    // Validate response structure
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from server');
    }
    
    return {
      success: true,
      data: data.data,
      metadata: {
        totalBarangays: data.data.length,
        totalOrders: data.data.reduce((sum, barangay) => sum + barangay.total_orders, 0),
        totalItems: data.data.reduce((sum, barangay) => sum + barangay.total_items, 0),
      }
    };
  } catch (error) {
    console.error('Error fetching beverage by barangay:', error);
    return { 
      success: false, 
      data: [], 
      error: error.message 
    };
  }
};

// Fetch Top Selling Beverages
export const fetchTopBeverages = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/top-beverages/?days=${days}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleApiResponse(response, 'Failed to fetch top beverages data');
    
    // Validate response structure
    if (!data.success || !Array.isArray(data.data)) {
      throw new Error('Invalid response format from server');
    }
    
    return {
      success: true,
      data: data.data,
      period: data.period,
      metadata: {
        totalBeverages: data.data.length,
        totalQuantity: data.data.reduce((sum, bev) => sum + bev.quantity, 0),
        totalRevenue: data.data.reduce((sum, bev) => sum + bev.revenue, 0),
        topBeverage: data.data[0] || null,
      }
    };
  } catch (error) {
    console.error('Error fetching top beverages:', error);
    return { 
      success: false, 
      data: [], 
      error: error.message,
      period: `Last ${days} days`
    };
  }
};

// NEW: Fetch Sales Summary (if you added the bonus view)
export const fetchSalesSummary = async (days = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/sales-summary/?days=${days}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const data = await handleApiResponse(response, 'Failed to fetch sales summary');
    
    if (!data.success) {
      throw new Error('Invalid response format from server');
    }
    
    return {
      success: true,
      data: data.data,
      period: `Last ${days} days`
    };
  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return { 
      success: false, 
      data: null, 
      error: error.message,
      period: `Last ${days} days`
    };
  }
};

// NEW: Utility function to fetch all analytics data at once
export const fetchAllAnalyticsData = async (options = {}) => {
  const {
    year = new Date().getFullYear(),
    days = 30
  } = options;

  try {
    // Fetch all data in parallel
    const [
      monthlySales,
      beverageByBarangay,
      topBeverages,
      salesSummary
    ] = await Promise.allSettled([
      fetchMonthlySalesData(year),
      fetchBeverageByBarangay(),
      fetchTopBeverages(days),
      fetchSalesSummary(days)
    ]);

    return {
      success: true,
      data: {
        monthlySales: monthlySales.status === 'fulfilled' ? monthlySales.value : { success: false, error: monthlySales.reason?.message },
        beverageByBarangay: beverageByBarangay.status === 'fulfilled' ? beverageByBarangay.value : { success: false, error: beverageByBarangay.reason?.message },
        topBeverages: topBeverages.status === 'fulfilled' ? topBeverages.value : { success: false, error: topBeverages.reason?.message },
        salesSummary: salesSummary.status === 'fulfilled' ? salesSummary.value : { success: false, error: salesSummary.reason?.message }
      },
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching all analytics data:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// NEW: Helper function to format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(amount);
};

// NEW: Helper function to format numbers
export const formatNumber = (number) => {
  return new Intl.NumberFormat('en-PH').format(number);
};

// NEW: Helper function to calculate percentage change
export const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};