import React from "react";

const Footer = () => {
  return (
    <footer className="bg-[#090101] text-white text-center p-4 mt-8 sticky bottom-0 w-full">
      <p>Développé par <strong>Atanda Abdullahi</strong> durant DAQ Numérique, à Greta Chalon-sur-Saône 2025.</p>
      
      {/* Social Media Links */}
      <div className="flex justify-center space-x-6 mt-4">
        {/* LinkedIn */}
        <a href="https://www.linkedin.com/in/your-profile" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">
          <i className="fab fa-linkedin text-2xl"></i>
        </a>
        
        {/* GitHub */}
        <a href="https://github.com/your-profile" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">
          <i className="fab fa-github text-2xl"></i>
        </a>
        
        {/* Twitter */}
        <a href="https://twitter.com/your-profile" target="_blank" rel="noopener noreferrer" className="hover:text-yellow-400 transition">
          <i className="fab fa-twitter text-2xl"></i>
        </a>
      </div>
    </footer>
  );
};

export default Footer;
