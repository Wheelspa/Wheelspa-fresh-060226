import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Car, User, Phone, Mail, CheckCircle, MapPin, MessageCircle, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Layout from '../components/layout/Layout';
import { SERVICES as DEFAULT_SERVICES, CAR_BRANDS, BRAND_INFO } from '../data/mock';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Booking = () => {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service: '',
    carBrand: '',
    carModel: '',
    date: null,
    timeSlot: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [errors, setErrors] = useState({});
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    // Load services from localStorage
    const storedServices = localStorage.getItem('wheelspa_services');
    setServices(storedServices ? JSON.parse(storedServices) : DEFAULT_SERVICES);
  }, []);

  // Fetch slots when date changes
  useEffect(() => {
    if (formData.date) {
      fetchSlots(formData.date);
    }
  }, [formData.date]);

  const fetchSlots = async (date) => {
    setLoadingSlots(true);
    try {
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const response = await fetch(`${API_URL}/api/bookings/slots/${formattedDate}`);
      if (response.ok) {
        const data = await response.json();
        setSlots(data.slots);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!formData.service) newErrors.service = 'Please select a service';
    if (!formData.carBrand) newErrors.carBrand = 'Please select car brand';
    if (!formData.carModel.trim()) newErrors.carModel = 'Car model is required';
    if (!formData.date) newErrors.date = 'Please select a date';
    if (!formData.timeSlot) newErrors.timeSlot = 'Please select a time slot';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    // Generate booking ID
    const newBookingId = 'WS-BK-' + Date.now().toString().slice(-8);
    
    // Format date as yyyy-MM-dd for the API
    const formattedDate = formData.date ? 
      `${formData.date.getFullYear()}-${String(formData.date.getMonth() + 1).padStart(2, '0')}-${String(formData.date.getDate()).padStart(2, '0')}` 
      : null;
    
    // Create booking object
    const newBooking = {
      id: newBookingId,
      customerName: formData.name,
      customer_name: formData.name,
      phone: formData.phone,
      email: formData.email || '',
      service: formData.service,
      serviceName: services.find(s => s.id === formData.service)?.name || formData.service,
      carBrand: formData.carBrand,
      carModel: formData.carModel,
      appointmentDate: formattedDate,
      appointment_date: formattedDate,
      timeSlot: formData.timeSlot,
      time_slot: formData.timeSlot,
      notes: formData.notes || '',
      status: 'pending',
      payment_status: 'unpaid',
      createdAt: new Date().toISOString()
    };

    // Save to backend API
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save booking');
      }
    } catch (error) {
      console.error('Error saving to backend:', error);
      // Fallback: Save to localStorage
      const storedBookings = localStorage.getItem('wheelspa_bookings');
      const bookings = storedBookings ? JSON.parse(storedBookings) : [];
      bookings.push(newBooking);
      localStorage.setItem('wheelspa_bookings', JSON.stringify(bookings));
    }
    
    setBookingId(newBookingId);
    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <Layout>
        <section className="min-h-screen pt-32 pb-20 bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="border-0 shadow-xl">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Booking Confirmed!
                </h2>
                <p className="text-green-600 font-semibold mb-4">
                  Booking ID: {bookingId}
                </p>
                <p className="text-gray-600 mb-8">
                  Thank you for choosing Wheelspa. We've received your booking request and will contact you shortly to confirm your appointment.
                </p>
                <div className="bg-gray-50 rounded-xl p-6 text-left mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Booking Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Service:</span>
                      <span className="text-gray-900 font-medium">
                        {services.find(s => s.id === formData.service)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Vehicle:</span>
                      <span className="text-gray-900 font-medium">
                        {formData.carBrand} {formData.carModel}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span className="text-gray-900 font-medium">
                        {formData.date && format(formData.date, 'PPP')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time:</span>
                      <span className="text-gray-900 font-medium">{formData.timeSlot}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a href={`https://wa.me/91${BRAND_INFO.whatsapp}`}>
                    <Button className="bg-green-500 hover:bg-green-600 text-white w-full">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat on WhatsApp
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        name: '', phone: '', email: '', service: '',
                        carBrand: '', carModel: '', date: null, timeSlot: '', notes: ''
                      });
                    }}
                  >
                    Book Another
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 bg-gray-900">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.unsplash.com/photo-1601929862217-f1bf94503333"
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
            Online Booking
          </span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Book Your <span className="text-green-400">Appointment</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Schedule your car care service in just a few clicks. We'll confirm your booking within 24 hours.
          </p>
        </div>
      </section>

      {/* Booking Form */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-0 shadow-xl">
            <CardHeader className="border-b bg-gray-50/50 p-6">
              <CardTitle className="flex items-center space-x-3">
                <Calendar className="h-6 w-6 text-green-500" />
                <span>Book Your Service</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <User className="h-5 w-5 text-green-500 mr-2" />
                    Personal Information
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={`mt-2 ${errors.name ? 'border-red-500' : ''}`}
                        placeholder="Enter your name"
                      />
                      {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className={`mt-2 ${errors.phone ? 'border-red-500' : ''}`}
                        placeholder="Enter phone number"
                      />
                      {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="email">Email Address (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="mt-2"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>
                </div>

                {/* Service Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    Service Selection
                  </h3>
                  <div>
                    <Label>Select Service *</Label>
                    <Select
                      value={formData.service}
                      onValueChange={(value) => handleInputChange('service', value)}
                    >
                      <SelectTrigger className={`mt-2 ${errors.service ? 'border-red-500' : ''}`}>
                        <SelectValue placeholder="Choose a service" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.service && <p className="text-red-500 text-sm mt-1">{errors.service}</p>}
                  </div>
                </div>

                {/* Car Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Car className="h-5 w-5 text-green-500 mr-2" />
                    Car Details
                  </h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label>Car Brand *</Label>
                      <Select
                        value={formData.carBrand}
                        onValueChange={(value) => handleInputChange('carBrand', value)}
                      >
                        <SelectTrigger className={`mt-2 ${errors.carBrand ? 'border-red-500' : ''}`}>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {CAR_BRANDS.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.carBrand && <p className="text-red-500 text-sm mt-1">{errors.carBrand}</p>}
                    </div>
                    <div>
                      <Label htmlFor="carModel">Car Model *</Label>
                      <Input
                        id="carModel"
                        value={formData.carModel}
                        onChange={(e) => handleInputChange('carModel', e.target.value)}
                        className={`mt-2 ${errors.carModel ? 'border-red-500' : ''}`}
                        placeholder="e.g., City, Creta, 3 Series"
                      />
                      {errors.carModel && <p className="text-red-500 text-sm mt-1">{errors.carModel}</p>}
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Clock className="h-5 w-5 text-green-500 mr-2" />
                    Preferred Date & Time
                  </h3>
                  
                  {/* Date Selection */}
                  <div className="mb-6">
                    <Label>Select Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={`w-full mt-2 justify-start text-left font-normal ${
                            !formData.date && 'text-muted-foreground'
                          } ${errors.date ? 'border-red-500' : ''}`}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {formData.date ? format(formData.date, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={formData.date}
                          onSelect={(date) => handleInputChange('date', date)}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
                  </div>

                  {/* Slot Availability Legend */}
                  {formData.date && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Slot Availability:</p>
                      <div className="flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-white border-2 border-gray-300"></div>
                          <span className="text-gray-600">Available</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-yellow-400 border-2 border-yellow-500"></div>
                          <span className="text-gray-600">Booked (Payment Pending)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-green-500 border-2 border-green-600"></div>
                          <span className="text-gray-600">Booked & Paid</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Visual Slot Grid */}
                  {formData.date && (
                    <div className="mb-6">
                      <Label className="mb-3 block">Select Time Slot * <span className="text-gray-500 text-sm">(Tap to select)</span></Label>
                      {loadingSlots ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                          {timeSlots.map((time) => {
                            const slotInfo = slots.find(s => s.time === time);
                            const isBooked = slotInfo && slotInfo.status !== 'available';
                            const isPaid = slotInfo?.status === 'booked_paid';
                            const isUnpaid = slotInfo?.status === 'booked_unpaid';
                            const isSelected = formData.timeSlot === time;
                            
                            return (
                              <button
                                key={time}
                                type="button"
                                disabled={isBooked}
                                onClick={() => !isBooked && handleInputChange('timeSlot', time)}
                                className={`
                                  p-3 rounded-xl border-2 transition-all text-center
                                  ${isSelected 
                                    ? 'bg-green-500 border-green-600 text-white ring-2 ring-green-300' 
                                    : isPaid 
                                      ? 'bg-green-500 border-green-600 text-white cursor-not-allowed opacity-80'
                                      : isUnpaid
                                        ? 'bg-yellow-400 border-yellow-500 text-gray-900 cursor-not-allowed opacity-80'
                                        : 'bg-white border-gray-200 hover:border-green-400 hover:bg-green-50 text-gray-700'
                                  }
                                `}
                              >
                                <div className="flex flex-col items-center gap-1">
                                  {isPaid ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : isUnpaid ? (
                                    <AlertCircle className="h-4 w-4" />
                                  ) : isSelected ? (
                                    <CheckCircle className="h-4 w-4" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-gray-400" />
                                  )}
                                  <span className="font-medium text-sm">{time}</span>
                                  {isBooked && (
                                    <span className="text-xs opacity-75">Booked</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {errors.timeSlot && <p className="text-red-500 text-sm mt-2">{errors.timeSlot}</p>}
                    </div>
                  )}

                  {!formData.date && (
                    <p className="text-gray-500 text-sm italic">Please select a date to see available time slots</p>
                  )}
                </div>

                {/* Additional Notes */}
                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    className="mt-2"
                    placeholder="Any specific requirements or concerns?"
                    rows={3}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-green-500 hover:bg-green-600 text-white flex-1"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Submitting...' : 'Book Appointment'}
                  </Button>
                  <a
                    href={`https://wa.me/91${BRAND_INFO.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      className="w-full border-green-500 text-green-600 hover:bg-green-50"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Book via WhatsApp
                    </Button>
                  </a>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Contact Info Sidebar */}
          <div className="mt-8 grid md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <Phone className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
                <a href={`tel:${BRAND_INFO.phones[0].replace(/-/g, '')}`} className="text-gray-600 hover:text-green-500">
                  {BRAND_INFO.phones[0]}
                </a>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <MessageCircle className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">WhatsApp</h3>
                <span className="text-gray-600">{BRAND_INFO.phones[1]}</span>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-green-500 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Location</h3>
                <span className="text-gray-600 text-sm">Wakad, Pune</span>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Booking;
