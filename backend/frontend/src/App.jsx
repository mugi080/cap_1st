import React from "react";
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useLocation, 
  Navigate,
  useNavigate
} from "react-router-dom";

// User Pages
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import About from "./pages/About";
import Reviews from "./pages/Reviews";
import Contact from "./pages/Contact";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetails";
import OrderingPage from "./pages/ordering/OrderingPage";
import Order from "./pages/ordering/OrderView";
import RegisterForm from "./components/register/RegisterForm";
import LoginForm from "./components/register/LoginForm";
import Activate from "./components/user/Activate";
import ForgotPassword from "./components/user/ForgotPassword";
import ResetPasswordConfirm from "./components/user/ResetPasswordConfirm";
import UserProfile from "./components/user/UserProfile";
import Navbar from "./components/navbar/NavBar";
import CheckoutForm from "./pages/ordering/CheckoutForm";
import OrderHistory from "./pages/ordering/OrderHistory";
// Role Request
import RoleRequestForm from "./components/user/RoleRequestForm";
import AdminRoleRequests from "./components/user/AdminRoleRequests";

// Admin Pages
import AdminLogin from "./admin/AdminLogin";   
import AdminProfile from "./admin/adminPages/AdminProfile"; 
import AdminDashboard from "./admin/adminPages/AdminDashboard";
import AdminNavbar from "./admin/components/AdminNavbar";
import AdminSidebar from "./admin/components/AdminSidebar";
import AdminOrders from "./admin/adminPages/AdminOrders";
import Inventory from "./admin/adminPages/Inventory";
import CreateOrderForm from "./admin/adminPages/CreateOrderForm";
import AdminOrderHistory from "./admin/adminPages/AdminOrderHistory";

import VehicleTable from "./admin/adminPages/VehicleTable";
import Logistics from "./admin/adminPages/Logistic";

import CustomUserTable from "./admin/adminPages/CustomUserTable";

import SelectedItems from "./admin/adminPages/SelectedItems";
import OrderDetailsForm from "./admin/adminPages/OrderDetailsForm";

import OrderDetails from "./admin/adminPages/OrderDetails";
import AdminReviews from "./admin/adminPages/AdminReviews";

import OrderReview from "./admin/adminPages/OrderReview";

import TryAnalytics from "./admin/adminPages/TryAnalytics";
import Drivers from "./admin/adminPages/Drivers";
// Staff Pages
import StaffLogin from "./staff/StaffLogin";
import StaffDashboard from "./staff/staffPages/StaffDashboard";
import MyDelivery from "./staff/staffPages/MyDelivery";
import NewTask from "./staff/staffPages/NewTask";
import StaffProfile from "./staff/staffPages/StaffProfile";
import DownloadReports from "./admin/adminPages/downloadReports";
import StaffOrderDetails from "./staff/staffPages/OrderDetails";

// Styles
import "./App.css";

// Admin Protected Route Component
function AdminProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("admin_token"); // Adjust the key name as per your app

  // If on login page, don't block
  if (location.pathname === "/admin/login") {
    return children;
  }

  // If no token, alert and redirect to login
  if (!token) {
    alert("You are not an admin");
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function AppRoutes() {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith("/admin");
  const isStaffPath = location.pathname.startsWith("/staff");

  return (
    <>
      {isAdminPath ? (
        <AdminProtectedRoute>
          <>
            {location.pathname !== "/admin/login" && <AdminNavbar />}
            <div className="admin-layout">
              {location.pathname !== "/admin/login" && <AdminSidebar />}
              <div className="admin-content">
                <Routes>
                  <Route path="/admin/login" element={<AdminLogin />} />
                  
                <Route path="/admin/profile" element={<AdminProfile />} />

                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/orders" element={<AdminOrders />} />
                  <Route path="/admin/role-request" element={<AdminRoleRequests />} />
                  <Route path="/admin/inventory" element={<Inventory />} />
                  <Route path="/admin/orders/create-order" element={<CreateOrderForm />} />
                  <Route path="/admin/vehicles" element={<VehicleTable />} />
                  <Route path="/admin/logistics" element={<Logistics />} />
                  <Route path="/admin/custom-users" element={<CustomUserTable />} />
                  <Route path="/admin/order-history" element={<AdminOrderHistory />} />
                  <Route path="/admin/order-details" element={<OrderDetailsForm />} />
                  <Route path="/admin/select-items" element={<SelectedItems />} />
                  <Route path="/admin/order-details/:id" element={<OrderDetails />} />
                
                    <Route path="/admin/reviews" element={<AdminReviews />} />
                    <Route path="/admin/order-reviews" element={<OrderReview />} />
                    
                    <Route path="/admin/download-reports" element={<DownloadReports />} />
                    <Route path="/admin/analytics" element={<TryAnalytics />} />
                    <Route path="/admin/drivers" element={<Drivers />} />
            </Routes>
              </div>
            </div>
          </>
        </AdminProtectedRoute>
      ) : isStaffPath ? (
        <>
          <div className="staff-layout">
            <div className="staff-content">
              <Routes>
                <Route path="/staff/login" element={<StaffLogin />} />
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
                <Route path="/staff/deliveries" element={<MyDelivery />} />
                <Route path="/staff/new-task" element={<NewTask />} />
                
                <Route path="/staff/profile" element={<StaffProfile />} />
                <Route path="/staff/order-details/:id" element={<StaffOrderDetails />} />
                {/* Add other staff-specific routes here */}
              </Routes>
            </div>
          </div>
        </>
      ) : (
        <>
          <Navbar />
          <div className="container">
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route path="/shop_now" element={<OrderingPage />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product-detail/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<CheckoutForm />} />
              <Route path="/orders" element={<Order />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/activate/:uid/:token" element={<Activate />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/password/reset/confirm/:uid/:token/" element={<ResetPasswordConfirm />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/request-role" element={<RoleRequestForm />} />

                <Route path="/order-history" element={<OrderHistory />} />
            </Routes>
          </div>
        </>
      )}
    </>
  );
}

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
