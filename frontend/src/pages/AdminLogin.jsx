import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Car, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAdminAuth } from '../context/AdminAuthContext';
import { BRAND_INFO } from '../data/mock';

const AdminLogin = () => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAdminAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = login(adminId, password);
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.error);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={BRAND_INFO.logo}
            alt="Wheelspa Logo"
            className="h-20 w-auto mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-gray-400 mt-2">Vehicle Entry Management System</p>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl flex items-center justify-center space-x-2">
              <Lock className="h-5 w-5 text-green-500" />
              <span>Admin Login</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="adminId">Admin ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="adminId"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    className="pl-10"
                    placeholder="Enter Admin ID"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Enter Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-green-500 hover:bg-green-600 text-white"
                disabled={isLoading}
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t text-center">
              <div className="flex items-center justify-center space-x-2 text-gray-500 text-sm">
                <Car className="h-4 w-4" />
                <span>Wheelspa Admin System</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-gray-500 text-sm mt-6">
          © {new Date().getFullYear()} Wheelspa. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
