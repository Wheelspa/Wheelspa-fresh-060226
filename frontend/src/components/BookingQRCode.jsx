import React, { useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Download, Share2, QrCode } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { toast } from 'sonner';

const BookingQRCode = ({ size = 200, showDownload = true, showShare = true, className = '' }) => {
  const canvasRef = useRef(null);
  
  // Get the booking URL - will work on any domain
  const bookingUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/booking`
    : '/booking';

  const handleDownload = () => {
    // Create a canvas with the QR code for download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const padding = 40;
    const qrSize = 400;
    const totalSize = qrSize + padding * 2;
    
    canvas.width = totalSize;
    canvas.height = totalSize + 80; // Extra space for text
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw border
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Get the QR code canvas from the hidden one
    const qrCanvas = document.getElementById('qr-download-canvas');
    if (qrCanvas) {
      ctx.drawImage(qrCanvas, padding, padding, qrSize, qrSize);
    }
    
    // Add text
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Scan to Book', canvas.width / 2, totalSize + 30);
    
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('WHEELSPA', canvas.width / 2, totalSize + 60);
    
    // Download
    const link = document.createElement('a');
    link.download = 'wheelspa-booking-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    toast.success('QR Code downloaded successfully!');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Book at Wheelspa',
          text: 'Scan this QR code to book your car detailing appointment at Wheelspa!',
          url: bookingUrl
        });
      } catch (err) {
        // User cancelled or share failed
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast.success('Booking link copied to clipboard!');
  };

  return (
    <div className={className}>
      <Card className="border-0 shadow-xl overflow-hidden">
        <CardContent className="p-6 text-center">
          {/* Header */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-gray-900">Scan to Book</span>
          </div>
          
          {/* QR Code */}
          <div className="bg-white p-4 rounded-xl inline-block border-2 border-green-100">
            <QRCodeSVG
              value={bookingUrl}
              size={size}
              level="H"
              includeMargin={true}
              bgColor="#ffffff"
              fgColor="#1f2937"
              imageSettings={{
                src: "/logo-transparent.png",
                x: undefined,
                y: undefined,
                height: size * 0.2,
                width: size * 0.2,
                excavate: true,
              }}
            />
          </div>
          
          {/* Hidden canvas for download */}
          <div style={{ display: 'none' }}>
            <QRCodeCanvas
              id="qr-download-canvas"
              value={bookingUrl}
              size={400}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#1f2937"
            />
          </div>
          
          {/* Description */}
          <p className="text-sm text-gray-500 mt-4 mb-4">
            Point your camera at the QR code to book your appointment instantly
          </p>
          
          {/* Actions */}
          {(showDownload || showShare) && (
            <div className="flex gap-2 justify-center">
              {showDownload && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              )}
              {showShare && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShare}
                  className="border-green-500 text-green-600 hover:bg-green-50"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingQRCode;
