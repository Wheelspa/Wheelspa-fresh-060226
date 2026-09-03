import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, MessageCircle, Send, Building, CheckCircle } from 'lucide-react';

const FacebookIcon = ({ className = "h-5 w-5", ...props }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import Layout from '../components/layout/Layout';
import BookingQRCode from '../components/BookingQRCode';
import { BRAND_INFO } from '../data/mock';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: '',
    enquiryType: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          enquiry_type: formData.enquiryType,
          subject: formData.subject,
          message: formData.message
        })
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.detail || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact submission error:', error);
      toast.error('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = [
    {
      icon: Phone,
      title: 'Phone',
      details: [
        { label: BRAND_INFO.phones[0], href: `tel:${BRAND_INFO.phones[0].replace(/-/g, '')}` },
        { label: BRAND_INFO.phones[1], href: `tel:${BRAND_INFO.phones[1].replace(/-/g, '')}` }
      ]
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      details: [
        { label: 'Chat with us', href: `https://wa.me/91${BRAND_INFO.whatsapp}`, external: true }
      ]
    },
    {
      icon: Mail,
      title: 'Email',
      details: [
        { label: BRAND_INFO.email, href: `mailto:${BRAND_INFO.email}` }
      ]
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: [
        { label: `Mon-Fri: ${BRAND_INFO.businessHours.weekdays}` },
        { label: `Sat-Sun: ${BRAND_INFO.businessHours.weekends}` }
      ]
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gray-900">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.pexels.com/photos/3764984/pexels-photo-3764984.jpeg"
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
              Contact Us
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Get in <span className="text-green-400">Touch</span>
            </h1>
            <p className="text-xl text-gray-300">
              Have questions or ready to book? We're here to help you pamper your car.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                    <info.icon className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-3">{info.title}</h3>
                  <div className="space-y-1">
                    {info.details.map((detail, i) => (
                      detail.href ? (
                        <a
                          key={i}
                          href={detail.href}
                          target={detail.external ? '_blank' : undefined}
                          rel={detail.external ? 'noopener noreferrer' : undefined}
                          className="block text-gray-600 hover:text-green-500 transition-colors"
                        >
                          {detail.label}
                        </a>
                      ) : (
                        <p key={i} className="text-gray-600 text-sm">{detail.label}</p>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Send us a Message</h2>
              <p className="text-gray-600 mb-8">Fill out the form and we'll get back to you within 24 hours.</p>

              {isSubmitted ? (
                <Card className="border-0 shadow-xl">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                    <p className="text-gray-600 mb-6">
                      Thank you for reaching out. We'll respond to your enquiry shortly.
                    </p>
                    <Button
                      onClick={() => {
                        setIsSubmitted(false);
                        setFormData({ name: '', phone: '', email: '', subject: '', message: '', enquiryType: '' });
                      }}
                      variant="outline"
                    >
                      Send Another Message
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-0 shadow-xl">
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="name">Full Name *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="mt-2"
                            placeholder="Your name"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="mt-2"
                            placeholder="Your phone"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="mt-2"
                          placeholder="Your email"
                        />
                      </div>

                      <div>
                        <Label>Enquiry Type</Label>
                        <Select
                          value={formData.enquiryType}
                          onValueChange={(value) => handleInputChange('enquiryType', value)}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select enquiry type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General Enquiry</SelectItem>
                            <SelectItem value="service">Service Enquiry</SelectItem>
                            <SelectItem value="booking">Booking Related</SelectItem>
                            <SelectItem value="franchise">Franchise / Dealership</SelectItem>
                            <SelectItem value="feedback">Feedback / Complaint</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={formData.subject}
                          onChange={(e) => handleInputChange('subject', e.target.value)}
                          className="mt-2"
                          placeholder="What is this about?"
                        />
                      </div>

                      <div>
                        <Label htmlFor="message">Message *</Label>
                        <Textarea
                          id="message"
                          value={formData.message}
                          onChange={(e) => handleInputChange('message', e.target.value)}
                          className="mt-2"
                          placeholder="Your message..."
                          rows={5}
                          required
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Sending...' : (
                          <>
                            Send Message
                            <Send className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Map & Address */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Visit Us</h2>
              <p className="text-gray-600 mb-8">Come see our state-of-the-art facility in person.</p>

              <Card className="border-0 shadow-xl overflow-hidden mb-6">
                <div className="h-80">
                  <iframe
                    src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3781.8!2d${BRAND_INFO.coordinates.lng}!3d${BRAND_INFO.coordinates.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMTjCsDM2JzA5LjkiTiA3M8KwNDYnMTIuNCJF!5e0!3m2!1sen!2sin!4v1699999999999!5m2!1sen!2sin`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Wheelspa Location"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Wheelspa - Wakad</h3>
                      <p className="text-gray-600">{BRAND_INFO.address}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Social Links */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Follow Us</h3>
                  <div className="flex space-x-4">
                    <a
                      href={BRAND_INFO.social.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
                    >
                      <FacebookIcon className="h-5 w-5" />
                    </a>
                  </div>
                </CardContent>
              </Card>

              {/* QR Code for Booking */}
              <div className="mt-6">
                <BookingQRCode size={180} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Franchise Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-green-400 font-medium">Business Opportunity</span>
              <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-6">
                Franchise & Dealership Enquiries
              </h2>
              <p className="text-gray-300 mb-6 leading-relaxed">
                Interested in bringing premium car care to your city? Wheelspa is expanding and looking for passionate partners who share our commitment to excellence.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Proven business model with strong ROI',
                  'Comprehensive training and support',
                  'Premium brand recognition',
                  'Exclusive territory rights'
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
              <a href={`mailto:${BRAND_INFO.email}?subject=Franchise Enquiry`}>
                <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white">
                  <Building className="mr-2 h-5 w-5" />
                  Enquire About Franchise
                </Button>
              </a>
            </div>
            <div className="relative hidden lg:block">
              <img
                src="https://images.pexels.com/photos/3764984/pexels-photo-3764984.jpeg"
                alt="Premium Car"
                className="rounded-2xl shadow-2xl h-80 w-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Quick CTA */}
      <section className="py-12 bg-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-white mb-2">Ready to get started?</h2>
              <p className="text-green-100">Book your appointment now or chat with us on WhatsApp.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={`https://wa.me/91${BRAND_INFO.whatsapp}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  WhatsApp Us
                </Button>
              </a>
              <a href={`tel:${BRAND_INFO.phones[0].replace(/-/g, '')}`}>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                  <Phone className="mr-2 h-5 w-5" />
                  Call Now
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Contact;
