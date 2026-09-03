import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, MessageCircle } from 'lucide-react';
import { BRAND_INFO, SERVICES } from '../../data/mock';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="space-y-6">
            <img
              src={BRAND_INFO.logo}
              alt="Wheelspa Logo"
              className="h-16 w-auto"
            />
            <p className="text-sm leading-relaxed">
              Premium car care and detailing services in Pune. We pamper your car with
              the finest products and expert craftsmanship.
            </p>
            <div className="flex space-x-4">
              <a
                href={BRAND_INFO.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-green-500 transition-colors text-white"
              >
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
                  className="h-5 w-5"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link to="/" className="hover:text-green-400 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-green-400 transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-green-400 transition-colors">Services</Link>
              </li>
              <li>
                <Link to="/booking" className="hover:text-green-400 transition-colors">Book Appointment</Link>
              </li>
              <li>
                <Link to="/knowledge" className="hover:text-green-400 transition-colors">Knowledge Center</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-green-400 transition-colors">Contact Us</Link>
              </li>
              <li className="pt-2 border-t border-gray-700">
                <Link to="/admin" className="hover:text-green-400 transition-colors flex items-center">
                  <span className="mr-2">🔐</span> Admin Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6">Our Services</h3>
            <ul className="space-y-3">
              {SERVICES.slice(0, 6).map((service) => (
                <li key={service.id}>
                  <Link
                    to={`/services#${service.id}`}
                    className="hover:text-green-400 transition-colors"
                  >
                    {service.shortName}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-6">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{BRAND_INFO.address}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-green-500 flex-shrink-0" />
                <div className="text-sm">
                  <a href={`tel:${BRAND_INFO.phones[0].replace(/-/g, '')}`} className="hover:text-green-400 block">
                    {BRAND_INFO.phones[0]}
                  </a>
                  <a href={`tel:${BRAND_INFO.phones[1].replace(/-/g, '')}`} className="hover:text-green-400 block">
                    {BRAND_INFO.phones[1]}
                  </a>
                </div>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-green-500 flex-shrink-0" />
                <a href={`mailto:${BRAND_INFO.email}`} className="text-sm hover:text-green-400">
                  {BRAND_INFO.email}
                </a>
              </li>
              <li className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p>Mon-Fri: {BRAND_INFO.businessHours.weekdays}</p>
                  <p>Sat-Sun: {BRAND_INFO.businessHours.weekends}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Wheelspa. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>Premium Car Care & Detailing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/91${BRAND_INFO.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 hover:scale-110 transition-all duration-300"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </footer>
  );
};

export default Footer;
