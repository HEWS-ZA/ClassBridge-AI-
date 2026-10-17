/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Bus, 
  MapPin, 
  UserCheck, 
  Clock, 
  PhoneCall, 
  Navigation, 
  AlertOctagon, 
  CheckCircle, 
  Check, 
  HelpCircle,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Student } from '../types';

interface DriverPortalProps {
  state: {
    students: Student[];
  };
  onNotifyDelay?: (driverName: string, route: string, reason: string, estimatedDelayMinutes: number) => Promise<boolean>;
}

export default function DriverPortal({ state, onNotifyDelay }: DriverPortalProps) {
  // Mock Route
  const routeName = 'Soweto Route A • Phakamani High Bus #4';
  const driverName = 'Baba Sipho';
  const licensePlate = 'GP 543 SH • Toyota Quantum';

  // Boarding states
  const [boardedStatus, setBoardedStatus] = useState<Record<string, boolean>>({
    'stud-1': true, // Thabo boarded
    'stud-2': true, // Lerato boarded
    'stud-3': false, // Pieter not boarded
  });

  // Delay Notification state
  const [delayStatus, setDelayStatus] = useState<'normal' | 'notifying' | 'notified'>('normal');
  const [delayReason, setDelayReason] = useState('Traffic on Golden Highway');

  const toggleBoarded = (id: string) => {
    setBoardedStatus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNotifyDelay = async () => {
    setDelayStatus('notifying');
    try {
      if (onNotifyDelay) {
        await onNotifyDelay(driverName, routeName, delayReason, 15);
      } else {
        await fetch('/api/driver/delay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverName, route: routeName, reason: delayReason, estimatedDelayMinutes: 15 })
        });
      }
      setDelayStatus('notified');
      setTimeout(() => {
        setDelayStatus('normal');
      }, 4000);
    } catch (err) {
      console.error(err);
      setDelayStatus('normal');
    }
  };


  return (
    <div className="space-y-6" id="driver-portal-root">
      {/* Driver greeting header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="driver-header">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <span className="bg-amber-900/40 text-amber-300 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full inline-block">Transport Services Portal</span>
            <h1 className="text-2xl font-black mt-1">Molo, {driverName}</h1>
            <p className="text-slate-400 text-xs mt-0.5">{licensePlate}</p>
          </div>
        </div>

        <div className="text-right text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800 w-full md:w-auto">
          <div className="text-slate-500 uppercase font-bold text-[9px] tracking-wide">Route Assignment</div>
          <div className="font-extrabold text-amber-400 mt-0.5">{routeName}</div>
        </div>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Pickup List */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div>
            <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-amber-500" /> Morning Boarding Manifest
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">Toggle each learner as they board or leave the Quantum transport shuttle.</p>
          </div>

          <div className="space-y-2.5">
            {state.students.slice(0, 4).map((student) => {
              const isBoarded = boardedStatus[student.id];
              return (
                <div 
                  key={student.id} 
                  className={`p-3.5 rounded-xl border flex justify-between items-center transition ${
                    isBoarded ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={student.profilePhoto} 
                      alt={student.name} 
                      className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <span className="font-extrabold text-slate-800 text-xs block">{student.name}</span>
                      <span className="text-[9px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-300" /> Grade {student.grade} • Soweto Bus Stop #2
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isBoarded ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Boarded
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
                        Waiting
                      </span>
                    )}

                    <button
                      onClick={() => toggleBoarded(student.id)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition ${
                        isBoarded 
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {isBoarded ? 'Remove' : 'Log Boarded'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Late / Delay Alerts Panel */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div>
              <h2 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-amber-500" /> Transit Delay Alert Panel
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">Notify Phakamani administrative office and parent portals of any transport delays due to road closures, weather, or breakdowns.</p>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Delay Incident Reason</label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                >
                  <option value="Traffic on Golden Highway">Traffic on Golden Highway</option>
                  <option value="Road closure on Rand Show Rd">Road closure on Rand Show Rd</option>
                  <option value="Quantum Shuttle Engine Breakdowns">Quantum Shuttle Engine Breakdown</option>
                  <option value="Severe heavy morning thunderstorms">Severe heavy morning thunderstorms</option>
                </select>
              </div>

              {delayStatus === 'notified' ? (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-lg text-center flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4 animate-bounce" /> Delays Sent to Parents & School!
                </div>
              ) : (
                <button
                  onClick={handleNotifyDelay}
                  disabled={delayStatus === 'notifying'}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-extrabold text-xs py-2.5 rounded-lg shadow transition flex items-center justify-center gap-1"
                >
                  {delayStatus === 'notifying' ? (
                    'Transmitting SMS & Portal Logs...'
                  ) : (
                    <>
                      <AlertOctagon className="w-3.5 h-3.5 text-white" /> Notify 15-Min Delay
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-4 leading-normal space-y-1">
            <span className="font-bold text-slate-500 uppercase tracking-wide block">Driver Policy Manual</span>
            <p>Ensure all learners remain seated during transit. Always log daily registers within 10 minutes of arrivals at the Phakamani student drop-off lanes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
