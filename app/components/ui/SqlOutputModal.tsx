'use client'

import React, { useState } from 'react';
import SqlCodeBlock from './SqlCodeBlock';

export default function SqlOutputModal({ sql, htmlCode, onClose }: { sql: string, htmlCode: string, onClose: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-[200] bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden border border-gray-700">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">🚀</span>
                        <h2 className="text-lg font-bold text-gray-100 font-mono">Generated SQL Schema</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>

                {/* Code Block */}
                <div className="relative p-6 bg-gray-900 overflow-y-auto max-h-[60vh]">
                    <SqlCodeBlock html={htmlCode} />
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end items-center gap-4 px-6 py-4 bg-gray-800 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded font-semibold text-gray-300 hover:text-white transition"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleCopy}
                        className={`px-6 py-2 rounded font-bold text-white transition ${copied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'}`}
                    >
                        {copied ? 'Copied! ✓' : 'Copy to Clipboard'}
                    </button>
                </div>
            </div>
        </div>
    );
}