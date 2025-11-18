import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/";


export const placeOrder = async ({ items, address, paymentMethod, deliveryType, textAddress,contactNumber }) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
        return {
            success: false,
            message: "No access token found. Please log in again.",
        };
    }

    if (!Array.isArray(items)) {
        console.error("Selected items is not an array:", items);
        return {
            success: false,
            message: "Selected items is not an array.",
        };
    }

    // Ensure the items array is in the correct format
    const orderData = {
        items: items.map(item => ({
            id: item.id,          // Assuming each item has an `id`
            quantity: item.quantity,  // Assuming each item has a `quantity`
            price: item.price,       // Assuming each item has a `price`
        })),
        address,                // Add the address here
        payment_method: paymentMethod,  // Add the payment method here
        delivery_type: deliveryType, 
        text_address: textAddress,
        contact_number: contactNumber, // Add the contact number here
    
           // Add the delivery type here
    };

    try {
        const response = await axios.post(
            `${API_URL}place_order/`, // Replace with your actual API endpoint
            orderData,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );
        return {
            success: true,
            message: response.data.message,
            orderDetails: response.data.order_items,
            totalPrice: response.data.total_price,
        };
    } catch (error) {
        console.error("Error placing order:", error);
        return {
            success: false,
            message: error.response ? error.response.data.error : "Failed to place order",
        };
    }
};






export const fetchOrders = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      return {
        success: false,
        message: "No access token found. Please log in again.",
      };
    }
  
    try {
      const response = await axios.get(`${API_URL}user/orders/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Log the response to check if name is included
      console.log(response.data);  // Check if the 'name' is present here
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Error fetching orders:", error);
      return { success: false, message: "Failed to fetch orders" };
    }
  };
  
