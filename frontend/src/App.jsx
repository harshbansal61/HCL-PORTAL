import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const BASE_URL = 'http://localhost:5000/api';
const FILE_URL = 'http://localhost:5000';

const theme = {
  primary: '#4f46e5', primaryHover: '#4338ca', success: '#10b981', warning: '#f59e0b',
  danger: '#ef4444', bg: '#f8fafc', card: '#ffffff', textMain: '#0f172a',
  textMuted: '#64748b', border: '#e2e8f0', radius: '12px'
};

export default function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('hcl_user')) || null);
  const [token, setToken] = useState(localStorage.getItem('hcl_token') || null);

  const login = (userData, jwt) => {
    setUser(userData); setToken(jwt);
    localStorage.setItem('hcl_user', JSON.stringify(userData));
    localStorage.setItem('hcl_token', jwt);
  };
  const logout = () => { localStorage.clear(); setUser(null); setToken(null); };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', background: theme.bg, minHeight: '100vh', color: theme.textMain }}>
      <BrowserRouter>
        <nav style={{ background: '#1e293b', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: theme.primary, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>H</div>
            <h2 style={{ margin: 0, color: '#ffffff', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              HCLTech <span style={{ color: '#818cf8', fontWeight: 400 }}>TalentOS</span>
            </h2>
          </div>
          {user && (
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              <span style={{ color: '#cbd5e1', fontSize: '14px' }}>Logged in as: <strong style={{ color: '#ffffff' }}>{user.fullName}</strong> ({user.role})</span>
              <button onClick={logout} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer' }}>Logout</button>
            </div>
          )}
        </nav>
        <div style={{ maxWidth: '1280px', margin: '40px auto', padding: '0 24px' }}>
          <Routes>
            <Route path="/" element={!user ? <Auth login={login} /> : <Navigate to={`/${user.role.toLowerCase()}`} />} />
            <Route path="/candidate" element={user?.role === 'Candidate' ? <Candidate token={token} /> : <Navigate to="/" />} />
            <Route path="/recruiter" element={user?.role === 'Recruiter' ? <Recruiter token={token} /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </div>
  );
}

function Auth({ login }) {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', role: 'Candidate', fullName: '' });
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    const res = await fetch(BASE_URL + (isLogin ? '/auth/login' : '/auth/register'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) {
      if (isLogin) { login(data.user, data.token); navigate(`/${data.user.role.toLowerCase()}`); } 
      else { alert('Registered!'); setIsLogin(true); }
    } else alert(data.error);
  };

  return (
    <div style={{ maxWidth: '420px', margin: '60px auto', border: `1px solid ${theme.border}`, padding: '40px', borderRadius: theme.radius, background: theme.card }}>
      <h3 style={{ marginTop: 0, marginBottom: '24px', textAlign: 'center', fontSize: '24px' }}>{isLogin ? 'Welcome back' : 'Create profile'}</h3>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {!isLogin && <input type="text" placeholder="Full Name" required onChange={e => setForm({...form, fullName: e.target.value})} style={inputStyle} />}
        <input type="email" placeholder="Corporate Email" required onChange={e => setForm({...form, email: e.target.value})} style={inputStyle} />
        <input type="password" placeholder="Password" required onChange={e => setForm({...form, password: e.target.value})} style={inputStyle} />
        {!isLogin && (
          <select onChange={e => setForm({...form, role: e.target.value})} style={inputStyle}>
            <option value="Candidate">Candidate</option><option value="Recruiter">Recruiter</option>
          </select>
        )}
        <button type="submit" style={{ background: theme.primary, color: 'white', padding: '12px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginTop: '10px' }}>
          {isLogin ? 'Sign In' : 'Register'}
        </button>
      </form>
      <p onClick={() => setIsLogin(!isLogin)} style={{ color: theme.primary, cursor: 'pointer', textAlign: 'center', marginTop: '24px', fontSize: '14px' }}>
        {isLogin ? "Need an account? Sign up" : 'Have an account? Sign in'}
      </p>
    </div>
  );
}

function Candidate({ token }) {
  const [data, setData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetch(BASE_URL + '/me', { headers: { 'Authorization': token } }).then(r => r.json()).then(setData);
    fetch(BASE_URL + '/jobs', { headers: { 'Authorization': token } }).then(r => r.json()).then(setJobs);
  }, [token]);

  const applyForJob = async (jobId) => {
    if (!file) return alert("Please select a resume (PDF/DOCX)!");
    const formData = new FormData(); formData.append('resume', file);
    await fetch(`${BASE_URL}/apply/${jobId}`, { method: 'POST', headers: { 'Authorization': token }, body: formData });
    alert('Applied Successfully!'); window.location.reload();
  };

  if (!data) return <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>;
  const badgeColor = data.status === 'Hired' ? theme.success : data.status === 'Shortlisted' ? theme.warning : theme.textMuted;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ background: theme.card, padding: '32px', borderRadius: theme.radius, border: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '22px' }}>Application Lifecycle</h3>
            <span style={{ background: `${badgeColor}15`, color: badgeColor, padding: '6px 14px', borderRadius: '20px', fontWeight: '600' }}>● {data.status}</span>
          </div>
          {data.employeeDetails?.employeeId && (
            <div style={{ background: '#ecfdf5', padding: '24px', borderRadius: '8px', border: '1px solid #10b981', marginTop: '24px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#065f46' }}>🎉 Onboarding Package Generated (Check Email!)</h4>
              <p style={{ margin: '4px 0' }}><strong>Enterprise ID:</strong> {data.employeeDetails.employeeId}</p>
              <p style={{ margin: '4px 0' }}><strong>Corporate Email:</strong> {data.employeeDetails.corporateEmail}</p>
            </div>
          )}
        </div>

        <div style={{ background: theme.card, padding: '32px', borderRadius: theme.radius, border: `1px solid ${theme.border}` }}>
          {data.appliedJob ? (
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: theme.textMuted }}>ACTIVE POSITION</h4>
              <h2 style={{ margin: '0 0 10px 0' }}>{data.appliedJob.title}</h2>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', color: '#475569' }}>📍 {data.appliedJob.location}</span>
                <span style={{ fontSize: '13px', background: '#dcfce7', padding: '4px 10px', borderRadius: '6px', color: '#166534' }}>💰 {data.appliedJob.salary}</span>
              </div>
              <p style={{ color: theme.textMuted, lineHeight: '1.6' }}>{data.appliedJob.description}</p>
              {data.resumeUrl && <a href={`${FILE_URL}${data.resumeUrl}`} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '16px', color: theme.primary, textDecoration: 'none', fontWeight: '500' }}>📄 View Uploaded Resume</a>}
            </div>
          ) : (
            <div>
              <h3 style={{ margin: '0 0 8px 0' }}>Available Executive Tracks</h3>
              <input type="file" onChange={(e) => setFile(e.target.files[0])} style={{ marginBottom: '24px', display: 'block' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {jobs.map(j => (
                  <div key={j._id} style={{ border: `1px solid ${theme.border}`, padding: '20px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: '0 0 6px 0' }}>{j.title}</h4>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>📍 {j.location}</span>
                        <span style={{ fontSize: '12px', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>💰 {j.salary}</span>
                      </div>
                      <p style={{ margin: 0, color: theme.textMuted, fontSize: '14px' }}>{j.description}</p>
                    </div>
                    <button onClick={() => applyForJob(j._id)} style={{ background: theme.primary, color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', alignSelf: 'center' }}>Apply</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Chat token={token} userId={data._id} messages={data.messages} />
    </div>
  );
}

function Recruiter({ token }) {
  const [cands, setCands] = useState([]);
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', location: '', salary: '' });
  const [activeCand, setActiveCand] = useState(null);
  const [tab, setTab] = useState('pipeline'); // Tabs: pipeline vs analytics

  useEffect(() => {
    const fetchData = () => {
      fetch(BASE_URL + '/candidates', { headers: { 'Authorization': token } }).then(r => r.json()).then(setCands);
      fetch(BASE_URL + '/analytics', { headers: { 'Authorization': token } }).then(r => r.json()).then(setStats);
    };
    fetchData(); const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [token]);

  const createJob = async (e) => {
    e.preventDefault();
    await fetch(BASE_URL + '/jobs', { method: 'POST', headers: { 'Authorization': token, 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    alert("Job Posted!"); setForm({ title: '', description: '', location: '', salary: '' });
  };

  const updateStatus = async (id, status) => {
    await fetch(`${BASE_URL}/recruiter/status/${id}`, { method: 'PATCH', headers: { 'Authorization': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if(status === 'Hired') alert('Hired! Automated Welcome Email has been triggered.');
  };

  const liveCandidate = cands.find(c => c._id === activeCand?._id) || activeCand;
  
  // Data for the Recharts Bar Chart
  const chartData = stats ? [
    { name: 'Pending', count: stats.pending, fill: '#64748b' },
    { name: 'Shortlisted', count: stats.shortlisted, fill: '#f59e0b' },
    { name: 'Hired', count: stats.hired, fill: '#10b981' }
  ] : [];

  return (
    <div>
      {/* Top Controls */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '24px' }}>
        <button onClick={() => setTab('pipeline')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: tab === 'pipeline' ? theme.primary : '#e2e8f0', color: tab === 'pipeline' ? 'white' : '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>Manage Pipeline</button>
        <button onClick={() => setTab('analytics')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: tab === 'analytics' ? theme.primary : '#e2e8f0', color: tab === 'analytics' ? 'white' : '#0f172a', fontWeight: 'bold', cursor: 'pointer' }}>Data Analytics</button>
      </div>

      {tab === 'analytics' && stats && (
        <div style={{ background: theme.card, padding: '32px', borderRadius: theme.radius, border: `1px solid ${theme.border}` }}>
          <h2 style={{ marginTop: 0 }}>Recruitment KPIs</h2>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
            <div style={{ flex: 1, padding: '20px', background: '#f8fafc', borderRadius: '8px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
              <h1 style={{ margin: 0, color: theme.primary }}>{stats.totalJobs}</h1><p style={{ margin: 0 }}>Active Jobs</p>
            </div>
            <div style={{ flex: 1, padding: '20px', background: '#f8fafc', borderRadius: '8px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
              <h1 style={{ margin: 0, color: theme.textMain }}>{stats.total}</h1><p style={{ margin: 0 }}>Total Applicants</p>
            </div>
            <div style={{ flex: 1, padding: '20px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #10b981', textAlign: 'center' }}>
              <h1 style={{ margin: 0, color: '#065f46' }}>{stats.hired}</h1><p style={{ margin: 0, color: '#065f46' }}>Successfully Hired</p>
            </div>
          </div>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'pipeline' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', alignItems: 'start' }}>
          <div style={{ background: theme.card, padding: '24px', borderRadius: theme.radius, border: `1px solid ${theme.border}` }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Post Job</h3>
            <form onSubmit={createJob} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} style={inputStyle} required />
              <input placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} style={inputStyle} required />
              <input placeholder="Salary" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} style={inputStyle} required />
              <textarea placeholder="Description" rows="4" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{...inputStyle, resize: 'none'}} required />
              <button type="submit" style={{ background: theme.primary, color: 'white', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Publish Job</button>
            </form>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: activeCand ? '1fr 380px' : '1fr', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {cands.map(c => {
                const badge = c.status === 'Hired' ? theme.success : c.status === 'Shortlisted' ? theme.warning : theme.textMuted;
                return (
                  <div key={c._id} style={{ background: theme.card, padding: '24px', borderRadius: theme.radius, border: `1px solid ${c._id === activeCand?._id ? theme.primary : theme.border}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0' }}>{c.fullName}</h4>
                        <p style={{ margin: 0, fontSize: '14px' }}>Applied for: {c.appliedJob?.title || 'None'}</p>
                      </div>
                      <span style={{ color: badge, fontWeight: 'bold' }}>{c.status}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${theme.border}` }}>
                      {c.resumeUrl ? <a href={`${FILE_URL}${c.resumeUrl}`} target="_blank" rel="noreferrer" style={{ color: theme.primary }}>📥 View Resume</a> : <span/>}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => updateStatus(c._id, 'Shortlisted')} style={{ background: theme.warning, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Shortlist</button>
                        <button onClick={() => updateStatus(c._id, 'Hired')} style={{ background: theme.success, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Hire</button>
                        <button onClick={() => setActiveCand(c)} style={{ background: theme.primary, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Chat</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {activeCand && liveCandidate && (
              <div style={{ position: 'sticky', top: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong>Chat with {liveCandidate.fullName}</strong>
                  <button onClick={() => setActiveCand(null)} style={{ color: theme.danger, border: 'none', background: 'none', cursor: 'pointer' }}>Close</button>
                </div>
                <Chat token={token} userId={liveCandidate._id} messages={liveCandidate.messages} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Chat({ token, userId, messages }) {
  const [text, setText] = useState('');
  const scrollRef = useRef(null);
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault(); 
    if (!text.trim()) return;
    await fetch(`${BASE_URL}/messages/${userId}`, { method: 'POST', headers: { 'Authorization': token, 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    setText('');
  };

  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: theme.radius, background: theme.card, height: '480px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
        {messages?.map((m, i) => {
          // FIX: Safely fallback to 'Unknown' if old database messages are missing a sender
          const senderName = m.sender || 'Unknown'; 
          const isCand = senderName === 'Candidate';
          
          return (
            <div key={i} style={{ alignSelf: isCand ? 'flex-start' : 'flex-end', maxWidth: '75%' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: theme.textMuted }}>
                {senderName.toUpperCase()}
              </span>
              <div style={{ background: isCand ? 'white' : theme.primary, color: isCand ? theme.textMain : 'white', padding: '10px 14px', borderRadius: '12px', border: isCand ? `1px solid ${theme.border}` : 'none' }}>
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>
      <form onSubmit={send} style={{ padding: '16px', borderTop: `1px solid ${theme.border}`, display: 'flex', gap: '10px', background: 'white' }}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." style={inputStyle} />
        <button type="submit" style={{ background: theme.primary, color: 'white', border: 'none', padding: '0 18px', borderRadius: '8px', cursor: 'pointer' }}>Send</button>
      </form>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px 14px', border: `1px solid ${theme.border}`, borderRadius: '8px', background: '#ffffff', color: '#0f172a', fontSize: '14px', outline: 'none', boxSizing: 'border-box' };