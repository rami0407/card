import { useState, useEffect } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentPortal } from './components/StudentPortal';
import { 
  Settings, 
  Sparkles,
  Layers,
  Lock,
  User,
  Globe,
  AlertTriangle,
  X
} from 'lucide-react';
import type { Topic, Teacher } from './services/storage';
import { getTopicById, getTopicByCode, verifyTeacher } from './services/storage';
import { t, type LangType } from './services/i18n';

type UserRole = 'none' | 'admin' | 'student';

function App() {
  console.log("digital_cards_app version: 1.0.1 - cache bust");
  const [role, setRole] = useState<UserRole>('none');
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);

  const [lang, setLang] = useState<LangType>(() => {
    return (localStorage.getItem('dc_lang') as LangType) || 'ar';
  });

  const handleLanguageChange = (newLang: LangType) => {
    setLang(newLang);
    localStorage.setItem('dc_lang', newLang);
  };

  const [studentName, setStudentName] = useState(() => {
    return localStorage.getItem('dc_student_name') || '';
  });
  const [enteredCode, setEnteredCode] = useState('');
  
  // URL and Lookup states
  const [urlActivityId, setUrlActivityId] = useState<string | null>(null);
  const [currentActivity, setCurrentActivity] = useState<Topic | null>(null);
  
  // UX states
  const [isLoading, setIsLoading] = useState(true);
  const [urlError, setUrlError] = useState<'error_link_invalid' | 'error_loading' | null>(null);
  const [validationError, setValidationError] = useState<'validation_name_required' | 'error_code_invalid' | 'validation_code_required' | 'error_code_not_found' | 'error_network' | null>(null);

  // Admin Login states
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState<'admin_login_error_text' | null>(null);

  // Parse URL on mount
  useEffect(() => {
    const parseUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const activityId = params.get('activity');

      if (activityId) {
        setUrlActivityId(activityId);
        try {
          const topic = await getTopicById(activityId);
          if (topic) {
            setCurrentActivity(topic);
          } else {
            setUrlError('error_link_invalid');
          }
        } catch (err) {
          console.error("فشل قراءة الفعالية من الرابط:", err);
          setUrlError('error_loading');
        }
      }
      setIsLoading(false);
    };

    parseUrl();
  }, []);

  const handleJoinActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!studentName.trim()) {
      setValidationError('validation_name_required');
      return;
    }

    // Save student name locally for next visits
    localStorage.setItem('dc_student_name', studentName.trim());

    if (urlActivityId && currentActivity) {
      // Case 1: Accessed via direct URL activity link
      if (currentActivity.isPrivate) {
        if (enteredCode.trim().toLowerCase() !== currentActivity.accessCode?.trim().toLowerCase()) {
          setValidationError('error_code_invalid');
          return;
        }
      }
      setRole('student');
    } else {
      // Case 2: Accessed landing page directly (Requires code lookup)
      if (!enteredCode.trim()) {
        setValidationError('validation_code_required');
        return;
      }

      setIsLoading(true);
      try {
        const foundActivity = await getTopicByCode(enteredCode);
        if (foundActivity) {
          setCurrentActivity(foundActivity);
          setRole('student');
        } else {
          setValidationError('error_code_not_found');
        }
      } catch (err) {
        console.error("خطأ أثناء البحث عن كود الفعالية:", err);
        setValidationError('error_network');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError(null);

    const u = adminUsername.trim().toLowerCase();
    const p = adminPassword.trim();

    try {
      const verified = await verifyTeacher(u, p);
      if (verified) {
        setRole('admin');
        setCurrentTeacher(verified);
        setShowAdminLogin(false);
        setAdminUsername('');
        setAdminPassword('');
      } else {
        setAdminLoginError('admin_login_error_text');
      }
    } catch (err) {
      console.error("Login verification failed:", err);
      setAdminLoginError('admin_login_error_text');
    }
  };

  const handleBackToLanding = () => {
    setRole('none');
    setCurrentTeacher(null);
    // Keep name, clear the code for security
    setEnteredCode('');
    setValidationError(null);
  };

  if (role === 'admin') {
    return <AdminDashboard onBackToRoles={handleBackToLanding} lang={lang} currentTeacher={currentTeacher} />;
  }

  if (role === 'student') {
    return (
      <StudentPortal 
        onBackToRoles={handleBackToLanding}
        initialActivity={currentActivity}
        initialStudentName={studentName}
        lang={lang}
      />
    );
  }

  return (
    <div className="onboarding-container" dir="rtl">
      {/* Dynamic Background Lights */}
      <div className="glow-circle glow-1"></div>
      <div className="glow-circle glow-2"></div>

      {/* Language Switcher (Floating) */}
      <button 
        className="btn-language-switcher" 
        onClick={() => handleLanguageChange(lang === 'ar' ? 'he' : 'ar')}
        title={lang === 'ar' ? 'עברית' : 'العربية'}
      >
        <Globe size={18} />
        <span>{lang === 'ar' ? 'עברית' : 'العربية'}</span>
      </button>

      {/* Teacher Dashboard Trigger (Floating) */}
      <button 
        className="btn-teacher-dashboard-trigger" 
        onClick={() => setShowAdminLogin(true)}
        title={t('admin_login_title', lang)}
      >
        <Settings size={18} />
        <span>{t('teacher_btn', lang)}</span>
      </button>

      {/* Admin Login Modal Overlay */}
      {showAdminLogin && (
        <div className="canvas-modal-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 300 }}>
          <div className="login-card glass-panel animate-scale-up" style={{ position: 'relative', width: '90%', maxWidth: '400px', padding: '30px' }}>
            <button 
              type="button" 
              className="btn-close" 
              onClick={() => {
                setShowAdminLogin(false);
                setAdminUsername('');
                setAdminPassword('');
                setAdminLoginError(null);
              }}
              style={{ position: 'absolute', top: '15px', left: '15px' }}
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>

            <form onSubmit={handleAdminSubmit} className="student-login-form" style={{ marginTop: '15px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '8px' }}>{t('admin_login_title', lang)}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>{t('admin_login_desc', lang)}</p>

              <div className="form-group">
                <label htmlFor="admin-username-input">{t('username', lang)}</label>
                <input
                  id="admin-username-input"
                  type="text"
                  placeholder={t('username_placeholder', lang)}
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginTop: '15px' }}>
                <label htmlFor="admin-password-input">{t('password', lang)}</label>
                <input
                  id="admin-password-input"
                  type="password"
                  placeholder={t('password_placeholder', lang)}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                />
              </div>

              {adminLoginError && (
                <div className="validation-error-alert" style={{ marginTop: '15px' }}>
                  <AlertTriangle size={16} />
                  <span>{t(adminLoginError, lang)}</span>
                </div>
              )}

              <div className="form-actions mt-6" style={{ marginTop: '25px' }}>
                <button type="submit" className="btn-primary btn-large w-full">
                  <span>{t('login_btn', lang)}</span>
                  <Sparkles size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="onboarding-card glass-panel animate-scale-up">
        
        {/* Header Section */}
        <div className="logo-section">
          <div className="logo-badge glow-badge">
            <Layers size={36} className="logo-icon" />
          </div>
          <h1 className="main-title">{t('app_title', lang)}</h1>
          <p className="subtitle">{t('app_subtitle', lang)}</p>
        </div>

        {/* Loading Overlay */}
        {isLoading ? (
          <div className="landing-loading">
            <div className="spinner"></div>
            <span>{t('loading_activity', lang)}</span>
          </div>
        ) : urlError ? (
          /* Error State if URL Activity ID is invalid */
          <div className="landing-error-box animate-slide-in">
            <AlertTriangle size={32} className="icon-gold" />
            <p>{urlError ? t(urlError, lang) : ''}</p>
            <button 
              className="btn-secondary mt-4 w-full"
              onClick={() => {
                setUrlActivityId(null);
                setCurrentActivity(null);
                setUrlError(null);
              }}
            >
              {t('back_login_portal', lang)}
            </button>
          </div>
        ) : (
          /* Landing Form (Two Inputs in Center) */
          <form onSubmit={handleJoinActivity} className="landing-form-card animate-slide-in">
            
            {/* Header info about direct activity */}
            {currentActivity && (
              <div className="active-activity-banner">
                <span className="activity-label">{t('joining_activity_label', lang)}</span>
                <strong className="activity-name">{currentActivity.name}</strong>
                <p className="activity-desc">{currentActivity.description}</p>
              </div>
            )}

            {/* Input 1: Student Name */}
            <div className="form-group">
              <label htmlFor="student-name-field" className="input-label-with-icon">
                <User size={16} className="icon-purple" />
                <span>{t('student_name', lang)}</span>
              </label>
              <input
                id="student-name-field"
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={t('student_name_placeholder', lang)}
                maxLength={25}
                required
                className="input-premium"
              />
            </div>

            {/* Input 2: Access Code (Conditional / Mandatory) */}
            {(!currentActivity || (currentActivity && currentActivity.isPrivate)) ? (
              <div className="form-group">
                <label htmlFor="access-code-field" className="input-label-with-icon">
                  <Lock size={16} className="icon-purple" />
                  <span>{t('access_code', lang)}</span>
                </label>
                <input
                  id="access-code-field"
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder={
                    currentActivity 
                      ? t('access_code_placeholder_direct', lang)
                      : t('access_code_placeholder_general', lang)
                  }
                  maxLength={10}
                  required
                  className="input-premium font-code"
                />
              </div>
            ) : (
              /* If public activity */
              <div className="public-activity-note">
                <Globe size={16} className="icon-gold" />
                <span>{t('public_activity_note', lang)}</span>
              </div>
            )}

            {/* Errors display */}
            {validationError && (
              <div className="validation-error-alert">
                <AlertTriangle size={16} />
                <span>{t(validationError, lang)}</span>
              </div>
            )}

            {/* Submit Action */}
            <button type="submit" className="btn-primary btn-large btn-landing-join w-full">
              <span>{t('join_btn', lang)}</span>
              <Sparkles size={18} />
            </button>
            
          </form>
        )}

        {/* Footer */}
        <div className="onboarding-footer mt-6">
          <p>{t('footer_text', lang)}</p>
        </div>

      </div>
    </div>
  );
}

export default App;
