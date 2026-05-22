import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Calendar as CalendarIcon, 
  Plus, 
  RefreshCcw, 
  MapPin, 
  Clock, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Check, 
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { listCalendarEvents, createCalendarEvent, deleteCalendarEvent, CalendarEvent } from '../services/calendarService';
import { googleSignIn, getAccessToken } from '../lib/auth';

interface CalendarViewProps {
  onClose: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ onClose }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Auth requirement
  const [hasToken, setHasToken] = useState<boolean>(true);

  const checkAuth = async () => {
    const token = await getAccessToken();
    setHasToken(!!token);
    return !!token;
  };

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const authenticated = await checkAuth();
      if (!authenticated) {
        setIsLoading(false);
        return;
      }
      const items = await listCalendarEvents(30);
      setEvents(items);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setHasToken(true);
        fetchEvents();
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary || !startDate || !startTime || !endDate || !endTime) return;

    setIsSaving(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00`).toISOString();
      const endDateTime = new Date(`${endDate}T${endTime}:00`).toISOString();

      await createCalendarEvent({
        summary,
        description,
        location,
        start: { dateTime: startDateTime },
        end: { dateTime: endDateTime }
      });

      setIsAddOpen(false);
      // Reset form
      setSummary('');
      setDescription('');
      setLocation('');
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      // Refresh events list
      fetchEvents();
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventTitle: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete the event "${eventTitle}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteCalendarEvent(eventId);
      setEvents(prev => prev.filter(e => e.id !== eventId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete event');
    }
  };

  const formatDate = (dateStr?: string, dateTimeStr?: string) => {
    if (!dateStr && !dateTimeStr) return '';
    const date = new Date(dateTimeStr || dateStr || '');
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateTimeStr?: string) => {
    if (!dateTimeStr) return 'All Day';
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredEvents = events.filter(e => 
    e.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (e.location && e.location.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-white text-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100/30">
            <CalendarIcon size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Google Calendar</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Integrated Events</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasToken && (
            <button 
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-500/10"
            >
              <Plus size={14} /> Add Event
            </button>
          )}
          <button 
            onClick={fetchEvents}
            className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors text-slate-400"
            title="Refresh events"
          >
            <RefreshCcw size={15} />
          </button>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl transition-colors text-slate-400">
             <X size={15} />
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
        {!hasToken ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 mb-4 border border-blue-100/30">
              <CalendarIcon size={28} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">Connect your Google Calendar</h2>
            <p className="text-slate-400 max-w-sm text-xs font-medium mb-6 leading-relaxed">
              Enable your Google Calendar integration to see your upcoming meetings, set schedule blocks, and sync reminders directly.
            </p>
            <button 
              onClick={handleSignIn}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
            >
              Sign In with Google
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white/50">
            <Loader2 className="animate-spin text-blue-500 mb-3" size={28} />
            <span className="text-xs font-semibold text-slate-500">Retrieving agenda events...</span>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/50">
            <AlertCircle className="text-red-500 mb-3" size={32} />
            <h3 className="font-bold text-slate-800 text-sm">Failed to load events</h3>
            <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">{error}</p>
            <button 
              onClick={fetchEvents}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input 
                type="text"
                placeholder="Search event agenda..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400/50 transition-all shadow-sm"
              />
            </div>

            {filteredEvents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
                <p className="text-xs font-bold text-slate-400">No events found in your agenda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map(event => {
                  const day = formatDate(event.start.date, event.start.dateTime);
                  const isAllDay = !event.start.dateTime;
                  const time = isAllDay ? 'All Day' : `${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)}`;

                  return (
                    <div 
                      key={event.id}
                      className="group p-5 bg-white rounded-2xl border border-slate-200/50 hover:border-slate-300 hover:shadow-md transition-all flex items-start gap-4"
                    >
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-blue-50/60 text-blue-600 shrink-0 font-bold border border-blue-100/20">
                        <span className="text-[10px] uppercase tracking-wider">
                          {event.start.dateTime || event.start.date ? new Date(event.start.dateTime || event.start.date || '').toLocaleDateString(undefined, { month: 'short' }) : ''}
                        </span>
                        <span className="text-sm -mt-1">
                          {event.start.dateTime || event.start.date ? new Date(event.start.dateTime || event.start.date || '').toLocaleDateString(undefined, { day: 'numeric' }) : ''}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 block mb-0.5">{day}</span>
                        <h4 className="text-sm font-bold text-slate-800 leading-snug truncate group-hover:text-blue-600 transition-colors">
                          {event.summary}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] font-medium text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            {time}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1 truncate max-w-[200px]">
                              <MapPin size={12} className="text-slate-400" />
                              {event.location}
                            </span>
                          )}
                        </div>

                        {event.description && (
                          <p className="mt-2 text-xs text-slate-400/90 leading-relaxed font-normal line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteEvent(event.id, event.summary)}
                        className="p-2 border border-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 rounded-xl transition-all self-center opacity-0 group-hover:opacity-100 shadow-sm"
                        title="Delete event"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Event Modal Popover */}
      <AnimatePresence>
        {isAddOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/10 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="text-blue-500" size={18} />
                  <h3 className="font-bold text-slate-800 text-sm">Create Calendar Event</h3>
                </div>
                <button 
                  onClick={() => setIsAddOpen(false)}
                  className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4 text-left">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Event Summary *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="E.g., Design Review Meeting"
                    value={summary}
                    onChange={e => setSummary(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Location</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Google Meet / Office Room A"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Date *</label>
                    <input 
                      type="date" 
                      required
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Time *</label>
                    <input 
                      type="time" 
                      required
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End Date *</label>
                    <input 
                      type="date" 
                      required
                      value={endDate}
                      onChange={e => setEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">End Time *</label>
                    <input 
                      type="time" 
                      required
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description</label>
                  <textarea 
                    rows={2}
                    placeholder="Agenda details, links..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => setIsAddOpen(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5"
                  >
                    {isSaving && <Loader2 className="animate-spin" size={14} />}
                    Create Event
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CalendarView;
