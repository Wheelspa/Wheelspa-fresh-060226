import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Shield, Sparkles, Droplets, Car, Lightbulb, Cog, CheckCircle, ArrowRight, Armchair, Atom } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import Layout from '../components/layout/Layout';
import { SERVICES, BRAND_INFO } from '../data/mock';

const iconMap = {
  Shield: Shield,
  Sparkles: Sparkles,
  Droplets: Droplets,
  Car: Car,
  Lightbulb: Lightbulb,
  Cog: Cog,
  Armchair: Armchair,
  Atom: Atom,
};

const Services = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.slice(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gray-900">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.pexels.com/photos/6873180/pexels-photo-6873180.jpeg"
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
              Our Services
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Premium Car Care
              <br />
              <span className="text-green-400">Solutions</span>
            </h1>
            <p className="text-xl text-gray-300">
              From paint protection to interior detailing, we offer comprehensive services to keep your vehicle in pristine condition.
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid Overview */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {SERVICES.map((service) => {
              const Icon = iconMap[service.icon];
              return (
                <a
                  key={service.id}
                  href={`#${service.id}`}
                  className="flex items-center space-x-3 p-4 rounded-xl hover:bg-green-50 transition-colors group"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-500 transition-colors">
                    <Icon className="h-5 w-5 text-green-600 group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                    {service.shortName}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Detailed Services */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-24">
            {SERVICES.map((service, index) => {
              const Icon = iconMap[service.icon];
              const isEven = index % 2 === 0;

              return (
                <div
                  key={service.id}
                  id={service.id}
                  className="scroll-mt-24"
                >
                  <div className={`grid lg:grid-cols-2 gap-12 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}>
                    <div className={isEven ? 'order-1' : 'order-1 lg:order-2'}>
                      <div className="relative">
                        <img
                          src={service.image}
                          alt={service.name}
                          className="rounded-2xl shadow-xl w-full h-80 object-cover"
                        />
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-green-500 text-white">
                            {service.shortName}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className={isEven ? 'order-2' : 'order-2 lg:order-1'}>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                          <Icon className="h-6 w-6 text-green-600" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                          {service.name}
                        </h2>
                      </div>

                      <p className="text-gray-600 leading-relaxed mb-6">
                        {service.description}
                      </p>

                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 mb-3">Benefits</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {service.benefits.map((benefit, i) => (
                            <div key={i} className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{benefit}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mb-8">
                        <h3 className="font-semibold text-gray-900 mb-3">Ideal For</h3>
                        <div className="flex flex-wrap gap-2">
                          {service.suitableFor.map((item, i) => (
                            <Badge key={i} variant="secondary" className="bg-gray-100 text-gray-700">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Link to="/booking">
                          <Button className="bg-green-500 hover:bg-green-600 text-white">
                            Book This Service
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                        <a href={`https://wa.me/91${BRAND_INFO.whatsapp}?text=Hi, I'm interested in ${service.name}`}>
                          <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                            Enquire Now
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center space-x-6">
              <div className="text-center lg:text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  Not Sure Which Service?
                </h2>
                <p className="text-green-100 text-lg">
                  Get a free consultation and we'll recommend the best solution for your car.
                </p>
              </div>
            </div>
            <Link to="/contact">
              <Button size="lg" className="bg-white text-green-600 hover:bg-gray-100 text-lg px-8">
                Get Free Consultation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Services;
