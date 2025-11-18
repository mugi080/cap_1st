import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/";

export const updateOrder = async (orderId, items, address, paymentMethod) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
        return { success: false, message: "No access token found. Please log in again." };
    }

    try {
        const response = await axios.put(
            `${API_URL}orders/${orderId}/update/`,
            { items, address, payment_method: paymentMethod }, // Sending items, address, and payment_method
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return { success: true, message: response.data.message, orderDetails: response.data };
    } catch (error) {
        console.error("Error updating order:", error);
        return {
            success: false,
            message: error.response?.data?.error || error.message || "Failed to update order",
        };
    }
};


export const deleteOrder = async (orderId) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
        return { success: false, message: "No access token found. Please log in again." };
    }

    try {
        const response = await axios.delete(`${API_URL}orders/${orderId}/delete/`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        return { success: true, message: response.data.message };
    } catch (error) {
        console.error("Error deleting order:", error);
        return {
            success: false,
            message: error.response?.data?.error || error.message || "Failed to delete order",
        };
    }
};
