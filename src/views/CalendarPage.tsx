'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Plus, Phone, Video, Mail,
  CheckSquare, Calendar as CalIcon, Loader2, Clock, MapPin,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { APP_LOCALE, APP_TIMEZONE, formatDateIST, formatTimeIST } from '../lib/locale';
import { Button, Dialog } from '../components/ui';
import { Sheet } from '../components/ui/Sheet';
import { RecordForm } from '../components/RecordForm';
import { cn } from '../lib/utils';

interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  location: string | null;
  isAllDay: boolean;
  organizer: { id: string; firstName: string; lastName: string; role: string };
  attendees?: { id: string; user?: { firstName: string; lastName: string } | null; contactId?: string | null }[];
}

const EVENT_COLORS = [
  'bg-indigo-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-violet-500', 'bg-teal-500', 'bg-orange-500',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatTime(date: Date) {
  return formatTimeIST(date);
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function EventPill({ event, color, onClick }: { event: CalEvent; color: string; onClick: () => void }) {
  const initials = `${event.organizer.firstName[0] ?? ''}${event.organizer.lastName[0] ?? ''}`.toUpperCase();
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={cn('text-left text-white text-xs rounded-md px-1.5 py-0.5 truncate w-full', color, 'hover:opacity-90 transition-opacity')}
    >
      <span className="opacity-90 mr-1">[{initials}]</span>
      {!event.isAllDay && <span className="opacity-80 mr-1">{formatTime(new Date(event.startAt))}</span>}
      {event.title}
    </button>
  );
}

function EventDetailPanel({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  return (
    <Sheet open onClose={onClose} title={event.title}>
      <div className="px-6 py-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
            <CalIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{event.title}</h3>
            <p className="text-sm text-muted-foreground">
              {new Date(event.startAt).toLocaleDateString(APP_LOCALE, { weekday: 'long', month: 'long', day: 'numeric', timeZone: APP_TIMEZONE })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Start</p>
            <p className="font-medium text-foreground">{formatTime(new Date(event.startAt))}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> End</p>
            <p className="font-medium text-foreground">{formatTime(new Date(event.endAt))}</p>
          </div>
          {event.location && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
              <p className="font-medium text-foreground">{event.location}</p>
            </div>
          )}
        </div>
        {event.description && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
            <p className="text-sm text-foreground bg-muted/30 rounded-xl p-3">{event.description}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Organizer</p>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
              {event.organizer.firstName[0]}{event.organizer.lastName[0]}
            </div>
            <span className="text-sm text-foreground">{event.organizer.firstName} {event.organizer.lastName}</span>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

export function CalendarPage() {
  const user = useAuthStore(s => s.user);
  const queryClient = useQueryClient();
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  // Compute date range for query
  const rangeStart = new Date(currentDate);
  const rangeEnd = new Date(currentDate);
  if (view === 'month') {
    rangeStart.setDate(1);
    rangeEnd.setMonth(rangeEnd.getMonth() + 1, 0);
  } else if (view === 'week') {
    const day = currentDate.getDay();
    rangeStart.setDate(currentDate.getDate() - day);
    rangeEnd.setDate(currentDate.getDate() + (6 - day));
  } else {
    // day view
  }

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-events', view, currentDate.toISOString().slice(0, 7)],
    queryFn: () => {
      const p = new URLSearchParams({
        start: rangeStart.toISOString(),
        end: rangeEnd.toISOString(),
      });
      return apiFetch<{ data: CalEvent[] }>(`/calendar/events?${p}`);
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch('/calendar/events', {
        method: 'POST',
        body: JSON.stringify({
          title: body.title,
          description: body.description || undefined,
          startAt: body.startAt,
          endAt: body.endAt || new Date(new Date(body.startAt).getTime() + 60 * 60 * 1000).toISOString(),
          location: body.location || undefined,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setCreateOpen(false);
    },
  });

  const events = data?.data ?? [];
  const visibleOrganizers = Array.from(
    new Map(events.map((e) => [e.organizer.id, e.organizer])).values()
  );
  const organizerColor = (organizerId: string) => {
    const idx = visibleOrganizers.findIndex((o) => o.id === organizerId);
    return EVENT_COLORS[(idx < 0 ? 0 : idx) % EVENT_COLORS.length];
  };

  function navigate(dir: 1 | -1) {
    const d = new Date(currentDate);
    if (view === 'month') d.setMonth(d.getMonth() + dir);
    else if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function eventsForDay(date: Date) {
    return events.filter(e => sameDay(new Date(e.startAt), date));
  }

  // ---- MONTH VIEW ----
  function renderMonthView() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let i = 1; i <= daysInMonth; i++) cells.push(new Date(year, month, i));

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b border-border/40">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-1">
          {cells.map((date, i) => {
            const dayEvents = date ? eventsForDay(date) : [];
            const isToday = date ? sameDay(date, today) : false;
            return (
              <div
                key={i}
                className={cn('min-h-[100px] border-b border-r border-border/30 p-1.5 cursor-pointer hover:bg-muted/20 transition-colors',
                  !date && 'bg-muted/10',
                )}
                onClick={() => { if (date) { setCreateDate(date); setCreateOpen(true); } }}
              >
                {date && (
                  <>
                    <span className={cn('inline-flex w-6 h-6 items-center justify-center rounded-full text-sm mb-1',
                      isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'
                    )}>
                      {date.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev, j) => (
                        <EventPill key={ev.id} event={ev} color={organizerColor(ev.organizer.id)} onClick={() => setSelectedEvent(ev)} />
                      ))}
                      {dayEvents.length > 3 && (
                        <p className="text-xs text-muted-foreground pl-1">+{dayEvents.length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- WEEK VIEW ----
  function renderWeekView() {
    const weekStart = new Date(currentDate);
    weekStart.setDate(currentDate.getDate() - currentDate.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    });
    const today = new Date();

    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8 border-b border-border/40 sticky top-0 bg-card z-10">
          <div className="py-2 text-center text-xs text-muted-foreground"></div>
          {days.map(d => (
            <div key={d.toISOString()} className="py-2 text-center">
              <p className="text-xs text-muted-foreground">{DAYS[d.getDay()]}</p>
              <span className={cn('inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-medium mt-0.5',
                sameDay(d, today) ? 'bg-primary text-primary-foreground' : 'text-foreground'
              )}>{d.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-8">
          <div>
            {HOURS.map(h => (
              <div key={h} className="h-14 border-b border-border/20 pr-2 text-right">
                <span className="text-xs text-muted-foreground">{h === 0 ? '' : `${h}:00`}</span>
              </div>
            ))}
          </div>
          {days.map(day => (
            <div key={day.toISOString()} className="border-l border-border/30">
              {HOURS.map(h => {
                const slotEvents = events.filter(e => {
                  const s = new Date(e.startAt);
                  return sameDay(s, day) && s.getHours() === h;
                });
                return (
                  <div
                    key={h}
                    className="h-14 border-b border-border/20 relative px-0.5 hover:bg-muted/20 cursor-pointer"
                    onClick={() => {
                      const d = new Date(day);
                      d.setHours(h);
                      setCreateDate(d);
                      setCreateOpen(true);
                    }}
                  >
                    {slotEvents.map((ev, j) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                        className={cn('absolute inset-x-0.5 rounded text-white text-[10px] px-1 py-0.5 truncate', organizerColor(ev.organizer.id))}
                        style={{ top: `${2 + j * 16}px` }}
                        title={`${ev.organizer.firstName} ${ev.organizer.lastName} • ${ev.title}`}
                      >
                        {ev.organizer.firstName[0]}{ev.organizer.lastName[0]} • {ev.title}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---- DAY VIEW ----
  function renderDayView() {
    const today = new Date();
    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 border-b border-border/40 sticky top-0 bg-card z-10">
          <div className="py-2 px-4 text-xs text-muted-foreground">Time</div>
          <div className="py-2 px-4">
            <p className="text-sm font-semibold text-foreground">
              {currentDate.toLocaleDateString(APP_LOCALE, { weekday: 'long', month: 'long', day: 'numeric', timeZone: APP_TIMEZONE })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2">
          {HOURS.map(h => {
            const slotEvents = events.filter(e => {
              const s = new Date(e.startAt);
              return sameDay(s, currentDate) && s.getHours() === h;
            });
            return (
              <div key={h} className="contents">
                <div className="h-16 border-b border-border/20 pr-4 text-right pt-1">
                  <span className="text-xs text-muted-foreground">{`${h.toString().padStart(2, '0')}:00`}</span>
                </div>
                <div
                  className="h-16 border-b border-l border-border/20 px-2 pt-1 hover:bg-muted/20 cursor-pointer"
                  onClick={() => {
                    const d = new Date(currentDate);
                    d.setHours(h);
                    setCreateDate(d);
                    setCreateOpen(true);
                  }}
                >
                  {slotEvents.map((ev, j) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={e => { e.stopPropagation(); setSelectedEvent(ev); }}
                      className={cn('block w-full text-left rounded text-white text-xs px-2 py-1 mb-0.5 truncate', organizerColor(ev.organizer.id))}
                    >
                      {ev.organizer.firstName[0]}{ev.organizer.lastName[0]} · {formatTime(new Date(ev.startAt))} — {ev.title}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const viewTitle = view === 'month'
    ? currentDate.toLocaleDateString(APP_LOCALE, { month: 'long', year: 'numeric', timeZone: APP_TIMEZONE })
    : view === 'week'
      ? `Week of ${new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getDay()).toLocaleDateString(APP_LOCALE, { month: 'short', day: 'numeric', timeZone: APP_TIMEZONE })}`
      : currentDate.toLocaleDateString(APP_LOCALE, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: APP_TIMEZONE });

  const defaultStart = createDate
    ? `${createDate.getFullYear()}-${String(createDate.getMonth() + 1).padStart(2, '0')}-${String(createDate.getDate()).padStart(2, '0')}T${String(createDate.getHours()).padStart(2, '0')}:00`
    : '';

  return (
    <div className="flex-1 flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/40 bg-background/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-lg font-bold text-foreground min-w-[200px]">{viewTitle}</h2>
          <button type="button" onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
          <button type="button" onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs rounded-lg bg-muted text-muted-foreground hover:bg-muted/80">Today</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border/60 rounded-xl overflow-hidden">
            {(['month', 'week', 'day'] as const).map(v => (
              <button key={v} type="button" onClick={() => setView(v)}
                className={cn('px-3 py-1.5 text-xs font-medium transition-colors capitalize', view === v ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}>
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => { setCreateDate(new Date()); setCreateOpen(true); }}>
            <Plus className="w-4 h-4 mr-1.5" /> Event
          </Button>
        </div>
      </div>
      {visibleOrganizers.length > 1 && (
        <div className="px-6 py-2 border-b border-border/30 bg-background/70 flex flex-wrap gap-2">
          {visibleOrganizers.map((o) => (
            <span key={o.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground rounded-full border border-border/60 px-2 py-1">
              <span className={cn('w-2 h-2 rounded-full', organizerColor(o.id))} />
              {o.firstName} {o.lastName}
            </span>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          {view === 'month' && renderMonthView()}
          {view === 'week' && renderWeekView()}
          {view === 'day' && renderDayView()}
        </div>
      )}

      {selectedEvent && <EventDetailPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

      <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setCreateDate(null); }} title="New Event">
        <RecordForm
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'startAt', label: 'Start Date & Time', type: 'datetime-local', required: true },
            { name: 'endAt', label: 'End Date & Time', type: 'datetime-local' },
            { name: 'location', label: 'Location' },
            { name: 'description', label: 'Description', type: 'textarea' },
          ]}
          defaultValues={{ startAt: defaultStart } as Record<string, unknown>}
          loading={createMutation.isPending}
          submitLabel="Create Event"
          onSubmit={values => createMutation.mutate(values as unknown as Record<string, string>)}
        />
      </Dialog>
    </div>
  );
}
