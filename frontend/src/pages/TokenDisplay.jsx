import React, { useState, useEffect } from 'react';
import { Car, Clock, CheckCircle, PlayCircle, Users, RefreshCw } from 'lucide-react';
import { BRAND_INFO } from '../data/mock';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TokenDisplay = () => {
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchTokens();
    // Refresh every 5 seconds
    const interval = setInterval(fetchTokens, 5000);
    // Update time every second
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch(`${API_URL}/api/tokens/display`);
      if (response.ok) {
        const data = await response.json();
        setDisplayData(data);
      }
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src={BRAND_INFO.logo} 
              alt="Wheelspa" 
              className="h-16 w-auto"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">WHEELSPA</h1>
              <p className="text-green-400 text-sm">Premium Car Detailing</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-green-400 font-mono">{formatTime(currentTime)}</p>
            <p className="text-gray-400">{formatDate(currentTime)}</p>
          </div>
        </div>
      </header>

      <div className="p-8">
        <div className="grid lg:grid-cols-3 gap-8 h-[calc(100vh-180px)]">
          
          {/* Current Token - Large Display */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-3xl border border-green-500/30 h-full flex flex-col">
              <div className="p-6 border-b border-green-500/30">
                <h2 className="text-2xl font-bold text-green-400 flex items-center gap-3">
                  <PlayCircle className="h-8 w-8" />
                  NOW SERVING
                </h2>
              </div>
              
              <div className="flex-1 flex items-center justify-center p-8">
                {displayData?.current_token ? (
                  <div className="text-center">
                    <div className="mb-6">
                      <span className="text-[180px] font-bold text-green-400 leading-none drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]">
                        {displayData.current_token.token_display}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <p className="text-4xl text-white font-semibold">
                        {displayData.current_token.customerName || displayData.current_token.customer_name}
                      </p>
                      <div className="flex items-center justify-center gap-4 text-2xl text-gray-300">
                        <Car className="h-8 w-8 text-green-400" />
                        <span>{displayData.current_token.carNumber || displayData.current_token.car_number}</span>
                      </div>
                      <p className="text-xl text-green-400">
                        {displayData.current_token.serviceType || displayData.current_token.service_type || 'Car Detailing'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <Car className="h-32 w-32 text-gray-600 mx-auto mb-6" />
                    <p className="text-4xl text-gray-500">No Active Token</p>
                    <p className="text-xl text-gray-600 mt-2">Waiting for next customer</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Queue & Stats */}
          <div className="flex flex-col gap-6">
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-yellow-500/20 rounded-2xl p-4 border border-yellow-500/30 text-center">
                <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-yellow-400">{displayData?.waiting_count || 0}</p>
                <p className="text-sm text-yellow-300">Waiting</p>
              </div>
              <div className="bg-blue-500/20 rounded-2xl p-4 border border-blue-500/30 text-center">
                <PlayCircle className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-blue-400">{displayData?.in_progress_count || 0}</p>
                <p className="text-sm text-blue-300">In Progress</p>
              </div>
              <div className="bg-green-500/20 rounded-2xl p-4 border border-green-500/30 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-400">{displayData?.completed_count || 0}</p>
                <p className="text-sm text-green-300">Completed</p>
              </div>
            </div>

            {/* Waiting Queue */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 flex-1 overflow-hidden">
              <div className="p-4 border-b border-gray-700 bg-gray-800/80">
                <h3 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
                  <Users className="h-6 w-6" />
                  WAITING QUEUE
                </h3>
              </div>
              <div className="p-4 overflow-y-auto max-h-[400px]">
                {displayData?.waiting && displayData.waiting.length > 0 ? (
                  <div className="space-y-3">
                    {displayData.waiting.map((token, index) => (
                      <div 
                        key={token.id}
                        className={`flex items-center justify-between p-4 rounded-xl ${
                          index === 0 
                            ? 'bg-yellow-500/20 border-2 border-yellow-500/50' 
                            : 'bg-gray-700/50 border border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`text-3xl font-bold ${
                            index === 0 ? 'text-yellow-400' : 'text-gray-300'
                          }`}>
                            {token.token_display}
                          </span>
                          <div>
                            <p className="text-white font-medium">
                              {token.customerName || token.customer_name}
                            </p>
                            <p className="text-sm text-gray-400">
                              {token.carNumber || token.car_number}
                            </p>
                          </div>
                        </div>
                        {index === 0 && (
                          <span className="px-3 py-1 bg-yellow-500 text-black text-sm font-bold rounded-full animate-pulse">
                            NEXT
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No customers waiting</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recently Completed */}
            {displayData?.completed && displayData.completed.length > 0 && (
              <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-4">
                <h3 className="text-lg font-bold text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  RECENTLY COMPLETED
                </h3>
                <div className="flex flex-wrap gap-2">
                  {displayData.completed.slice(-5).reverse().map((token) => (
                    <span 
                      key={token.id}
                      className="px-3 py-2 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-bold"
                    >
                      {token.token_display}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-gray-700 px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Auto-refreshing every 5 seconds</span>
          </div>
          <p className="text-gray-500 text-sm">
            Total Tokens Today: <span className="text-green-400 font-bold">{displayData?.total_today || 0}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenDisplay;
