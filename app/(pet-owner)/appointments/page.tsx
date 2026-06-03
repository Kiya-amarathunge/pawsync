'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import DashboardLayout from '@/components/layout/DashboardLayout';

const statusColors: Record<string, string> = {
  pending: 'badge-orange', confirmed: 'badge-blue',
  completed: 'badge-green', cancelled: 'badge-red', rescheduled: 'badge-gray',
};

const serviceIcons: Record<string, string> = {
  veterinary: '🏥', grooming: '✂️', training: '🎓', boarding: '🏠', telemedicine: '💻',
};

export default function AppointmentsPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Booking state
  const [bookingStep, setBookingStep] = useState(1);
  const [providers, setProviders] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [booking, setBooking] = useState({
    serviceType: '', providerId: '', petId: '',
    date: '', time: '', notes: '', price: 0,
  });

  const fetchAppointments = async () => {
    if (!token) return;
    const res = await fetch('/api/appointments', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAppointments(data.appointments || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [token]);

  const fetchProviders = async (serviceType: string) => {
    const res = await fetch(`/api/providers?serviceType=${serviceType}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setProviders(data.providers || []);
  };

  const fetchPets = async () => {
    const res = await fetch('/api/pets', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPets(data.pets || []);
  };

  const fetchSlots = async (providerId: string, date: string) => {
    const res = await fetch(`/api/providers/${providerId}/availability?date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setAvailableSlots(data.availableSlots || []);
  };

  const handleBookingStepOne = async (serviceType: string) => {
    setBooking(prev => ({ ...prev, serviceType }));
    await fetchProviders(serviceType);
    await fetchPets();
    setBookingStep(2);
  };

  const handleSelectProvider = (provider: any) => {
    setBooking(prev => ({ ...prev, providerId: provider.providerId?._id || provider.providerId }));
    setBookingStep(3);
  };

  const handleSelectDate = async (date: string) => {
    setBooking(prev => ({ ...prev, date }));
    await fetchSlots(booking.providerId, date);
  };

  const handleConfirmBooking = async () => {
    if (!booking.petId || !booking.time) {
      showToast('Please select a pet and time slot', 'error');
      return;
    }
    setIsBooking(true);
    try {
      const dateTime = new Date(`${booking.date}T${booking.time}:00`);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          petId: booking.petId,
          providerId: booking.providerId,
          serviceType: booking.serviceType,
          dateTime: dateTime.toISOString(),
          notes: booking.notes,
          price: booking.price || 0,
          duration: 60,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Appointment booked successfully!', 'success');
      setShowBookingModal(false);
      setBookingStep(1);
      setBooking({ serviceType: '', providerId: '', petId: '', date: '', time: '', notes: '', price: 0 });
      fetchAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this appointment? This must be done at least 24 hours in advance.')) return;
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast('Appointment cancelled', 'success');
      fetchAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status));
  const past = appointments.filter(a => ['completed', 'cancelled', 'rescheduled'].includes(a.status));
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  const serviceTypes = [
    { type: 'veterinary', icon: '🏥', label: 'Veterinary', desc: 'In-person vet visit' },
    { type: 'telemedicine', icon: '💻', label: 'Telemedicine', desc: 'Video consultation' },
    { type: 'grooming', icon: '✂️', label: 'Grooming', desc: 'Pet grooming session' },
    { type: 'training', icon: '🎓', label: 'Training', desc: 'Professional training' },
    { type: 'boarding', icon: '🏠', label: 'Boarding', desc: 'Pet boarding/sitting' },
  ];

  // Tomorrow's date as minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <DashboardLayout>
      <div className="animate-fadeIn">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Appointments</h1>
            <p className="page-subtitle">Manage and book your pet care appointments</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowBookingModal(true); setBookingStep(1); }}>
            + Book Appointment
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content', marginBottom: 24 }}>
          {[['upcoming', upcoming.length], ['past', past.length]].map(([tab, count]) => (
            <button key={tab} onClick={() => setActiveTab(tab as string)} style={{
              padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: activeTab === tab ? 'white' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer', fontSize: 14,
              boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s ease', textTransform: 'capitalize',
            }}>
              {tab} ({count})
            </button>
          ))}
        </div>

        {/* Appointments list */}
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No {activeTab} appointments</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              {activeTab === 'upcoming' ? 'Book an appointment to get started' : 'Your appointment history will appear here'}
            </p>
            {activeTab === 'upcoming' && (
              <button className="btn btn-primary" onClick={() => setShowBookingModal(true)}>Book Now</button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayed.map(appt => (
              <div key={appt._id} className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: 'var(--radius-md)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                  {serviceIcons[appt.serviceType] || '🐾'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, textTransform: 'capitalize' }}>{appt.serviceType}</h3>
                    <span className={`badge ${statusColors[appt.status] || 'badge-gray'}`}>{appt.status}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    📅 {new Date(appt.dateTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(appt.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {appt.notes && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📝 {appt.notes}</p>}
                </div>
                {appt.price > 0 && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>Rs. {appt.price.toLocaleString()}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{appt.duration} min</p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {appt.serviceType === 'telemedicine' && appt.status === 'confirmed' && (
                    <a href={`/consultations/${appt._id}`} className="btn btn-primary btn-sm">Join Call 💻</a>
                  )}
                  {['pending', 'confirmed'].includes(appt.status) && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleCancel(appt._id)}>Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="modal-overlay" onClick={() => { setShowBookingModal(false); setBookingStep(1); }}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}>

              {/* Step indicator */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 24 }}>
                {['Service', 'Provider', 'Date & Time', 'Confirm'].map((label, i) => (
                  <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i + 1 <= bookingStep ? 'var(--primary)' : 'var(--border)',
                      color: i + 1 <= bookingStep ? 'white' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>{i + 1 < bookingStep ? '✓' : i + 1}</div>
                    <span style={{ fontSize: 10, color: i + 1 <= bookingStep ? 'var(--primary)' : 'var(--text-muted)', textAlign: 'center' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Step 1 — Service type */}
              {bookingStep === 1 && (
                <div>
                  <h2 className="modal-title">What service do you need?</h2>
                  <p className="modal-subtitle">Select the type of care for your pet</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {serviceTypes.map(svc => (
                      <div
                        key={svc.type}
                        onClick={() => handleBookingStepOne(svc.type)}
                        style={{
                          padding: '16px', borderRadius: 'var(--radius-md)',
                          border: '1.5px solid var(--border)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 14,
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                      >
                        <span style={{ fontSize: 28 }}>{svc.icon}</span>
                        <div>
                          <p style={{ fontWeight: 600 }}>{svc.label}</p>
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{svc.desc}</p>
                        </div>
                        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2 — Select provider */}
              {bookingStep === 2 && (
                <div>
                  <h2 className="modal-title">Choose a Provider</h2>
                  <p className="modal-subtitle">Select a {booking.serviceType} provider</p>
                  {providers.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">🔍</div>
                      <p className="empty-state-title">No providers available</p>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No {booking.serviceType} providers are registered yet</p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {providers.map(provider => (
                        <div
                          key={provider._id}
                          onClick={() => handleSelectProvider(provider)}
                          style={{
                            padding: '14px', borderRadius: 'var(--radius-md)',
                            border: '1.5px solid var(--border)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 12,
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                        >
                          <div className="avatar">{provider.businessName?.[0] || '?'}</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 600, fontSize: 14 }}>{provider.businessName}</p>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{provider.providerId?.name}</p>
                            <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                              {'★'.repeat(Math.round(provider.averageRating || 0)).split('').map((s, i) => (
                                <span key={i} style={{ color: '#fbbf24', fontSize: 11 }}>★</span>
                              ))}
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({provider.reviewCount || 0})</span>
                            </div>
                          </div>
                          <span style={{ color: 'var(--text-muted)' }}>→</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button className="btn btn-outline btn-full" style={{ marginTop: 16 }} onClick={() => setBookingStep(1)}>← Back</button>
                </div>
              )}

              {/* Step 3 — Date, time, pet */}
              {bookingStep === 3 && (
                <div>
                  <h2 className="modal-title">Pick a Date & Time</h2>
                  <p className="modal-subtitle">Select when you'd like the appointment</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="input-group">
                      <label className="input-label">Select Pet</label>
                      <select className="input" value={booking.petId} onChange={e => setBooking(prev => ({ ...prev, petId: e.target.value }))}>
                        <option value="">Choose a pet</option>
                        {pets.map(pet => <option key={pet._id} value={pet._id}>{pet.name} ({pet.species})</option>)}
                      </select>
                    </div>
                    <div className="input-group">
                      <label className="input-label">Date</label>
                      <input className="input" type="date" min={minDate} value={booking.date} onChange={e => handleSelectDate(e.target.value)} />
                    </div>
                    {booking.date && (
                      <div className="input-group">
                        <label className="input-label">Available Time Slots</label>
                        {availableSlots.length === 0 ? (
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                            No slots available on this date. Try another day.
                          </p>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {availableSlots.map((slot: any) => (
                              <div
                                key={slot.time}
                                onClick={() => setBooking(prev => ({ ...prev, time: slot.time }))}
                                style={{
                                  padding: '8px 16px', borderRadius: 'var(--radius-md)',
                                  border: `1.5px solid ${booking.time === slot.time ? 'var(--primary)' : 'var(--border)'}`,
                                  background: booking.time === slot.time ? 'var(--primary-light)' : 'white',
                                  color: booking.time === slot.time ? 'var(--primary)' : 'var(--text-secondary)',
                                  cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {slot.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="input-group">
                      <label className="input-label">Notes (optional)</label>
                      <textarea
                        className="input" rows={3}
                        placeholder="Any special requirements or information for the provider..."
                        value={booking.notes}
                        onChange={e => setBooking(prev => ({ ...prev, notes: e.target.value }))}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                    <button className="btn btn-outline" onClick={() => setBookingStep(2)}>← Back</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => booking.petId && booking.date && booking.time && setBookingStep(4)} disabled={!booking.petId || !booking.date || !booking.time}>
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 — Confirm */}
              {bookingStep === 4 && (
                <div>
                  <h2 className="modal-title">Confirm Booking</h2>
                  <p className="modal-subtitle">Review your appointment details</p>
                  <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20 }}>
                    {[
                      ['Service', booking.serviceType, serviceIcons[booking.serviceType]],
                      ['Pet', pets.find(p => p._id === booking.petId)?.name || '—', '🐾'],
                      ['Date', new Date(`${booking.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), '📅'],
                      ['Time', availableSlots.find(s => s.time === booking.time)?.label || booking.time, '⏰'],
                      ...(booking.notes ? [['Notes', booking.notes, '📝']] : []),
                    ].map(([label, value, icon], idx, arr) => (
                      <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>{icon} {label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', textAlign: 'right', maxWidth: '60%' }}>{value as string}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline" onClick={() => setBookingStep(3)}>← Back</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirmBooking} disabled={isBooking}>
                      {isBooking ? <><div className="spinner" />Booking...</> : 'Confirm Booking ✓'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}