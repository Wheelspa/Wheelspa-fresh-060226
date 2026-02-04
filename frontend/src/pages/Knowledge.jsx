import React, { useState } from 'react';
import { BookOpen, Clock, Tag, ChevronDown, ChevronUp, Search, ArrowRight, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import Layout from '../components/layout/Layout';
import { BLOG_POSTS, FAQS, BRAND_INFO } from '../data/mock';

const Knowledge = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);

  const categories = ['All', 'Guides', 'Tips', 'Education', 'FAQ'];

  const filteredPosts = BLOG_POSTS.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'All' || post.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Article content for the detail view
  const articleContent = {
    1: `Understanding the key differences between Paint Protection Film and Ceramic Coating is crucial for making the right choice for your vehicle.

**Paint Protection Film (PPF)**
PPF is a transparent, self-healing film that provides physical protection against stone chips, scratches, and road debris. It's ideal for high-impact areas like the front bumper, hood, and side mirrors.

Key Benefits:
• Self-healing technology repairs minor scratches with heat
• Physical barrier against stone chips and debris
• 7-10 years of protection
• Invisible when properly installed

**Ceramic Coating**
Ceramic coating is a liquid polymer that chemically bonds to your car's paint, creating a hydrophobic surface that repels water and contaminants.

Key Benefits:
• Enhanced gloss and shine
• Hydrophobic properties make cleaning easier
• Protection against UV rays and oxidation
• 3-5 years of protection

**Which One Should You Choose?**
For maximum protection, many car enthusiasts opt for both - PPF on high-impact areas and ceramic coating over the entire vehicle. This combination provides the best of both worlds: physical protection and chemical resistance.

Contact Wheelspa for a personalized recommendation based on your driving conditions and budget.`,
    
    2: `The Indian summer can be brutal on your car. Here are essential tips to keep your vehicle protected:

**1. Park Smart**
Always try to park in shaded areas or use a car cover. Prolonged sun exposure can fade paint and damage interior materials.

**2. Wax Regularly**
Apply a quality wax or sealant every 3-4 months. This creates a protective barrier against UV rays and environmental contaminants.

**3. Interior Protection**
Use sunshades on windshields and tinted windows to protect dashboard and seats from cracking and fading.

**4. Check Your Coolant**
Ensure your cooling system is working properly. Summer is when most overheating issues occur.

**5. Tire Care**
Hot roads can cause tire blowouts. Check tire pressure regularly as it fluctuates with temperature changes.

For professional summer car care, visit Wheelspa for ceramic coating and PPF that provide excellent UV protection.`,
    
    3: `Graphene coatings are the newest innovation in automotive protection. But do they live up to the hype?

**What is Graphene?**
Graphene is a single layer of carbon atoms arranged in a hexagonal lattice. It's incredibly strong, lightweight, and has excellent thermal conductivity.

**Benefits Over Ceramic**
• Better heat dissipation - reduces water spotting
• Anti-static properties - repels dust
• Increased durability
• Superior scratch resistance

**The Reality**
While graphene coatings offer improvements over traditional ceramic, the differences are incremental rather than revolutionary. They cost more but provide marginally better performance.

**Our Recommendation**
For most vehicles, a high-quality ceramic coating provides excellent protection. Graphene is worth considering for:
• High-end luxury vehicles
• Cars in extremely hot climates
• Show cars requiring the absolute best finish

At Wheelspa, we offer both options and can help you decide which is right for your vehicle.`,
    
    4: `Finding the perfect wash frequency depends on several factors:

**Daily Drivers in Urban Areas**
Wash every 1-2 weeks. City pollution, bird droppings, and road grime accumulate quickly.

**Highway Commuters**
Wash every 2-3 weeks. Highway driving means more bug splatter and tar spots.

**Garaged Vehicles**
Wash every 3-4 weeks or as needed. Less exposure means less frequent washing required.

**Coated Vehicles (Ceramic/Graphene)**
The hydrophobic properties mean dirt doesn't stick as easily. Washing every 3-4 weeks is usually sufficient, with quick rinses in between.

**Important Tips**
• Always use pH-neutral car shampoo
• Avoid automatic car washes with brushes
• Dry your car completely to prevent water spots
• Never wash in direct sunlight

Visit Wheelspa for professional maintenance washes that keep your coating in top condition.`
  };

  const openArticle = (post) => {
    setSelectedArticle(post);
    setArticleDialogOpen(true);
  };

  const comparisonData = [
    {
      feature: 'Protection Level',
      ppf: 'Physical barrier against scratches, chips',
      ceramic: 'Chemical protection & hydrophobic',
      graphene: 'Chemical + heat dissipation'
    },
    {
      feature: 'Durability',
      ppf: '7-10 years',
      ceramic: '3-5 years',
      graphene: '5-7 years'
    },
    {
      feature: 'Self-Healing',
      ppf: 'Yes (with heat)',
      ceramic: 'No',
      graphene: 'No'
    },
    {
      feature: 'Gloss Enhancement',
      ppf: 'Moderate',
      ceramic: 'High',
      graphene: 'Very High'
    },
    {
      feature: 'Heat Resistance',
      ppf: 'Moderate',
      ceramic: 'Good',
      graphene: 'Excellent'
    },
    {
      feature: 'Water Spots',
      ppf: 'Can occur',
      ceramic: 'Resistant',
      graphene: 'Highly Resistant'
    },
    {
      feature: 'Price Range',
      ppf: 'Higher',
      ceramic: 'Moderate',
      graphene: 'Higher'
    }
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gray-900">
        <div className="absolute inset-0 opacity-20">
          <img
            src="https://images.pexels.com/photos/10493497/pexels-photo-10493497.jpeg"
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-2 bg-green-500/20 text-green-400 rounded-full text-sm font-medium mb-6">
              Knowledge Center
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Car Care
              <br />
              <span className="text-green-400">Education Hub</span>
            </h1>
            <p className="text-xl text-gray-300">
              Expert tips, guides, and insights to help you understand and care for your vehicle better.
            </p>
          </div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-8 bg-white border-b sticky top-20 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={activeCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(category)}
                  className={activeCategory === category ? 'bg-green-500 hover:bg-green-600' : ''}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Latest Articles</h2>
            <p className="text-gray-600">Stay informed with our expert car care insights</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredPosts.map((post) => (
              <Card 
                key={post.id} 
                className="group overflow-hidden hover:shadow-xl transition-all duration-300 border-0 cursor-pointer"
                onClick={() => openArticle(post)}
                data-testid={`article-card-${post.id}`}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-green-500 text-white">{post.category}</Badge>
                  </div>
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {post.readTime}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-500 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                    {post.excerpt}
                  </p>
                  <span className="inline-flex items-center text-green-600 hover:text-green-700 font-medium text-sm">
                    Read More <ArrowRight className="ml-1 h-4 w-4" />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-green-500 font-medium">Comparison Guide</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">
              PPF vs Ceramic vs Graphene
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Understand the differences between our premium protection options to make an informed decision.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="p-4 text-left font-semibold">Feature</th>
                  <th className="p-4 text-center font-semibold">PPF</th>
                  <th className="p-4 text-center font-semibold">Ceramic Coating</th>
                  <th className="p-4 text-center font-semibold">Graphene Coating</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-4 font-medium text-gray-900 border-b">{row.feature}</td>
                    <td className="p-4 text-center text-gray-600 border-b">{row.ppf}</td>
                    <td className="p-4 text-center text-gray-600 border-b">{row.ceramic}</td>
                    <td className="p-4 text-center text-gray-600 border-b">{row.graphene}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm mb-4">
              Not sure which protection is right for your car? Get a free consultation.
            </p>
            <a href={`https://wa.me/91${BRAND_INFO.whatsapp}?text=Hi, I need help choosing the right protection for my car.`}>
              <Button className="bg-green-500 hover:bg-green-600 text-white">
                Get Expert Advice
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-green-500 font-medium">FAQs</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600">
              Find answers to common questions about our services and car care.
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {FAQS.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white rounded-xl border-0 shadow-sm overflow-hidden"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 text-left">
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-12 text-center">
            <p className="text-gray-600 mb-4">Still have questions?</p>
            <a href={`tel:${BRAND_INFO.phones[0].replace(/-/g, '')}`}>
              <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                Contact Us
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Car Maintenance Tips */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-green-400 font-medium">Quick Tips</span>
            <h2 className="text-3xl font-bold text-white mt-2">
              Essential Car Care Tips
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'Wash Regularly',
                tip: 'Wash your car every 2 weeks to prevent dirt buildup and paint damage.',
                icon: '💧'
              },
              {
                title: 'Park in Shade',
                tip: 'Protect your car from harsh sun to prevent paint fading and interior damage.',
                icon: '🌳'
              },
              {
                title: 'Use Quality Products',
                tip: 'Invest in pH-neutral car shampoos and microfiber towels for safe cleaning.',
                icon: '✨'
              },
              {
                title: 'Avoid Automatic Washes',
                tip: 'Brush-based automatic car washes can scratch your paint. Use touchless or hand wash.',
                icon: '🚫'
              },
              {
                title: 'Dry Properly',
                tip: 'Always dry your car after washing to prevent water spots, especially on coated surfaces.',
                icon: '🧽'
              },
              {
                title: 'Interior Care',
                tip: 'Vacuum regularly and use UV protectant on dashboard to prevent cracking.',
                icon: '🪑'
              }
            ].map((item, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700">
                <CardContent className="p-6">
                  <div className="text-3xl mb-4">{item.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.tip}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Article Detail Dialog */}
      <Dialog open={articleDialogOpen} onOpenChange={setArticleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-500 text-white">{selectedArticle.category}</Badge>
                  <span className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {selectedArticle.readTime}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-bold text-gray-900">
                  {selectedArticle.title}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <img
                  src={selectedArticle.image}
                  alt={selectedArticle.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
                <div className="prose prose-green max-w-none">
                  {(articleContent[selectedArticle.id] || selectedArticle.excerpt).split('\n\n').map((paragraph, idx) => {
                    if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                      return (
                        <h3 key={idx} className="text-lg font-semibold text-gray-900 mt-6 mb-3">
                          {paragraph.replace(/\*\*/g, '')}
                        </h3>
                      );
                    }
                    if (paragraph.startsWith('•')) {
                      return (
                        <ul key={idx} className="list-disc list-inside space-y-1 text-gray-600 mb-4">
                          {paragraph.split('\n').map((item, i) => (
                            <li key={i}>{item.replace('• ', '')}</li>
                          ))}
                        </ul>
                      );
                    }
                    return (
                      <p key={idx} className="text-gray-600 leading-relaxed mb-4">
                        {paragraph.split('**').map((part, i) => 
                          i % 2 === 1 ? <strong key={i} className="text-gray-900">{part}</strong> : part
                        )}
                      </p>
                    );
                  })}
                </div>
                <div className="mt-8 pt-6 border-t">
                  <p className="text-gray-600 mb-4">Have questions? Get expert advice from our team.</p>
                  <div className="flex gap-3">
                    <a href={`https://wa.me/91${BRAND_INFO.whatsapp}?text=Hi, I read your article "${selectedArticle.title}" and have some questions.`}>
                      <Button className="bg-green-500 hover:bg-green-600 text-white">
                        Chat on WhatsApp
                      </Button>
                    </a>
                    <Button variant="outline" onClick={() => setArticleDialogOpen(false)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Knowledge;
