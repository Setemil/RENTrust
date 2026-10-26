import "@fontsource-variable/overpass";
import "@fontsource-variable/montserrat";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import App from "./App";
import { AppLayout, GuestLayout } from "./app/AppShell";
import { AuthProvider } from "./app/auth";
import { AdminAudit, AdminInterests, AdminLayout, AdminListings, AdminUsers, PeopleChecks, PropertyChecks } from "./app/pages/Admin";
import { EnquiryDetail, EnquiryList } from "./app/pages/Enquiries";
import Home from "./app/pages/Home";
import { InterestDetail, InterestList } from "./app/pages/Interests";
import ListingDetail from "./app/pages/ListingDetail";
import Listings from "./app/pages/Listings";
import Login from "./app/pages/Login";
import Notifications from "./app/pages/Notifications";
import Profile from "./app/pages/Profile";
import { PropertyDetail, PropertyList } from "./app/pages/Properties";
import { EditProperty, NewProperty } from "./app/pages/PropertyForm";
import Signup from "./app/pages/Signup";
import RequireRole from "./app/RequireRole";
import "./styles/tokens.css";
import "./styles/base.css";

const lister = (el: React.ReactNode) => <RequireRole roles={["LANDLORD", "AGENT"]}>{el}</RequireRole>;
const renter = (el: React.ReactNode) => <RequireRole roles={["SEEKER"]}>{el}</RequireRole>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route element={<GuestLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Route>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="profile" element={<Profile />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="listings" element={<Listings />} />
            <Route path="listings/saved" element={<Listings savedOnly key="saved" />} />
            <Route path="listings/:id" element={<ListingDetail />} />
            <Route path="interests" element={renter(<InterestList />)} />
            <Route path="interests/:id" element={renter(<InterestDetail />)} />
            <Route path="properties" element={lister(<PropertyList />)} />
            <Route path="properties/new" element={lister(<NewProperty />)} />
            <Route path="properties/:id" element={lister(<PropertyDetail />)} />
            <Route path="properties/:id/edit" element={lister(<EditProperty />)} />
            <Route path="enquiries" element={lister(<EnquiryList />)} />
            <Route path="enquiries/:id" element={<RequireRole roles={["LANDLORD", "AGENT", "ADMIN"]}><EnquiryDetail /></RequireRole>} />
            <Route path="admin" element={<RequireRole roles={["ADMIN"]}><AdminLayout /></RequireRole>}>
              <Route index element={<PeopleChecks />} />
              <Route path="properties" element={<PropertyChecks />} />
              <Route path="listings" element={<AdminListings />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="interests" element={<AdminInterests />} />
              <Route path="audit" element={<AdminAudit />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
