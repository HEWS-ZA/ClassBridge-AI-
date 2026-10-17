/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, 
  Mail, 
  CreditCard, 
  UploadCloud, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  ChevronRight, 
  Check, 
  Users, 
  GraduationCap, 
  DollarSign, 
  Calendar,
  Sparkles,
  ArrowRight,
  MessageCircle,
  Smartphone,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Send,
  Bus,
  Clock,
  ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { Student, Teacher, Mark, Attendance, BehaviourLog, Message, FeePayment, TutoringBooking, TransitAlert } from '../types';

interface ParentPortalProps {
  state: {
    students: Student[];
    teachers: Teacher[];
    marks: Mark[];
    attendanceLogs: Attendance[];
    behaviourLogs: BehaviourLog[];
    messages: Message[];
    feePayments?: FeePayment[];
    tutoringBookings?: TutoringBooking[];
    transitAlerts?: TransitAlert[];
  };
  onSaveMessage: (studentId: string, title: string, body: string, status: 'Draft' | 'Sent') => Promise<void>;
  onPayFee?: (studentId: string, feeTitle: string, amount: number, cardholderName: string) => Promise<boolean>;
  onBookTutoring?: (studentId: string, messageId: string) => Promise<boolean>;
}

export default function ParentPortal({
  state,
  onSaveMessage,
  onPayFee,
  onBookTutoring
}: ParentPortalProps) {
  // Demo Parent Switcher
  const [selectedParentId, setSelectedParentId] = useState<string>('stud-1'); // Default Joyce Mokoena viewing Thabo
  const currentChild = state.students.find(s => s.id === selectedParentId) || state.students[0];

  // Active sub tab
  const [activeTab, setActiveTab] = useState<'child' | 'alerts' | 'fees' | 'documents'>('alerts');

  // Advisory Display View Mode: Formal Letterhead vs WhatsApp / SMS Preview
  const [advisoryViewMode, setAdvisoryViewMode] = useState<'letterhead' | 'whatsapp'>('letterhead');

  // Interactive Payment simulation states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [selectedFeeAmount, setSelectedFeeAmount] = useState(350);
  const [selectedFeeTitle, setSelectedFeeTitle] = useState('Grade 12 CAPS Stationery Levy');
  const [cardholderName, setCardholderName] = useState(currentChild.parentName);

  // Sync cardholderName when child switches
  useEffect(() => {
    setCardholderName(currentChild.parentName);
  }, [currentChild]);

  // Tutoring sign up states
  const [bookedTutoring, setBookedTutoring] = useState<Record<string, boolean>>({});

  // Message reply states
  const [replyText, setReplyText] = useState('');
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  // File Upload states (Supports Drag & Drop + Selection)
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: string; date: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const childMarks = state.marks.filter(m => m.studentId === currentChild.id);
  const childMessages = state.messages.filter(m => m.studentId === currentChild.id && m.status === 'Sent');
  const childBehaviour = state.behaviourLogs.filter(b => b.studentId === currentChild.id);
  const latestTransitAlert = state.transitAlerts && state.transitAlerts.length > 0 ? state.transitAlerts[0] : null;

  const handleBookingTutoring = async (msgId: string) => {
    setBookedTutoring(prev => ({ ...prev, [msgId]: true }));
    if (onBookTutoring) {
      await onBookTutoring(currentChild.id, msgId);
    }
  };

  const handleReplySubmit = (e: React.FormEvent, msgId: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySuccess(msgId);
    setReplyText('');
    setTimeout(() => {
      setReplySuccess(null);
    }, 4000);
  };

  const handlePaymentSubmit = async () => {
    setIsProcessingPayment(true);
    try {
      if (onPayFee) {
        await onPayFee(currentChild.id, selectedFeeTitle, selectedFeeAmount, cardholderName);
      }
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
      }, 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addUploadedFiles(e.target.files);
    }
  };

  const addUploadedFiles = (files: FileList) => {
    const list = Array.from(files).map(file => ({
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      date: new Date().toLocaleDateString('en-ZA')
    }));
    setUploadedFiles(prev => [...prev, ...list]);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="parent-portal-root">
      {/* Live Transit Alert Banner (if driver delay posted today) */}
      {latestTransitAlert && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-amber-500/20 text-amber-400">
              <Bus className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider font-extrabold bg-amber-500/20 px-2 py-0.5 rounded-sm">
                  Live Scholar Transit Update
                </span>
                <span className="font-mono text-[10px] text-amber-400/80">{latestTransitAlert.timestamp}</span>
              </div>
              <p className="text-xs font-semibold text-slate-200 mt-0.5">
                <strong className="text-amber-400">{latestTransitAlert.driverName}</strong> ({latestTransitAlert.route}): {latestTransitAlert.reason}. Expected delay of ~{latestTransitAlert.estimatedDelayMinutes} mins.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-amber-400/70 uppercase tracking-widest shrink-0">
            Real-time SSE broadcast
          </span>
        </div>
      )}

      {/* Parent Greeting / Switcher Card */}
      <div className="bg-[#0c0e14] text-slate-300 rounded-sm p-6 border border-white/10 relative overflow-hidden" id="parent-header">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 rounded-full bg-sky-500/5 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="bg-sky-500/10 border border-sky-500/25 text-sky-400 font-mono font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm inline-block">Parent Portal Gateway</span>
              <h1 className="text-3xl font-serif italic text-white tracking-tight mt-1">Hello, {currentChild.parentName}</h1>
              <p className="text-slate-400 text-xs mt-1">Parent of {currentChild.name} • Phakamani Secondary</p>
            </div>
          </div>

          {/* Demo switcher */}
          <div className="bg-[#050608] p-3 rounded-sm border border-white/10 text-xs space-y-1.5 w-full md:w-auto">
            <label className="block text-slate-500 text-[9px] font-mono font-bold uppercase tracking-wider">Demo Switch Parent Profile</label>
            <select
              value={currentChild.id}
              onChange={(e) => {
                setSelectedParentId(e.target.value);
              }}
              className="bg-[#0c0e14] text-slate-200 border border-white/5 rounded-sm p-1.5 font-bold focus:outline-none w-full"
            >
              {state.students.map(s => (
                <option key={s.id} value={s.id} className="bg-[#0c0e14]">{s.parentName} (Parent of {s.name})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border border-white/5 bg-[#080a0f] p-1 rounded-sm" id="parent-tabs">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition border-0 ${
            activeTab === 'alerts' 
              ? 'bg-sky-500 text-black shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Mail className="w-4 h-4" />
          Inbox Alerts ({childMessages.length})
        </button>
        <button
          onClick={() => setActiveTab('child')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition border-0 ${
            activeTab === 'child' 
              ? 'bg-sky-500 text-black shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Learner Dashboard
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition border-0 ${
            activeTab === 'fees' 
              ? 'bg-sky-500 text-black shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Fees & Levies
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition border-0 ${
            activeTab === 'documents' 
              ? 'bg-sky-500 text-black shadow-md' 
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          Absence Submissions
        </button>
      </div>

      {/* TAB: Inbox / AI Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-6" id="parent-panel-alerts">
          {/* Header & Format Toggle */}
          <div className="bg-[#0c0e14] p-5 rounded-sm border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-serif italic text-white mb-1">Grade Head & Academic Advisory Inbox</h2>
              <p className="text-slate-400 text-xs">Direct notifications from continuous academic monitoring at Phakamani Secondary.</p>
            </div>

            {/* View Mode Switcher: Formal Letterhead vs WhatsApp / SMS Preview */}
            <div className="flex items-center gap-2 bg-[#050608] p-1.5 rounded-sm border border-white/10 shrink-0">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider font-bold px-1 hidden sm:inline">Format:</span>
              <button
                onClick={() => setAdvisoryViewMode('letterhead')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  advisoryViewMode === 'letterhead'
                    ? 'bg-white text-black shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> Formal Letterhead
              </button>
              <button
                onClick={() => setAdvisoryViewMode('whatsapp')}
                className={`px-3 py-1.5 rounded-sm text-xs font-mono font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                  advisoryViewMode === 'whatsapp'
                    ? 'bg-emerald-500 text-black shadow-sm font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp / SMS Preview
              </button>
            </div>
          </div>

          {childMessages.length === 0 ? (
            <div className="bg-[#0c0e14] border border-emerald-500/10 p-8 rounded-sm text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-serif italic text-emerald-400">Inbox Progress Stable</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">No academic alerts or continuous risk warnings have been generated for {currentChild.name} recently. Keep up the solid progress!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {childMessages.map((msg) => {
                const isBooked = state.tutoringBookings?.some(b => b.studentId === currentChild.id && b.messageId === msg.id) || bookedTutoring[msg.id];
                const isReplying = replySuccess === msg.id;

                if (advisoryViewMode === 'whatsapp') {
                  // Authentic South African WhatsApp / SMS Chat Bubble Preview
                  return (
                    <div key={msg.id} className="max-w-2xl mx-auto rounded-xl border border-white/10 overflow-hidden shadow-2xl bg-[#0b141a] animate-fade-in font-sans">
                      {/* WhatsApp Header */}
                      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-[#128c7e] border border-white/20 flex items-center justify-center font-serif font-black text-white text-base">
                              PSS
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#075e54] absolute bottom-0 right-0"></span>
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm tracking-tight">Phakamani Secondary School</span>
                              <ShieldCheck className="w-4 h-4 text-emerald-300" />
                            </div>
                            <p className="text-[11px] text-emerald-100/80 leading-none mt-0.5">Official Academic Support • Online</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-emerald-100">
                          <Video className="w-4 h-4 cursor-pointer hover:text-white" />
                          <Phone className="w-4 h-4 cursor-pointer hover:text-white" />
                          <MoreVertical className="w-4 h-4 cursor-pointer hover:text-white" />
                        </div>
                      </div>

                      {/* WhatsApp Chat Canvas */}
                      <div className="p-4 sm:p-6 space-y-4 bg-[#0b141a] bg-opacity-95 relative" style={{ backgroundImage: 'radial-gradient(#1f2c34 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                        {/* Date Header Pill */}
                        <div className="flex justify-center">
                          <span className="bg-[#182229] text-[10px] text-slate-400 px-3 py-1 rounded-full font-mono uppercase tracking-wider shadow-sm border border-white/5">
                            Today • Official Notification
                          </span>
                        </div>

                        {/* End-to-end encryption notice */}
                        <div className="bg-[#182229]/80 border border-amber-500/10 rounded-md p-2 text-center text-[10px] text-amber-200/80 font-mono flex items-center justify-center gap-1.5">
                          <span>🔒 Messages are protected with end-to-end encryption. S.A. POPIA Compliant.</span>
                        </div>

                        {/* Incoming WhatsApp Chat Bubble */}
                        <div className="flex justify-start">
                          <div className="bg-[#202c33] text-slate-100 rounded-lg rounded-tl-none p-4 max-w-lg shadow-md border border-white/5 space-y-3">
                            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                              <span className="text-xs font-bold text-emerald-400">Academic Support Group • Phakamani</span>
                              <span className="text-[10px] text-slate-400 font-mono">Ref: #PSS-{msg.id.slice(-4)}</span>
                            </div>

                            <h4 className="font-bold text-sm text-white">{msg.title}</h4>

                            <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {msg.body}
                            </div>

                            {/* WhatsApp Business Action Buttons inside chat */}
                            <div className="pt-2 border-t border-white/10 space-y-2">
                              {isBooked ? (
                                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold py-2 px-3 rounded-md flex items-center justify-center gap-1.5">
                                  <CheckCircle className="w-4 h-4" /> CAPS Tutoring Confirmed (Enrolled)
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleBookingTutoring(msg.id)}
                                  className="w-full bg-[#00a884] hover:bg-[#029070] text-black font-extrabold text-xs py-2.5 px-3 rounded-md transition flex items-center justify-center gap-1.5 shadow"
                                >
                                  <Calendar className="w-4 h-4" /> Enroll in Afternoon Tutoring (R0)
                                </button>
                              )}

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <button
                                  onClick={() => {
                                    setSelectedFeeTitle('Grade 12 CAPS Stationery Levy');
                                    setSelectedFeeAmount(350);
                                    setShowPaymentModal(true);
                                  }}
                                  className="bg-white/5 hover:bg-white/10 text-slate-200 font-bold py-2 rounded-md border border-white/10 flex items-center justify-center gap-1"
                                >
                                  <CreditCard className="w-3.5 h-3.5 text-sky-400" /> Settle Levies (R350)
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyText(`Good day Grade Head, I have noted the alert regarding ${currentChild.name} and would like to confirm our support.`);
                                  }}
                                  className="bg-white/5 hover:bg-white/10 text-slate-200 font-bold py-2 rounded-md border border-white/10 flex items-center justify-center gap-1"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> Quick Reply
                                </button>
                              </div>
                            </div>

                            {/* Timestamp & Double Blue Checkmarks */}
                            <div className="flex justify-end items-center gap-1 pt-1 text-[10px] text-slate-400">
                              <span>{msg.dateSent ? `${msg.dateSent} • 08:30` : '08:30'}</span>
                              <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                            </div>
                          </div>
                        </div>

                        {/* Direct WhatsApp Response Bar */}
                        <form onSubmit={(e) => handleReplySubmit(e, msg.id)} className="pt-2 flex items-center gap-2">
                          <div className="flex-1 bg-[#202c33] rounded-full px-4 py-2 flex items-center gap-2 border border-white/5">
                            <Smile className="w-4 h-4 text-slate-400 cursor-pointer" />
                            <input
                              type="text"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={`Reply to Phakamani regarding ${currentChild.name}...`}
                              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
                            />
                            <Paperclip className="w-4 h-4 text-slate-400 cursor-pointer" />
                          </div>
                          <button
                            type="submit"
                            disabled={!replyText.trim()}
                            className="w-10 h-10 rounded-full bg-[#00a884] hover:bg-[#029070] disabled:opacity-40 text-black flex items-center justify-center transition shadow shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </form>

                        {isReplying && (
                          <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs p-2 rounded-md text-center">
                            ✓ WhatsApp reply transmitted to Phakamani administrative desk.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                // Formal School Letterhead View
                return (
                  <div key={msg.id} className="bg-[#0c0e14] rounded-sm border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5 animate-fade-in">
                    {/* Left Column: Official Letterhead */}
                    <div className="p-6 md:w-3/5 space-y-6">
                      {/* Formal Letterhead Masthead */}
                      <div className="border-b border-white/10 pb-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white text-black font-black flex items-center justify-center rounded-sm font-serif text-lg">
                              PS
                            </div>
                            <div>
                              <h3 className="font-serif uppercase font-bold text-white text-sm tracking-wide">Phakamani Secondary School</h3>
                              <p className="text-[9px] font-mono text-sky-400 uppercase tracking-widest">Gauteng Department of Education • EMIS: 700400124</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono bg-sky-500/10 border border-sky-500/25 text-sky-400 font-bold px-2 py-0.5 rounded-sm">
                            <FileText className="w-3 h-3" /> Official Notice
                          </span>
                        </div>

                        <div className="grid grid-cols-2 text-[9px] font-mono text-slate-400 pt-2 border-t border-white/5">
                          <div>
                            <span className="text-slate-500">REF NO:</span> PSS/EW-2026/G12-{msg.id.slice(-4)}<br />
                            <span className="text-slate-500">LEARNER:</span> {currentChild.name} ({currentChild.grade})
                          </div>
                          <div className="text-right">
                            <span className="text-slate-500">DATE ISSUED:</span> {msg.dateSent || msg.dateDrafted}<br />
                            <span className="text-slate-500">RECIPIENT:</span> {currentChild.parentName}
                          </div>
                        </div>
                      </div>

                      {/* Letter Subject */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-wider block">Official Advisory Subject</span>
                        <h4 className="font-serif italic text-white text-lg leading-tight">{msg.title}</h4>
                      </div>

                      {/* Content text */}
                      <div className="bg-[#050608] p-5 rounded-sm border border-white/5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                        {msg.body}
                      </div>

                      {/* Formal Sign-off with Digital Stamp */}
                      <div className="flex justify-between items-end border-t border-white/10 pt-4">
                        <div className="space-y-1 text-xs">
                          <p className="font-serif italic text-slate-200">Mrs. T. Ngubane & Academic Continuity Committee</p>
                          <p className="text-[10px] font-mono text-slate-500">Phakamani Secondary School • Soweto Central</p>
                        </div>
                        
                        <div className="border-2 border-emerald-500/30 text-emerald-400 font-mono text-[8px] uppercase tracking-wider px-2.5 py-1.5 rounded-sm text-center rotate-[-3deg] bg-emerald-500/5">
                          <span className="block font-bold">APPROVED & ISSUED</span>
                          <span className="text-[7px] text-slate-400">PHAKAMANI CASS BD</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Closed-Loop Intervention Actions */}
                    <div className="p-6 md:w-2/5 bg-[#080a0f]/40 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                          <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Intervention Action Portal</h4>
                        </div>

                        {/* Interactive tutoring booking */}
                        <div className="bg-[#050608] p-4 rounded-sm border border-white/5 shadow-sm space-y-2.5">
                          <h5 className="font-serif italic text-white text-xs">Phakamani Afternoon CAPS Tutoring</h5>
                          <p className="text-slate-400 text-[11px] leading-normal">COMPULSORY REMEDIATION: Enrollment in afternoon lessons (Mon - Thu, 14:30 - 15:30) with subject educators.</p>
                          
                          {isBooked ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold p-2.5 rounded-sm flex items-center justify-center gap-1.5">
                              <CheckCircle className="w-4 h-4" /> Learner Enrolled & Confirmed
                            </div>
                          ) : (
                            <button
                              onClick={() => handleBookingTutoring(msg.id)}
                              className="w-full bg-sky-500 hover:bg-sky-400 text-black font-extrabold uppercase tracking-wider text-[10px] py-2.5 rounded-sm transition flex items-center justify-center gap-1 shadow-lg shadow-sky-500/10"
                            >
                              Confirm Enrollment (R0 Fee) <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Direct feedback reply */}
                        <form onSubmit={(e) => handleReplySubmit(e, msg.id)} className="space-y-2.5">
                          <label className="block text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">Direct Reply / Callback Request</label>
                          <textarea
                            rows={3}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type message to Mrs. Ngubane or request callback..."
                            disabled={isReplying}
                            className="w-full bg-[#050608] border border-white/5 rounded-sm p-2.5 text-xs text-slate-200 focus:ring-1 focus:ring-sky-500 focus:outline-none focus:bg-[#050608] disabled:opacity-40"
                          ></textarea>
                          
                          {isReplying ? (
                            <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold p-2 rounded-sm flex items-center justify-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Reply logged. Educator notified to call.
                            </div>
                          ) : (
                            <button
                              type="submit"
                              disabled={!replyText.trim()}
                              className="bg-white/5 hover:bg-white/10 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-sm border border-white/10 transition"
                            >
                              Submit Reply
                            </button>
                          )}
                        </form>
                      </div>

                      <div className="text-[9px] font-mono text-slate-500 border-t border-white/5 pt-3 leading-normal">
                        *Responses submitted here are directly routed to Phakamani administrative desktops in real-time via PostgreSQL.
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Learner Dashboard */}
      {activeTab === 'child' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="parent-panel-child">
          {/* Diagnostic Metrics */}
          <div className="md:col-span-4 space-y-6">
            <div className="bg-[#0c0e14] p-5 rounded-sm border border-white/5 space-y-4">
              <h3 className="text-[10px] uppercase font-mono font-bold text-slate-500">Term 2 Academic Standing</h3>
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-serif italic tracking-tight text-white">{currentChild.averageMark}%</span>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                  currentChild.averageMark >= 60 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {currentChild.averageMark >= 60 ? 'Passing average' : 'Needs Review'}
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-normal">
                Based on continuous assessments. Gauteng Province passing threshold is 40%, but Phakamani targets 55% for university entrance.
              </p>
            </div>

            <div className="bg-[#0c0e14] p-5 rounded-sm border border-white/5 space-y-4">
              <h3 className="text-[10px] uppercase font-mono font-bold text-slate-500">Verified Attendance Progress</h3>
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-serif italic tracking-tight text-white">{currentChild.attendancePercent}%</span>
                <span className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${
                  currentChild.attendancePercent >= 90 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {currentChild.attendancePercent >= 90 ? 'Satisfactory' : 'Critical'}
                </span>
              </div>
              <div className="w-full bg-[#050608] h-1.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full ${currentChild.attendancePercent >= 90 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                  style={{ width: `${currentChild.attendancePercent}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Marks and behavior columns */}
          <div className="md:col-span-8 bg-[#0c0e14] p-6 rounded-sm border border-white/5 space-y-6">
            <div>
              <h3 className="font-serif italic text-white text-base mb-3">Term 2 Continuous Assessment (CASS) Marks</h3>
              {childMarks.length === 0 ? (
                <p className="text-slate-500 text-xs italic py-4 font-mono">No marks logged for this student yet.</p>
              ) : (
                <div className="space-y-2">
                  {childMarks.map(m => (
                    <div key={m.id} className="p-3 bg-[#050608] rounded-sm border border-white/5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-slate-200 block">{m.testName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{m.subject}</span>
                      </div>
                      <span className={`font-mono font-extrabold text-sm ${
                        (m.markValue/m.maxMark) >= 0.7 ? 'text-emerald-400' :
                        (m.markValue/m.maxMark) >= 0.5 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {m.markValue} / {m.maxMark} ({Math.round((m.markValue/m.maxMark)*100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-serif italic text-white text-base mb-3">Educator Conduct Log & Merits</h3>
              {childBehaviour.length === 0 ? (
                <p className="text-slate-500 text-xs italic py-8 text-center border border-dashed border-white/10 rounded-sm font-mono">No conduct incidents logged this term.</p>
              ) : (
                <div className="space-y-2">
                  {childBehaviour.map(b => (
                    <div key={b.id} className="p-3 bg-[#050608] border border-white/5 rounded-sm flex items-start gap-2.5 text-xs">
                      <span className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[9px] mt-0.5 shrink-0 border ${
                        b.category === 'Positive' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        {b.category}
                      </span>
                      <div>
                        <p className="text-slate-300 font-medium leading-relaxed">"{b.description}"</p>
                        <span className="text-[9px] text-slate-500 mt-1.5 block font-mono">{b.date} • {b.points > 0 ? `+${b.points}` : b.points} points</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: Fees & Statements */}
      {activeTab === 'fees' && (
        <div className="space-y-6 animate-fade-in" id="parent-panel-fees">
          <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="font-serif italic text-white text-base">Phakamani High School Account Statement</h3>
              <p className="text-slate-400 text-xs mt-1">Student Account: {currentChild.name} (Grade {currentChild.grade}) • Parent: {currentChild.parentName}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-500 uppercase block tracking-wider">Current Balance Due</span>
              <span className="text-2xl font-mono font-extrabold text-amber-400">R350.00</span>
            </div>
          </div>

          <div className="bg-[#0c0e14] rounded-sm border border-white/5 overflow-hidden">
            <div className="p-4 bg-[#080a0f] border-b border-white/5 grid grid-cols-12 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
              <div className="col-span-6 pl-2">Fee Description</div>
              <div className="col-span-2 text-center">Due Date</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right pr-2">Action</div>
            </div>

            <div className="divide-y divide-white/5 text-xs text-slate-300">
              <div className="p-4 grid grid-cols-12 items-center hover:bg-white/[0.02] transition">
                <div className="col-span-6 pl-2">
                  <span className="font-bold text-white block">Grade 12 CAPS Stationery Levy</span>
                  <span className="text-[10px] text-slate-500 font-mono">Includes Mathematics graph books & Life Sciences laboratory workbook</span>
                </div>
                <div className="col-span-2 text-center font-mono text-[11px] text-slate-400">30 April 2026</div>
                <div className="col-span-2 text-right font-bold font-mono">R350.00</div>
                <div className="col-span-2 text-right pr-2">
                  <button
                    onClick={() => {
                      setSelectedFeeTitle('Grade 12 CAPS Stationery Levy');
                      setSelectedFeeAmount(350);
                      setShowPaymentModal(true);
                    }}
                    className="bg-sky-500 hover:bg-sky-400 text-black font-extrabold uppercase tracking-wider text-[10px] py-2 px-4 rounded-sm transition shadow-lg shadow-sky-500/10"
                  >
                    Pay
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Settled Payment Receipts (Persisted in PostgreSQL) */}
          {state.feePayments && state.feePayments.filter(p => p.studentId === currentChild.id).length > 0 && (
            <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="font-serif italic text-white text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Settled Payment Receipts
                </h4>
                <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                  PostgreSQL Persisted
                </span>
              </div>
              <div className="space-y-2">
                {state.feePayments.filter(p => p.studentId === currentChild.id).map(p => (
                  <div key={p.id} className="p-3 bg-[#050608] border border-white/5 rounded-sm flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{p.feeTitle}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Paid by: {p.cardholderName || p.parentName} • Date: {p.paymentDate || p.date}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      R{p.amount.toFixed(2)} Paid
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Modal Simulation */}
          {showPaymentModal && (
            <div className="fixed inset-0 bg-[#050608]/80 flex items-center justify-center p-4 z-50 animate-fade-in" id="payment-modal">
              <div className="bg-[#0c0e14] text-white border border-white/10 rounded-sm max-w-sm w-full p-6 shadow-2xl relative overflow-hidden animate-scale-up">
                <h3 className="text-base font-serif italic text-white flex items-center gap-1.5 border-b border-white/5 pb-3">
                  <CreditCard className="w-5 h-5 text-sky-400" /> Secure Payment Gateway
                </h3>
                
                {paymentSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                    <p className="font-bold text-white text-sm">Payment Successful!</p>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">R{selectedFeeAmount.toFixed(2)} has been successfully paid towards {selectedFeeTitle}. Ref: PHK-{Date.now().toString().slice(6)}</p>
                  </div>
                ) : (
                  <div className="space-y-4 mt-4">
                    <div className="bg-[#050608] border border-white/5 rounded-sm p-3 text-xs space-y-1">
                      <span className="text-slate-500 font-mono text-[9px] uppercase tracking-wider block">Bill Item</span>
                      <span className="font-bold text-slate-200 block leading-tight">{selectedFeeTitle}</span>
                      <span className="font-bold text-sky-400 text-sm block pt-1 font-mono">Amount: R{selectedFeeAmount.toFixed(2)}</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="block text-slate-500 font-mono text-[9px] uppercase tracking-wider">Payment Cardholder Name</label>
                      <input 
                        type="text" 
                        required 
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="w-full bg-[#050608] border border-white/5 text-white rounded-sm p-2.5 focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="block text-slate-500 font-mono text-[9px] uppercase tracking-wider">Credit Card Number</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="••••  ••••  ••••  4321"
                        className="w-full bg-[#050608] border border-white/5 text-white rounded-sm p-2.5 focus:ring-1 focus:ring-sky-500 focus:outline-none font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">Expiry</label>
                        <input type="text" required placeholder="MM/YY" className="w-full bg-[#050608] border border-white/5 text-white rounded-sm p-2 focus:outline-none text-center font-mono" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-slate-500 font-mono text-[9px] uppercase tracking-wider">CVV</label>
                        <input type="text" required placeholder="•••" className="w-full bg-[#050608] border border-white/5 text-white rounded-sm p-2 focus:outline-none text-center font-mono" />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-white/5">
                      <button
                        onClick={() => setShowPaymentModal(false)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold py-2 rounded-sm text-xs transition border-0"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePaymentSubmit}
                        disabled={isProcessingPayment}
                        className="flex-1 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-black font-extrabold py-2 rounded-sm text-xs transition border-0"
                      >
                        {isProcessingPayment ? "Processing..." : `Pay R${selectedFeeAmount.toFixed(0)}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: Absences Document Upload */}
      {activeTab === 'documents' && (
        <div className="bg-[#0c0e14] p-6 rounded-sm border border-white/5 space-y-6 animate-fade-in" id="parent-panel-documents">
          <div>
            <h3 className="font-serif italic text-white text-base">Learner Absence Certificate Upload Manager</h3>
            <p className="text-slate-400 text-xs mt-1">In South African High Schools, CASS regulations mandate submitting a doctor's sick certificate or official excuse letter within 24 hours of absence to prevent zero mark defaults.</p>
          </div>

          {/* Dual Upload Zone (Supports Drag & Drop) */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-10 border-2 border-dashed rounded-sm text-center cursor-pointer transition ${
              isDragging 
                ? 'border-sky-500 bg-sky-500/5' 
                : 'border-white/10 hover:border-sky-500/40 bg-[#050608] hover:bg-[#080a0f]'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept="image/*,application/pdf"
            />
            <UploadCloud className="w-12 h-12 text-slate-500 mx-auto animate-bounce" />
            <h4 className="font-bold text-slate-300 text-sm mt-3 font-serif italic">Drag & drop doctor's sick note here</h4>
            <p className="text-slate-500 text-xs mt-1 font-mono">or click to browse local files (Supports PDF, JPG, PNG up to 5MB)</p>
          </div>

          {/* Uploaded History logs */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-mono text-slate-400 text-xs uppercase tracking-wider font-bold">Uploaded Absence Submissions ({uploadedFiles.length})</h4>
              <div className="space-y-2">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="p-3 bg-[#050608] border border-white/5 rounded-sm flex justify-between items-center text-xs text-slate-300 animate-fade-in">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-sky-400" />
                      <div>
                        <span className="font-bold text-slate-200 block">{file.name}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">Size: {file.size} • Uploaded: {file.date}</span>
                      </div>
                    </div>
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-sm text-[9px] font-mono flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Transmitted
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
