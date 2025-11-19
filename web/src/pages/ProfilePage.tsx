import React from "react";
import { User, Mail, Shield, Building, Briefcase } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.tsx";

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600 mt-1">Manage your account information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-6">
          <div className="h-24 w-24 rounded-full bg-blue-500 flex items-center justify-center">
            <span className="text-3xl font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.email}</p>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${
                user.role === "admin"
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Personal Information
          </h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Full Name</p>
                <p className="text-gray-900">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center">
              <Mail className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Email Address
                </p>
                <p className="text-gray-900">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center">
              <Shield className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Role</p>
                <p className="text-gray-900 capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Work Information
          </h3>

          <div className="space-y-4">
            <div className="flex items-center">
              <Building className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="text-gray-900">
                  {user.department || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <Briefcase className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Position</p>
                <p className="text-gray-900">
                  {user.position || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <div
                className={`h-3 w-3 rounded-full mr-3 ${
                  user.isActive ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-gray-900">
                  {user.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions (limited on web) */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="pt-2">
          <button
            onClick={logout}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          System Information
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-500">User ID</p>
            <p className="text-gray-900 font-mono">{user._id}</p>
          </div>

          <div>
            <p className="font-medium text-gray-500">Account Type</p>
            <p className="text-gray-900">Web Application</p>
          </div>

          <div>
            <p className="font-medium text-gray-500">Last Login</p>
            <p className="text-gray-900">Just now</p>
          </div>

          <div>
            <p className="font-medium text-gray-500">Platform</p>
            <p className="text-gray-900">TeamSync Web</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
