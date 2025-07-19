'use client'

import React, { useState, useRef, useEffect } from "react";
import { SiGoogledrive } from "react-icons/si";
import { FcGoogle } from "react-icons/fc";
import { FiFile } from "react-icons/fi";
import { MdEmail } from "react-icons/md";
import { IoMdNotificationsOutline } from "react-icons/io";
export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Load Google Identity Services script
  useEffect(() => {
    if (!(window as any).google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Google OAuth2 popup sign-in (no redirect URI needed)
  const handleGoogleSignIn = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    // @ts-ignore
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      // @ts-ignore
      window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file email profile',
        callback: (response: any) => {
          if (response && response.access_token) {
            setAccessToken(response.access_token);
            setSignedIn(true);
            setMessage('Signed in to Google Drive!');
          } else {
            setMessage('Google sign-in failed.');
          }
        },
      }).requestAccessToken();
    } else {
      setMessage('Google Identity Services not loaded.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !email) {
      setMessage("Please select a file and enter an email.");
      return;
    }
    if (!accessToken) {
      setMessage("Please sign in with Google Drive first.");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("email", email);
      formData.append("accessToken", accessToken);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("Upload complete! You will be notified at " + email);
        setFile(null);
        setEmail("");
      } else {
        setMessage(data.error || "Upload failed.");
      }
    } catch (err: any) {
      setMessage("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 animate-fadein font-sans">
      {signedIn ? (
        <form
          className="bg-white rounded-2xl shadow-2xl p-10 flex flex-col gap-8 w-full max-w-md border border-gray-100 animate-slideup font-sans"
          onSubmit={handleSubmit}
        >
          <header className="w-full flex flex-col items-center mb-2">
            <h1 className="text-3xl font-extrabold text-indigo-800 tracking-tight mb-1 drop-shadow-lg font-sans">MNA Ventures</h1>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mb-2"></div>
          </header>
          <div className="flex flex-col items-center">
            {/* Main header icon: blue */}
            <span className="animate-bounce"><SiGoogledrive size={64} color="#4285F4" /></span>
          </div>
          <h1 className="text-3xl font-extrabold text-center mb-2 text-indigo-700 tracking-tight font-sans">Upload to Google Drive</h1>
          <div className="border-2 border-dashed border-indigo-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition flex flex-col items-center gap-2 bg-indigo-50" onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            {/* File icon: green if file selected, yellow if not */}
            <span className="mb-2 animate-pulse">
              {file ? (
                <FiFile size={40} color="#34A853" />
              ) : (
                <FiFile size={40} color="#6366F1" />
              )}
            </span>
            {file ? (
              <span className="text-green-600 font-medium">{file.name}</span>
            ) : (
              <span className="text-gray-500">Drag & drop or click to select a file</span>
            )}
          </div>
          <label className="text-sm text-gray-600 mb-1 font-semibold font-sans" htmlFor="email">
            <span className="inline-flex items-center gap-2">
              <MdEmail size={20} color="#6366F1" />
              Enter your email address below.
            </span>
            <br /> <br /> 
            <span className="text-indigo-600 font-semibold">You will be notified in your inbox when the file is uploaded to Google Drive.</span>
          </label>
          <input
            id="email"
            type="email"
            className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-indigo-400 text-base font-sans placeholder:text-indigo-400 placeholder:font-semibold text-indigo-700 font-bold bg-indigo-50"
            placeholder="Your email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-6 py-2 font-bold shadow hover:from-blue-600 hover:to-indigo-700 transition disabled:opacity-50 focus:scale-105 active:scale-95 duration-150 font-sans"
            disabled={uploading || !file || !email}
          >
            {uploading ? (
              <span className="inline-flex items-center gap-2">
                <IoMdNotificationsOutline size={20} color="#fff" className="animate-spin" />
                Uploading...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <IoMdNotificationsOutline size={20} color="#fff" />
                Upload & Notify
              </span>
            )}
          </button>
          {message && <div className="text-center text-base text-indigo-700 mt-2 font-semibold font-sans">{message}</div>}
        </form>
      ) : (
        <div className="flex flex-col items-center justify-center gap-6 bg-white rounded-2xl shadow-2xl p-10 max-w-md border border-gray-100 animate-slideup font-sans">
          <header className="w-full flex flex-col items-center mb-2">
            <h1 className="text-3xl font-extrabold text-indigo-800 tracking-tight mb-1 drop-shadow-lg font-sans">MNA Ventures</h1>
            <div className="h-1 w-20 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full mb-2"></div>
          </header>
          <span className="mb-2 animate-bounce"><SiGoogledrive size={80} color="#4285F4" /></span>
          <h1 className="text-3xl font-extrabold text-indigo-700 mb-2 tracking-tight">Sign in required</h1>
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl px-4 py-3 flex items-center gap-3 shadow">
            <FcGoogle size={32} />
            <span className="text-lg font-semibold text-indigo-700">Please sign in with Google Drive to continue.</span>
          </div>
          <button
            type="button"
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full px-6 py-2 font-bold shadow hover:from-blue-600 hover:to-indigo-700 transition flex items-center gap-2"
            style={{ marginTop: 16 }}
            onClick={handleGoogleSignIn}
          >
            <SiGoogledrive size={24} className="-ml-1" />
            <span className="inline-flex items-center gap-2">
              Sign In
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
