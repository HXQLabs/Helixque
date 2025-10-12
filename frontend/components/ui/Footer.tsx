import React from "react";
import { FaGithub, FaTwitter, FaLinkedin } from "react-icons/fa";

const Footer: React.FC = () => {
    return (
        <footer className="bg-gray-950 text-gray-300 py-10 px-4 mt-16 border-t border-gray-800">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                {/* About Section */}
                <div className="flex-1 min-w-[200px]">
                    <h2 className="text-lg font-semibold mb-2 text-white">About Helixque</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Connect with professionals worldwide through real-time video chat.
                        Match, network, and build meaningful relationships.
                    </p>
                </div>

                {/* Links Section */}
                <div className="flex-1 min-w-[150px]">
                    <h2 className="text-lg font-semibold mb-2 text-white">Links</h2>
                    <ul className="space-y-1">
                        <li>
                            <a href="/" className="hover:text-blue-400 transition-colors duration-200">
                                Home
                            </a>
                        </li>
                        <li>
                            <a href="/create-room" className="hover:text-blue-400 transition-colors duration-200">
                                Create Room
                            </a>
                        </li>
                        <li>
                            <a href="/match" className="hover:text-blue-400 transition-colors duration-200">
                                Match
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Contact Section */}
                <div className="flex-1 min-w-[150px]">
                    <h2 className="text-lg font-semibold mb-2 text-white">Contact</h2>
                    <ul className="space-y-1">
                        <li>
                            <a
                                href="mailto:contact@helixque.com"
                                className="hover:text-blue-400 transition-colors duration-200"
                            >
                                contact@helixque.com
                            </a>
                        </li>
                        <li>
                            <a href="/support" className="hover:text-blue-400 transition-colors duration-200">
                                Support
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Social Media Section */}
                <div className="flex-1 min-w-[150px] flex flex-col items-center md:items-end">
                    <h2 className="text-lg font-semibold mb-2 text-white">Follow Us</h2>
                    <div className="flex gap-4">
                        <a
                            href="https://github.com/helixque"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Helixque GitHub"
                            className="hover:text-blue-400 transition-colors duration-200"
                        >
                            <FaGithub size={24} />
                        </a>
                        <a
                            href="https://twitter.com/helixque"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Helixque Twitter"
                            className="hover:text-blue-400 transition-colors duration-200"
                        >
                            <FaTwitter size={24} />
                        </a>
                        <a
                            href="https://linkedin.com/company/helixque"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Helixque LinkedIn"
                            className="hover:text-blue-400 transition-colors duration-200"
                        >
                            <FaLinkedin size={24} />
                        </a>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center text-xs text-gray-500">
                &copy; {new Date().getFullYear()} Helixque. All rights reserved.
            </div>
        </footer>
    );
};

export default Footer;
