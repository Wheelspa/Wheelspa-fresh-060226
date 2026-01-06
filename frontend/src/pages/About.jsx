import React from 'react';
import { Target, Eye, Quote, CheckCircle, Users, Award, Building, Sparkles } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import Layout from '../components/layout/Layout';
import { BRAND_INFO, ABOUT_CONTENT, STATS } from '../data/mock';

const About = () => {
  const values = [
    { icon: Sparkles, title: 'Quality First', description: 'We never compromise on the quality of our products or services.' },
    { icon: Users, title: 'Customer Focus', description: 'Your satisfaction is our top priority. We go above and beyond.' },
    { icon: Award, title: 'Excellence', description: 'Striving for perfection in every detail, every time.' },
    { icon: Building, title: 'Innovation', description: 'Staying ahead with the latest technology and techniques.' },
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
              About Wheelspa
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Pune's Premier
              <br />
              <span className="text-green-400">Car Care Destination</span>
            </h1>
            <p className="text-xl text-gray-300">
              Where passion meets precision. Discover the story behind Pune's most trusted car care brand.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-green-500 font-medium">Our Story</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                From Passion to Excellence
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {ABOUT_CONTENT.story}
              </p>
              <p className="text-gray-600 leading-relaxed">
                What started as a passion for automobiles has evolved into a comprehensive car care facility equipped with cutting-edge technology and staffed by certified professionals. Every vehicle that comes through our doors receives the same meticulous attention to detail, regardless of make or model.
              </p>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/6873123/pexels-photo-6873123.jpeg"
                alt="Wheelspa Facility"
                className="rounded-2xl shadow-xl"
              />
              <div className="absolute -bottom-6 -right-6 hidden lg:block">
                <img
                  src={BRAND_INFO.mascot}
                  alt="Wheelspa Mascot"
                  className="h-48 w-auto drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <Eye className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h3>
                <p className="text-gray-600 leading-relaxed">
                  {ABOUT_CONTENT.vision}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <Target className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h3>
                <p className="text-gray-600 leading-relaxed">
                  {ABOUT_CONTENT.mission}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Founder's Message */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Quote className="h-16 w-16 text-green-500 mx-auto mb-8 opacity-50" />
            <blockquote className="text-2xl md:text-3xl text-white font-light leading-relaxed mb-8">
              "{ABOUT_CONTENT.founderMessage}"
            </blockquote>
            <div className="flex items-center justify-center space-x-4">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">WS</span>
              </div>
              <div className="text-left">
                <div className="text-white font-semibold">Wheelspa Team</div>
                <div className="text-gray-400">Founder & CEO</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-green-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-green-100">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-green-500 font-medium">Our Values</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
              What Drives Us
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <div key={index} className="text-center group">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-green-100 transition-colors">
                  <value.icon className="h-8 w-8 text-gray-600 group-hover:text-green-600 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <img
                src="https://images.unsplash.com/photo-1580679568899-be51739ba2df"
                alt="Premium Service"
                className="rounded-2xl shadow-xl"
              />
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-green-500 font-medium">Why We're Different</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
                Not Your Average Car Wash
              </h2>
              <p className="text-gray-600 mb-8">
                Unlike local car washes that use harsh chemicals and abrasive techniques, Wheelspa employs world-class detailing methods that protect and enhance your vehicle.
              </p>
              <ul className="space-y-4">
                {[
                  'Climate-controlled, dust-free environment',
                  'Internationally certified premium products',
                  'Factory-trained technicians',
                  'Comprehensive warranties on all services',
                  'Post-service follow-up and support',
                  'Pickup & drop service available'
                ].map((item, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Future Plans */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-green-400 font-medium">Looking Ahead</span>
            <h2 className="text-3xl md:text-4xl font-bold text-white mt-2 mb-6">
              Expansion & Franchise Opportunities
            </h2>
            <p className="text-gray-300 leading-relaxed mb-8">
              We're on a mission to bring premium car care to every corner of India. With plans to expand our footprint through company-owned centers and franchise partnerships, we're looking for passionate individuals who share our vision for automotive excellence.
            </p>
            <p className="text-gray-400">
              Interested in partnering with us? Contact us to learn about franchise opportunities.
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
