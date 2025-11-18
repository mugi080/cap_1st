import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/";

// Fetch all categories
export const getCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}custom-categories/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error.message);
    return [];
  }
};

// Fetch all beverages
export const getBeverages = async () => {
  try {
    const response = await axios.get(`${API_URL}custom-beverages/`);
    return response.data;
  } catch (error) {
    console.error("Error fetching beverages:", error.message);
    return [];
  }
};

// Fetch beverage by ID
export const getBeverageById = async (id) => {
    try {
      const response = await axios.get(`${API_URL}custom-beverages/${id}/`);
      return response.data;
    } catch (error) {
      console.error("Error fetching beverage by ID:", error.message);
      throw new Error("Product not found.");
    }
  };
