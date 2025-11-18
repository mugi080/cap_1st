// src/api/Auth.jsx
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/auth"; // Adjusted to use correct Djoser routes
// Auth.jsx
// Register User

// Register User
export const registerUser = async (
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    address,
    middleName
  ) => {
    try {
      const response = await axios.post(`${BASE_URL}/users/`, {
        email,
        password,
        re_password: password, // Optional if required by your backend
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        contact_number: phoneNumber, // Make sure this matches the field in serializer
        address: address,
      });
  
      return {
        success: true,
        message: "Registration successful. Please check your email to activate your account.",
      };
    } catch (error) {
      const message =
        error.response?.data?.email?.[0] ||
        error.response?.data?.password?.[0] ||
        error.response?.data?.non_field_errors?.[0] ||
        "Registration failed.";
      return { success: false, message };
    }
  };
  
  // Register Admin (requires authentication)
// Updated registerAdmin function in src/api/Auth.jsx
export const registerAdmin = async (
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    address
  ) => {
    try {
      const response = await axios.post(`${BASE_URL}/users/`, {
        email: email,
        password: password,
        re_password: password,
        first_name: firstName,
        last_name: lastName,
        contact_number: phoneNumber,
        address: address,
        is_admin: true,
      });
  
      return {
        success: true,
        message: "Admin registration successful.",
        data: response.data,
      };
    } catch (error) {
      const message =
        error.response?.data?.email?.[0] ||
        error.response?.data?.password?.[0] ||
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.detail ||
        "Admin registration failed.";
      return { success: false, message };
    }
  };
  
  
  
  

// Login User
// Login User
// Login User// src/api/Auth.jsx
export const loginUser = async (email, password) => {
    try {
      const response = await axios.post(`${BASE_URL}/jwt/create/`, {
        email,
        password,
      });
  
      const { access, refresh } = response.data;
      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);
  
      // Fetch user info after login
      const userResponse = await axios.get(`${BASE_URL}/users/me/`, {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });
  
      const user = userResponse.data;
      localStorage.setItem("user_data", JSON.stringify(user));  // Store user info as well
  
      // Check if is_staff or is_superuser (for admin login) and handle accordingly
      if (user.is_staff || user.is_superuser) {
        return {
          success: true,
          message: "Admin login successful",
          token: access,
          user: user,
        };
      } else {
        return {
          success: true,
          message: "User login successful", // This can be customized
          token: access,
          user: user,
        };
      }
    } catch (error) {
      const message =
        error.response?.data?.detail || "Login failed. Please try again.";
      return { success: false, message };
    }
  };
  

// Get current user info (for /auth/users/me/)
export const getCurrentUser = async () => {
  const token = localStorage.getItem("access");

  if (!token) {
    return { success: false, message: "Not authenticated" };
  }

  try {
    const response = await axios.get(`${BASE_URL}/users/me/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, message: "Failed to fetch user." };
  }
};

// Forgot Password - Send Reset Email
export const sendPasswordResetEmail = async (email) => {
  try {
    await axios.post(`${BASE_URL}/users/reset_password/`, { email });
    return { success: true, message: "Password reset link sent to your email." };
  } catch (error) {
    const msg = error.response?.data?.email?.[0] || "Failed to send reset link.";
    return { success: false, message: msg };
  }
};

// Resend Activation Email
export const resendActivationEmail = async (email) => {
  try {
    await axios.post(`${BASE_URL}/users/resend_activation/`, { email });
    return { success: true, message: "Activation email resent." };
  } catch (error) {
    const msg =
      error.response?.data?.email?.[0] || "Failed to resend activation email.";
    return { success: false, message: msg };
  }
};

// Refresh token
export const refreshToken = async () => {
  const refresh = localStorage.getItem("refresh");
  if (!refresh) return null;

  try {
    const response = await axios.post(`${BASE_URL}/jwt/refresh/`, {
      refresh,
    });

    const { access } = response.data;
    localStorage.setItem("access", access);
    return access;
  } catch (error) {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    return null;
  }
};

// Logout
export const logoutUser = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
};
